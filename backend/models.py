from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"

class OfferStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"

class MessageType(str, Enum):
    TEXT = "text"
    AUDIO = "audio"

class SupportStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"

# User Models
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: UserRole = UserRole.USER
    rating: float = 0.0
    review_count: int = 0
    profile_image: Optional[str] = None
    phone_enabled: bool = False  # للاتصال الصوتي
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Listing Models
class ListingCreate(BaseModel):
    title: str
    description: str
    price: float
    category: str
    images: List[str] = []  # base64 encoded
    video: Optional[str] = None  # base64 encoded
    category_fields: Dict[str, Any] = {}  # حقول خاصة بكل فئة

class Listing(BaseModel):
    id: str
    seller_id: str
    seller_name: str
    title: str
    description: str
    price: float
    category: str
    images: List[str] = []
    video: Optional[str] = None
    category_fields: Dict[str, Any] = {}
    views: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Message Models
class MessageCreate(BaseModel):
    to_user_id: str
    listing_id: str
    content: str
    message_type: MessageType = MessageType.TEXT

class Message(BaseModel):
    id: str
    from_user_id: str
    to_user_id: str
    listing_id: str
    content: str
    message_type: MessageType
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Offer Models
class OfferCreate(BaseModel):
    listing_id: str
    seller_id: str
    offered_price: float
    message: Optional[str] = None

class Offer(BaseModel):
    id: str
    listing_id: str
    buyer_id: str
    seller_id: str
    offered_price: float
    message: Optional[str] = None
    status: OfferStatus = OfferStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)

class OfferAction(BaseModel):
    offer_id: str
    action: str  # accept or reject

# Review Models
class ReviewCreate(BaseModel):
    reviewed_user_id: str
    rating: int  # 1-5
    comment: Optional[str] = None

class Review(BaseModel):
    id: str
    reviewer_id: str
    reviewer_name: str
    reviewed_user_id: str
    rating: int
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Support Models
class SupportTicketCreate(BaseModel):
    subject: str
    message: str

class SupportTicket(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    subject: str
    message: str
    status: SupportStatus = SupportStatus.OPEN
    replies: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

# AI Models
class AIDescriptionRequest(BaseModel):
    title: str
    category: str
    category_fields: Dict[str, Any] = {}

class AIPriceRequest(BaseModel):
    title: str
    category: str
    condition: Optional[str] = None
    category_fields: Dict[str, Any] = {}

# Category Model
class Category(BaseModel):
    id: str
    name: str
    name_ar: str
    icon: str
    fields: List[Dict[str, Any]] = []  # حقول مخصصة لكل فئة
