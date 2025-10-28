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

async def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Optional authentication - returns None if not authenticated"""
    if not authorization or not authorization.startswith('Bearer '):
        return None
    try:
        token = authorization.split(' ')[1]
        return decode_token(token)
    except:
        return None

# ============= AUTH =============
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="E-Mail wird bereits verwendet")
    
    password = user_data.password
    if len(password) < 8 or not any(c.isupper() for c in password) or not any(c.isdigit() for c in password):
        raise HTTPException(status_code=400, detail="Passwort muss mindestens 8 Zeichen, einen Großbuchstaben und Zahlen enthalten")
    
    user_id = str(uuid.uuid4())
    user_dict = {
        "id": user_id,
        "name": user_data.name,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "role": UserRole.USER,
        "rating": 0.0,
        "review_count": 0,
        "profile_image": None,
        "phone_enabled": False,
        "created_at": datetime.utcnow()
    }
    
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
    if profile_image is not None:
        update_data['profile_image'] = profile_image
    if phone_enabled is not None:
        update_data['phone_enabled'] = phone_enabled
    if update_data:
        await db.users.update_one({"id": current_user['user_id']}, {"$set": update_data})
    user = await db.users.find_one({"id": current_user['user_id']})
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    return User(**{k: v for k, v in user.items() if k != 'password' and k != '_id'})

# Profile management endpoints
@api_router.put("/users/profile")
async def update_user_profile(profile_data: dict, current_user: dict = Depends(get_current_user)):
    update_data = {}
    if 'name' in profile_data:
        update_data['name'] = profile_data['name']
    if 'profile_image' in profile_data:
        update_data['profile_image'] = profile_data['profile_image']
    if 'phone_enabled' in profile_data:
        update_data['phone_enabled'] = profile_data['phone_enabled']
    
    if update_data:
        await db.users.update_one({"id": current_user['user_id']}, {"$set": update_data})
    
    user = await db.users.find_one({"id": current_user['user_id']})
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    return User(**{k: v for k, v in user.items() if k != 'password' and k != '_id'})

# ============= CATEGORIES =============
@api_router.get("/categories")
async def get_categories():
    categories = [
        {
            "id": "cars",
            "name": "Autos",
            "name_de": "Autos",
            "icon": "car",
            "fields": [
                {"name": "brand", "label": "Marke", "type": "select", "options": ["Audi", "BMW", "Mercedes-Benz", "Volkswagen", "Opel", "Ford", "Toyota", "Honda", "Nissan", "Mazda", "Hyundai", "Kia", "Peugeot", "Renault", "Fiat", "Volvo", "Skoda", "Seat", "Porsche", "Tesla", "Andere"]},
                {"name": "model", "label": "Modell", "type": "select_dynamic", "options": {
                    "Audi": ["A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q2", "Q3", "Q5", "Q7", "Q8", "TT", "R8", "e-tron"],
                    "BMW": ["1er", "2er", "3er", "4er", "5er", "6er", "7er", "8er", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "Z4", "i3", "i4", "iX"],
                    "Mercedes-Benz": ["A-Klasse", "B-Klasse", "C-Klasse", "E-Klasse", "S-Klasse", "GLA", "GLB", "GLC", "GLE", "GLS", "CLA", "CLS", "AMG GT", "EQC", "EQS"],
                    "Volkswagen": ["Polo", "Golf", "Passat", "Tiguan", "Touareg", "T-Roc", "T-Cross", "Arteon", "ID.3", "ID.4", "ID.5"],
                    "Opel": ["Corsa", "Astra", "Insignia", "Mokka", "Crossland", "Grandland"],
                    "Ford": ["Fiesta", "Focus", "Mondeo", "Kuga", "Puma", "Explorer", "Mustang"],
                    "Toyota": ["Aygo", "Yaris", "Corolla", "Camry", "RAV4", "Highlander", "C-HR", "Prius"],
                    "Honda": ["Jazz", "Civic", "Accord", "CR-V", "HR-V"],
                    "Nissan": ["Micra", "Juke", "Qashqai", "X-Trail", "Leaf"],
                    "Mazda": ["2", "3", "6", "CX-3", "CX-5", "CX-30", "MX-5"],
                    "Andere": []
                }},
                {"name": "year", "label": "Baujahr", "type": "number"},
                {"name": "mileage", "label": "Kilometerstand", "type": "number"},
                {"name": "fuel_type", "label": "Kraftstoffart", "type": "select", "options": ["Benzin", "Diesel", "Elektro", "Hybrid", "Plug-in-Hybrid", "Erdgas (CNG)", "Autogas (LPG)"]},
                {"name": "transmission", "label": "Getriebe", "type": "select", "options": ["Automatik", "Manuell", "Halbautomatik"]},
                {"name": "power", "label": "Leistung (PS)", "type": "number"},
                {"name": "doors", "label": "Türen", "type": "select", "options": ["2/3", "4/5", "6/7"]},
                {"name": "seats", "label": "Sitze", "type": "number"},
                {"name": "color", "label": "Farbe", "type": "select", "options": ["Schwarz", "Weiß", "Silber", "Grau", "Blau", "Rot", "Grün", "Gelb", "Braun", "Beige", "Orange", "Andere"]},
                {"name": "condition", "label": "Zustand", "type": "select", "options": ["Neu", "Neuwertig", "Gebraucht", "Beschädigt"]}
            ]
        },
        {
            "id": "electronics",
            "name": "Elektronik",
            "name_de": "Elektronik",
            "icon": "laptop",
            "fields": [
                {"name": "category", "label": "Kategorie", "type": "select", "options": ["Smartphones", "Tablets", "Laptops", "Desktop-PCs", "Monitore", "Drucker", "Kameras", "TV & Audio", "Smart Home", "Zubehör", "Andere"]},
                {"name": "brand", "label": "Marke", "type": "select", "options": ["Apple", "Samsung", "Huawei", "Xiaomi", "Sony", "LG", "Lenovo", "HP", "Dell", "Asus", "Acer", "Microsoft", "Canon", "Nikon", "Bose", "JBL", "Philips", "Andere"]},
                {"name": "model", "label": "Modell", "type": "text"},
                {"name": "condition", "label": "Zustand", "type": "select", "options": ["Neu", "Wie neu", "Sehr gut", "Gut", "Akzeptabel", "Defekt"]},
                {"name": "warranty", "label": "Garantie", "type": "select", "options": ["Mit Garantie", "Ohne Garantie"]},
                {"name": "storage", "label": "Speicher", "type": "text"},
                {"name": "color", "label": "Farbe", "type": "text"}
            ]
        },
        {
            "id": "real_estate",
            "name": "Immobilien",
            "name_de": "Immobilien",
            "icon": "home",
            "fields": [
                {"name": "property_type", "label": "Immobilientyp", "type": "select", "options": ["Wohnung", "Haus", "Villa", "Grundstück", "Gewerbeimmobilie", "Büro", "Garage/Stellplatz", "Andere"]},
                {"name": "listing_type", "label": "Angebotstyp", "type": "select", "options": ["Zu verkaufen", "Zu vermieten", "Zwischenmiete"]},
                {"name": "area", "label": "Wohnfläche (m²)", "type": "number"},
                {"name": "plot_area", "label": "Grundstücksfläche (m²)", "type": "number"},
                {"name": "bedrooms", "label": "Schlafzimmer", "type": "number"},
                {"name": "bathrooms", "label": "Badezimmer", "type": "number"},
                {"name": "floor", "label": "Etage", "type": "text"},
                {"name": "year_built", "label": "Baujahr", "type": "number"},
                {"name": "heating", "label": "Heizung", "type": "select", "options": ["Zentralheizung", "Gasheizung", "Ölheizung", "Fernwärme", "Wärmepumpe", "Elektrisch", "Keine"]},
                {"name": "parking", "label": "Parkplatz", "type": "select", "options": ["Garage", "Stellplatz", "Tiefgarage", "Keine"]},
                {"name": "balcony", "label": "Balkon/Terrasse", "type": "select", "options": ["Ja", "Nein"]},
                {"name": "elevator", "label": "Aufzug", "type": "select", "options": ["Ja", "Nein"]},
                {"name": "location", "label": "Standort", "type": "text"}
            ]
        },
        {
            "id": "furniture",
            "name": "Möbel",
            "name_de": "Möbel",
            "icon": "bed",
            "fields": [
                {"name": "category", "label": "Kategorie", "type": "select", "options": ["Wohnzimmer", "Schlafzimmer", "Küche", "Badezimmer", "Büro", "Kinderzimmer", "Garten", "Andere"]},
                {"name": "type", "label": "Möbeltyp", "type": "select", "options": ["Sofa", "Sessel", "Tisch", "Stuhl", "Bett", "Schrank", "Regal", "Kommode", "Andere"]},
                {"name": "material", "label": "Material", "type": "select", "options": ["Holz", "Metall", "Kunststoff", "Glas", "Stoff", "Leder", "Andere"]},
                {"name": "color", "label": "Farbe", "type": "text"},
                {"name": "dimensions", "label": "Maße (L×B×H in cm)", "type": "text"},
                {"name": "condition", "label": "Zustand", "type": "select", "options": ["Neu", "Wie neu", "Gut", "Gebraucht"]}
            ]
        },
        {
            "id": "fashion",
            "name": "Mode",
            "name_de": "Mode",
            "icon": "shirt",
            "fields": [
                {"name": "category", "label": "Kategorie", "type": "select", "options": ["Oberbekleidung", "Hosen", "Kleider & Röcke", "Schuhe", "Accessoires", "Taschen", "Uhren", "Schmuck", "Andere"]},
                {"name": "brand", "label": "Marke", "type": "text"},
                {"name": "size", "label": "Größe", "type": "select", "options": ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "Andere"]},
                {"name": "condition", "label": "Zustand", "type": "select", "options": ["Neu mit Etikett", "Neu ohne Etikett", "Wie neu", "Sehr gut", "Gut"]},
                {"name": "gender", "label": "Geschlecht", "type": "select", "options": ["Herren", "Damen", "Unisex", "Kinder"]},
                {"name": "color", "label": "Farbe", "type": "text"},
                {"name": "material", "label": "Material", "type": "text"}
            ]
        },
        {
            "id": "sports",
            "name": "Sport & Freizeit",
            "name_de": "Sport & Freizeit",
            "icon": "football",
            "fields": [
                {"name": "category", "label": "Kategorie", "type": "select", "options": ["Fitnessgeräte", "Fahrräder", "Camping & Outdoor", "Wintersport", "Wassersport", "Ballsport", "Sportbekleidung", "Andere"]},
                {"name": "brand", "label": "Marke", "type": "text"},
                {"name": "type", "label": "Typ", "type": "text"},
                {"name": "size", "label": "Größe", "type": "text"},
                {"name": "condition", "label": "Zustand", "type": "select", "options": ["Neu", "Wie neu", "Gut", "Gebraucht"]}
            ]
        },
        {
            "id": "garden",
            "name": "Garten & Heimwerk",
            "name_de": "Garten & Heimwerk",
            "icon": "hammer",
            "fields": [
                {"name": "category", "label": "Kategorie", "type": "select", "options": ["Gartengeräte", "Pflanzen", "Gartenmöbel", "Werkzeuge", "Baumaterial", "Andere"]},
                {"name": "brand", "label": "Marke", "type": "text"},
                {"name": "condition", "label": "Zustand", "type": "select", "options": ["Neu", "Wie neu", "Gut", "Gebraucht"]}
            ]
        },
        {
            "id": "other",
            "name": "Sonstiges",
            "name_de": "Sonstiges",
            "icon": "apps",
            "fields": [
                {"name": "type", "label": "Typ", "type": "text"},
                {"name": "condition", "label": "Zustand", "type": "select", "options": ["Neu", "Gebraucht"]}
            ]
        }
    ]
    return categories

# ============= LISTINGS =============
@api_router.post("/listings", response_model=Listing)
async def create_listing(listing_data: ListingCreate, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user['user_id']})
    listing_id = str(uuid.uuid4())
    listing_dict = {
        "id": listing_id,
        "seller_id": current_user['user_id'],
        "seller_name": user['name'],
        "title": listing_data.title,
        "description": listing_data.description,
        "price": listing_data.price,
        "category": listing_data.category,
        "images": listing_data.images,
        "video": listing_data.video,
        "category_fields": listing_data.category_fields,
        "views": 0,
        "created_at": datetime.utcnow()
    }
    await db.listings.insert_one(listing_dict)
    return Listing(**{k: v for k, v in listing_dict.items() if k != '_id'})

@api_router.get("/listings", response_model=List[Listing])
async def get_listings(category: Optional[str] = None, search: Optional[str] = None, skip: int = 0, limit: int = 20):
    query = {}
    if category:
        query['category'] = category
    if search:
        query['$or'] = [
            {'title': {'$regex': search, '$options': 'i'}},
            {'description': {'$regex': search, '$options': 'i'}}
        ]
    listings = await db.listings.find(query).sort('created_at', -1).skip(skip).limit(limit).to_list(limit)
    return [Listing(**{k: v for k, v in listing.items() if k != '_id'}) for listing in listings]

@api_router.get("/listings/my")
async def get_my_listings(current_user: dict = Depends(get_current_user)):
    listings = await db.listings.find({"seller_id": current_user['user_id']}).sort('created_at', -1).to_list(100)
    return [Listing(**{k: v for k, v in listing.items() if k != '_id'}) for listing in listings]

@api_router.get("/listings/{listing_id}", response_model=Listing)
async def get_listing(listing_id: str):
    listing = await db.listings.find_one({"id": listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Anzeige nicht gefunden")
    await db.listings.update_one({"id": listing_id}, {"$inc": {"views": 1}})
    return Listing(**{k: v for k, v in listing.items() if k != '_id'})

@api_router.delete("/listings/{listing_id}")
async def delete_listing(listing_id: str, current_user: dict = Depends(get_current_user)):
    listing = await db.listings.find_one({"id": listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Anzeige nicht gefunden")
    if listing['seller_id'] != current_user['user_id'] and current_user['role'] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Nicht autorisiert")
    await db.listings.delete_one({"id": listing_id})
    return {"message": "Anzeige gelöscht"}

# ============= MESSAGES =============
@api_router.post("/messages")
async def send_message(message_data: MessageCreate, current_user: dict = Depends(get_current_user)):
    message_id = str(uuid.uuid4())
    message_dict = {
        "id": message_id,
        "from_user_id": current_user['user_id'],
        "to_user_id": message_data.to_user_id,
        "listing_id": message_data.listing_id,
        "content": message_data.content,
        "message_type": message_data.message_type,
        "read": False,
        "created_at": datetime.utcnow()
    }
    await db.messages.insert_one(message_dict)
    return Message(**{k: v for k, v in message_dict.items() if k != '_id'})

@api_router.get("/messages/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    user_id = current_user['user_id']
    messages = await db.messages.find({"$or": [{"from_user_id": user_id}, {"to_user_id": user_id}]}).sort('created_at', -1).to_list(1000)
    conversations = {}
    for msg in messages:
        other_user_id = msg['to_user_id'] if msg['from_user_id'] == user_id else msg['from_user_id']
        conv_key = f"{other_user_id}_{msg['listing_id']}"
        if conv_key not in conversations:
            other_user = await db.users.find_one({"id": other_user_id})
            listing = await db.listings.find_one({"id": msg['listing_id']})
            conversations[conv_key] = {
                "other_user_id": other_user_id,
                "other_user_name": other_user['name'] if other_user else "Gelöschter Benutzer",
                "other_user_image": other_user.get('profile_image') if other_user else None,
                "listing_id": msg['listing_id'],
                "listing_title": listing['title'] if listing else "Gelöschte Anzeige",
                "listing_image": listing['images'][0] if listing and listing.get('images') else None,
                "last_message": msg['content'][:50],
                "last_message_time": msg['created_at'],
                "unread": 0
            }
    return list(conversations.values())
@api_router.get("/messages/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Get count of unread messages"""
    count = await db.messages.count_documents({
        "to_user_id": current_user['user_id'],
        "read": False
    })
    return {"count": count}

@api_router.get("/messages/{listing_id}/{other_user_id}")
async def get_conversation_messages(listing_id: str, other_user_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user['user_id']
    messages = await db.messages.find({
        "listing_id": listing_id,
        "$or": [
            {"from_user_id": user_id, "to_user_id": other_user_id},
            {"from_user_id": other_user_id, "to_user_id": user_id}
        ]
    }).sort('created_at', 1).to_list(1000)
    return [Message(**{k: v for k, v in msg.items() if k != '_id'}) for msg in messages]

# ============= OFFERS =============
@api_router.post("/offers")
async def create_offer(offer_data: OfferCreate, current_user: dict = Depends(get_current_user)):
    offer_id = str(uuid.uuid4())
    offer_dict = {
        "id": offer_id,
        "listing_id": offer_data.listing_id,
        "buyer_id": current_user['user_id'],
        "seller_id": offer_data.seller_id,
        "offered_price": offer_data.offered_price,
        "message": offer_data.message,
        "status": OfferStatus.PENDING,
        "created_at": datetime.utcnow()
    }
    await db.offers.insert_one(offer_dict)
    buyer = await db.users.find_one({"id": current_user['user_id']})
    auto_message = f"Neues Angebot von {buyer['name']}: €{offer_data.offered_price} - {offer_data.message or ''}"
    message_id = str(uuid.uuid4())
    message_dict = {
        "id": message_id,
        "from_user_id": current_user['user_id'],
        "to_user_id": offer_data.seller_id,
        "listing_id": offer_data.listing_id,
        "content": auto_message,
        "message_type": MessageType.TEXT,
        "read": False,
        "created_at": datetime.utcnow()
    }
    await db.messages.insert_one(message_dict)
    return Offer(**{k: v for k, v in offer_dict.items() if k != '_id'})

@api_router.get("/offers/received")
async def get_received_offers(current_user: dict = Depends(get_current_user)):
    offers = await db.offers.find({"seller_id": current_user['user_id']}).sort('created_at', -1).to_list(100)
    result = []
    for offer in offers:
        buyer = await db.users.find_one({"id": offer['buyer_id']})
        listing = await db.listings.find_one({"id": offer['listing_id']})
        result.append({**{k: v for k, v in offer.items() if k != '_id'}, "buyer_name": buyer['name'] if buyer else "Gelöschter Benutzer", "listing_title": listing['title'] if listing else "Gelöschte Anzeige"})
    return result

@api_router.get("/offers/my")
async def get_my_offers(current_user: dict = Depends(get_current_user)):
    """Get all offers received by the current user (as seller)"""
    offers = await db.offers.find({"seller_id": current_user['user_id']}).sort('created_at', -1).to_list(100)
    result = []
    for offer in offers:
        buyer = await db.users.find_one({"id": offer['buyer_id']})
        listing = await db.listings.find_one({"id": offer['listing_id']})
        listing_image = listing['images'][0] if listing and listing.get('images') else None
        result.append({
            **{k: v for k, v in offer.items() if k != '_id'}, 
            "buyer_name": buyer['name'] if buyer else "Gelöschter Benutzer", 
            "listing_title": listing['title'] if listing else "Gelöschte Anzeige",
            "listing_image": listing_image,
            "original_price": listing['price'] if listing else 0
        })
    return result

@api_router.get("/offers/sent")
async def get_sent_offers(current_user: dict = Depends(get_current_user)):
    offers = await db.offers.find({"buyer_id": current_user['user_id']}).sort('created_at', -1).to_list(100)
    result = []
    for offer in offers:
        seller = await db.users.find_one({"id": offer['seller_id']})
        listing = await db.listings.find_one({"id": offer['listing_id']})
        result.append({**{k: v for k, v in offer.items() if k != '_id'}, "seller_name": seller['name'] if seller else "Gelöschter Benutzer", "listing_title": listing['title'] if listing else "Gelöschte Anzeige"})
    return result

@api_router.post("/offers/action")
async def handle_offer_action(action_data: OfferAction, current_user: dict = Depends(get_current_user)):
    offer = await db.offers.find_one({"id": action_data.offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Angebot nicht gefunden")
    if offer['seller_id'] != current_user['user_id']:
        raise HTTPException(status_code=403, detail="Nicht autorisiert")
    new_status = OfferStatus.ACCEPTED if action_data.action == "accept" else OfferStatus.REJECTED
    await db.offers.update_one({"id": action_data.offer_id}, {"$set": {"status": new_status}})
    listing = await db.listings.find_one({"id": offer['listing_id']})
    auto_message = f"{'✅ Ihr Angebot wurde angenommen!' if new_status == OfferStatus.ACCEPTED else '❌ Ihr Angebot wurde abgelehnt'} - {listing['title'] if listing else ''}"
    message_id = str(uuid.uuid4())
    message_dict = {
        "id": message_id,
        "from_user_id": current_user['user_id'],
        "to_user_id": offer['buyer_id'],
        "listing_id": offer['listing_id'],
        "content": auto_message,
        "message_type": MessageType.TEXT,
        "read": False,
        "created_at": datetime.utcnow()
    }
    await db.messages.insert_one(message_dict)
    return {"message": "Angebot aktualisiert", "status": new_status}

# ============= REVIEWS =============
@api_router.post("/reviews")
async def create_review(review_data: ReviewCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.reviews.find_one({"reviewer_id": current_user['user_id'], "reviewed_user_id": review_data.reviewed_user_id})
    if existing:
        raise HTTPException(status_code=400, detail="Sie haben diesen Benutzer bereits bewertet")
    reviewer = await db.users.find_one({"id": current_user['user_id']})
    review_id = str(uuid.uuid4())
    review_dict = {
        "id": review_id,
        "reviewer_id": current_user['user_id'],
        "reviewer_name": reviewer['name'],
        "reviewed_user_id": review_data.reviewed_user_id,
        "rating": review_data.rating,
        "comment": review_data.comment,
        "created_at": datetime.utcnow()
    }
    await db.reviews.insert_one(review_dict)
    all_reviews = await db.reviews.find({"reviewed_user_id": review_data.reviewed_user_id}).to_list(1000)
    avg_rating = sum(r['rating'] for r in all_reviews) / len(all_reviews)
    await db.users.update_one({"id": review_data.reviewed_user_id}, {"$set": {"rating": avg_rating, "review_count": len(all_reviews)}})
    return Review(**{k: v for k, v in review_dict.items() if k != '_id'})

@api_router.get("/reviews/{user_id}")
async def get_user_reviews(user_id: str):
    reviews = await db.reviews.find({"reviewed_user_id": user_id}).sort('created_at', -1).to_list(100)
    return [Review(**{k: v for k, v in review.items() if k != '_id'}) for review in reviews]

# ============= FAVORITES =============
@api_router.post("/favorites/{listing_id}")
async def add_to_favorites(listing_id: str, current_user: dict = Depends(get_current_user)):
    # Check if listing exists
    listing = await db.listings.find_one({"id": listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Anzeige nicht gefunden")
    
    # Check if already favorited
    existing = await db.favorites.find_one({"user_id": current_user['user_id'], "listing_id": listing_id})
    if existing:
        raise HTTPException(status_code=400, detail="Bereits zu Favoriten hinzugefügt")
    
    favorite_id = str(uuid.uuid4())
    favorite_dict = {
        "id": favorite_id,
        "user_id": current_user['user_id'],
        "listing_id": listing_id,
        "created_at": datetime.utcnow()
    }
    await db.favorites.insert_one(favorite_dict)
    return {"message": "Zu Favoriten hinzugefügt"}

@api_router.delete("/favorites/{listing_id}")
async def remove_from_favorites(listing_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.favorites.delete_one({"user_id": current_user['user_id'], "listing_id": listing_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Favorit nicht gefunden")
    return {"message": "Aus Favoriten entfernt"}

@api_router.get("/favorites")
async def get_favorites(current_user: dict = Depends(get_current_user)):
    favorites = await db.favorites.find({"user_id": current_user['user_id']}).sort('created_at', -1).to_list(100)
    result = []
    for fav in favorites:
        listing = await db.listings.find_one({"id": fav['listing_id']})
        if listing:
            result.append(Listing(**{k: v for k, v in listing.items() if k != '_id'}))
    return result

@api_router.get("/favorites/check/{listing_id}")
async def check_favorite(listing_id: str, current_user: dict = Depends(get_current_user)):
    favorite = await db.favorites.find_one({"user_id": current_user['user_id'], "listing_id": listing_id})
    return {"is_favorited": favorite is not None}

# ============= SUPPORT =============
@api_router.post("/support")
async def create_support_ticket(ticket_data: SupportTicketCreate, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user['user_id']})
    ticket_id = str(uuid.uuid4())
    ticket_dict = {
        "id": ticket_id,
        "user_id": current_user['user_id'],
        "user_name": user['name'],
        "user_email": user['email'],
        "subject": ticket_data.subject,
        "message": ticket_data.message,
        "status": SupportStatus.OPEN,
        "replies": [],
        "created_at": datetime.utcnow()
    }
    await db.support_tickets.insert_one(ticket_dict)
    return SupportTicket(**{k: v for k, v in ticket_dict.items() if k != '_id'})

@api_router.get("/support/my")
async def get_my_tickets(current_user: dict = Depends(get_current_user)):
    tickets = await db.support_tickets.find({"user_id": current_user['user_id']}).sort('created_at', -1).to_list(100)
    return [SupportTicket(**{k: v for k, v in ticket.items() if k != '_id'}) for ticket in tickets]

# ============= AI =============
@api_router.post("/ai/generate-description")
async def generate_description(request: AIDescriptionRequest):
    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"desc_{uuid.uuid4()}", system_message="Du bist ein Assistent, der ansprechende Produktbeschreibungen für eine Kleinanzeigen-App schreibt. Schreibe kurz und ansprechend auf Deutsch.").with_model("openai", "gpt-4o-mini")
        prompt = f"Schreibe eine ansprechende Beschreibung für ein Produkt mit dem Titel: {request.title}\nKategorie: {request.category}\nDetails: {request.category_fields}\n\nSchreibe eine kurze Beschreibung (3-4 Sätze) auf Deutsch."
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        return {"description": response}
    except Exception as e:
        logger.error(f"Error generating description: {e}")
        raise HTTPException(status_code=500, detail="Fehler beim Generieren der Beschreibung")

@api_router.post("/ai/suggest-price")
async def suggest_price(request: AIPriceRequest):
    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"price_{uuid.uuid4()}", system_message="Du bist ein Experte für die Bewertung von gebrauchten und neuen Produkten. Gib eine Preisschätzung basierend auf Produktinformationen und Marktbedingungen.").with_model("openai", "gpt-4o-mini")
        prompt = f"Was ist ein angemessener Preis für ein Produkt mit folgenden Eigenschaften:\nTitel: {request.title}\nKategorie: {request.category}\nZustand: {request.condition or 'Nicht angegeben'}\nDetails: {request.category_fields}\n\nGib eine ungefähre Preisspanne in Euro. Gib eine kurze Antwort (eine Zeile) wie: 'Angemessener Preis: €500-700'"
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        return {"suggested_price": response}
    except Exception as e:
        logger.error(f"Error suggesting price: {e}")
        raise HTTPException(status_code=500, detail="Fehler beim Vorschlagen des Preises")

# ============= ADMIN =============
@api_router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Nicht autorisiert")
    users = await db.users.find().sort('created_at', -1).to_list(1000)
    return [User(**{k: v for k, v in user.items() if k != 'password' and k != '_id'}) for user in users]

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Nicht autorisiert")
    await db.users.delete_one({"id": user_id})
    await db.listings.delete_many({"seller_id": user_id})
    await db.messages.delete_many({"$or": [{"from_user_id": user_id}, {"to_user_id": user_id}]})
    await db.offers.delete_many({"$or": [{"buyer_id": user_id}, {"seller_id": user_id}]})
    await db.reviews.delete_many({"$or": [{"reviewer_id": user_id}, {"reviewed_user_id": user_id}]})
    return {"message": "Benutzer gelöscht"}

@api_router.get("/admin/listings")
async def get_all_listings_admin(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Nicht autorisiert")
    listings = await db.listings.find().sort('created_at', -1).to_list(1000)
    return [Listing(**{k: v for k, v in listing.items() if k != '_id'}) for listing in listings]

@api_router.get("/admin/support")
async def get_all_tickets(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Nicht autorisiert")
    tickets = await db.support_tickets.find().sort('created_at', -1).to_list(1000)
    return [SupportTicket(**{k: v for k, v in ticket.items() if k != '_id'}) for ticket in tickets]

@api_router.post("/admin/support/{ticket_id}/reply")
async def reply_to_ticket(ticket_id: str, reply_message: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Nicht autorisiert")
    reply = {"from": "admin", "message": reply_message, "timestamp": datetime.utcnow()}
    await db.support_tickets.update_one({"id": ticket_id}, {"$push": {"replies": reply}})
    return {"message": "Antwort gesendet"}

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Nicht autorisiert")
    users_count = await db.users.count_documents({})
    listings_count = await db.listings.count_documents({})
    messages_count = await db.messages.count_documents({})
    offers_count = await db.offers.count_documents({})
    support_open = await db.support_tickets.count_documents({"status": SupportStatus.OPEN})
    return {"users": users_count, "listings": listings_count, "messages": messages_count, "offers": offers_count, "open_tickets": support_open}

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
