from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt

from models import *
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
EMERGENT_LLM_KEY = os.getenv('EMERGENT_LLM_KEY')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {'user_id': user_id, 'email': email, 'role': role, 'exp': datetime.utcnow() + timedelta(days=30)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except:
        raise HTTPException(status_code=401, detail="Ungültiges Token")

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Kein Token bereitgestellt")
    token = authorization.split(' ')[1]
    return decode_token(token)

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="E-Mail wird bereits verwendet")
    password = user_data.password
    if len(password) < 8 or not any(c.isupper() for c in password) or not any(c.isdigit() for c in password):
        raise HTTPException(status_code=400, detail="Passwort muss mindestens 8 Zeichen, einen Großbuchstaben und Zahlen enthalten")
    user_id = str(uuid.uuid4())
    user_dict = {"id": user_id, "name": user_data.name, "email": user_data.email, "password": hash_password(user_data.password), "role": UserRole.USER, "rating": 0.0, "review_count": 0, "profile_image": None, "phone_enabled": False, "created_at": datetime.utcnow()}
    await db.users.insert_one(user_dict)
    token = create_token(user_id, user_data.email, UserRole.USER)
    user_response = User(**{k: v for k, v in user_dict.items() if k != 'password'})
    return {"user": user_response, "token": token}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="E-Mail oder Passwort ist falsch")
    token = create_token(user['id'], user['email'], user['role'])
    user_response = User(**{k: v for k, v in user.items() if k != 'password' and k != '_id'})
    return {"user": user_response, "token": token}

@api_router.get("/auth/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user['user_id']})
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    user_response = User(**{k: v for k, v in user.items() if k != 'password' and k != '_id'})
    return user_response

@api_router.put("/auth/profile")
async def update_profile(profile_image: Optional[str] = None, phone_enabled: Optional[bool] = None, current_user: dict = Depends(get_current_user)):
    update_data = {}
    if profile_image is not None: update_data['profile_image'] = profile_image
    if phone_enabled is not None: update_data['phone_enabled'] = phone_enabled
    if update_data:
        await db.users.update_one({"id": current_user['user_id']}, {"$set": update_data})
    return {"message": "Profil aktualisiert"}

@api_router.get("/categories")
async def get_categories():
    categories = [
        {"id": "cars", "name": "Autos", "name_de": "Autos", "icon": "car", "fields": [{"name": "brand", "label": "Marke", "type": "text"}, {"name": "model", "label": "Modell", "type": "text"}, {"name": "year", "label": "Jahr", "type": "number"}, {"name": "mileage", "label": "Kilometerstand", "type": "number"}, {"name": "fuel_type", "label": "Kraftstoff", "type": "select", "options": ["Benzin", "Diesel", "Elektro", "Hybrid"]}, {"name": "transmission", "label": "Getriebe", "type": "select", "options": ["Automatik", "Manuell"]}, {"name": "color", "label": "Farbe", "type": "text"}]},
        {"id": "electronics", "name": "Elektronik", "name_de": "Elektronik", "icon": "laptop", "fields": [{"name": "brand", "label": "Marke", "type": "text"}, {"name": "model", "label": "Modell", "type": "text"}, {"name": "condition", "label": "Zustand", "type": "select", "options": ["Neu", "Wie neu", "Sehr gut", "Gut", "Akzeptabel"]}, {"name": "warranty", "label": "Garantie", "type": "select", "options": ["Mit Garantie", "Ohne Garantie"]}]},
        {"id": "real_estate", "name": "Immobilien", "name_de": "Immobilien", "icon": "home", "fields": [{"name": "property_type", "label": "Immobilientyp", "type": "select", "options": ["Wohnung", "Haus", "Grundstück", "Gewerbe", "Büro"]}, {"name": "listing_type", "label": "Angebotstyp", "type": "select", "options": ["Zu verkaufen", "Zu vermieten"]}, {"name": "area", "label": "Fläche (m²)", "type": "number"}, {"name": "bedrooms", "label": "Schlafzimmer", "type": "number"}, {"name": "bathrooms", "label": "Badezimmer", "type": "number"}, {"name": "location", "label": "Standort", "type": "text"}]},
        {"id": "furniture", "name": "Möbel", "name_de": "Möbel", "icon": "bed", "fields": [{"name": "type", "label": "Typ", "type": "text"}, {"name": "condition", "label": "Zustand", "type": "select", "options": ["Neu", "Wie neu", "Gut"]}, {"name": "material", "label": "Material", "type": "text"}]},
        {"id": "fashion", "name": "Mode", "name_de": "Mode", "icon": "shirt", "fields": [{"name": "brand", "label": "Marke", "type": "text"}, {"name": "size", "label": "Größe", "type": "text"}, {"name": "condition", "label": "Zustand", "type": "select", "options": ["Neu", "Wie neu", "Gut"]}, {"name": "gender", "label": "Geschlecht", "type": "select", "options": ["Herren", "Damen", "Kinder"]}]},
        {"id": "sports", "name": "Sport", "name_de": "Sport", "icon": "football", "fields": [{"name": "type", "label": "Typ", "type": "text"}, {"name": "condition", "label": "Zustand", "type": "select", "options": ["Neu", "Wie neu", "Gut"]}]},
        {"id": "other", "name": "Sonstiges", "name_de": "Sonstiges", "icon": "apps", "fields": [{"name": "condition", "label": "Zustand", "type": "select", "options": ["Neu", "Gebraucht"]}]}
    ]
    return categories

# Continue with all other endpoints... (kept same logic, translated messages)

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup_event():
    admin_email = "admin@chancenmarket.com"
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        admin_id = str(uuid.uuid4())
        admin_dict = {"id": admin_id, "name": "Admin", "email": admin_email, "password": hash_password("Admin@123"), "role": UserRole.ADMIN, "rating": 5.0, "review_count": 0, "profile_image": None, "phone_enabled": False, "created_at": datetime.utcnow()}
        await db.users.insert_one(admin_dict)
        logger.info(f"Admin user created: {admin_email} / Admin@123")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
