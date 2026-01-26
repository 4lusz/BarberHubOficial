from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
import httpx
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'barbersaas-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168  # 7 days

# Resend Config
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

# Create the main app
app = FastAPI(title="BarberSaaS API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    barbershop_name: Optional[str] = None
    role: str = "barber"  # barber or client

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ClientRegister(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class User(BaseModel):
    user_id: str
    email: str
    name: str
    role: str
    barbershop_id: Optional[str] = None
    phone: Optional[str] = None
    picture: Optional[str] = None
    created_at: datetime

class BarbershopCreate(BaseModel):
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None

class Barbershop(BaseModel):
    barbershop_id: str
    owner_id: str
    name: str
    slug: str
    description: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime

class ServiceCreate(BaseModel):
    name: str
    duration: int  # minutes
    price: float
    description: Optional[str] = None

class Service(BaseModel):
    service_id: str
    barbershop_id: str
    name: str
    duration: int
    price: float
    description: Optional[str] = None
    active: bool = True

class ProfessionalCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class Professional(BaseModel):
    professional_id: str
    barbershop_id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    active: bool = True

class BusinessHoursCreate(BaseModel):
    day_of_week: int  # 0=Monday, 6=Sunday
    start_time: str  # HH:MM
    end_time: str  # HH:MM
    is_closed: bool = False

class BusinessHours(BaseModel):
    barbershop_id: str
    day_of_week: int
    start_time: str
    end_time: str
    is_closed: bool = False

class TimeBlockCreate(BaseModel):
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM
    end_time: str  # HH:MM
    reason: Optional[str] = None
    professional_id: Optional[str] = None

class TimeBlock(BaseModel):
    block_id: str
    barbershop_id: str
    date: str
    start_time: str
    end_time: str
    reason: Optional[str] = None
    professional_id: Optional[str] = None

class AppointmentCreate(BaseModel):
    barbershop_id: str
    service_id: str
    professional_id: Optional[str] = None
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    client_name: str
    client_phone: str
    client_email: Optional[str] = None
    notes: Optional[str] = None

class Appointment(BaseModel):
    appointment_id: str
    barbershop_id: str
    service_id: str
    professional_id: Optional[str] = None
    client_id: Optional[str] = None
    date: str
    time: str
    end_time: str
    client_name: str
    client_phone: str
    client_email: Optional[str] = None
    notes: Optional[str] = None
    status: str = "pending"  # pending, confirmed, cancelled, completed
    created_at: datetime

class AppointmentUpdate(BaseModel):
    status: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    notes: Optional[str] = None


# ==================== HELPER FUNCTIONS ====================

def generate_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"

def generate_slug(name: str) -> str:
    import re
    slug = name.lower().strip()
    slug = re.sub(r'[àáâãäå]', 'a', slug)
    slug = re.sub(r'[èéêë]', 'e', slug)
    slug = re.sub(r'[ìíîï]', 'i', slug)
    slug = re.sub(r'[òóôõö]', 'o', slug)
    slug = re.sub(r'[ùúûü]', 'u', slug)
    slug = re.sub(r'[ç]', 'c', slug)
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_jwt_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_current_user(request: Request, credentials = Depends(security)) -> dict:
    # Try cookie first
    session_token = request.cookies.get("session_token")
    if session_token:
        session = await db.user_sessions.find_one(
            {"session_token": session_token},
            {"_id": 0}
        )
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one(
                    {"user_id": session["user_id"]},
                    {"_id": 0}
                )
                if user:
                    return user
    
    # Try Authorization header
    if credentials:
        token = credentials.credentials
        payload = decode_jwt_token(token)
        user = await db.users.find_one(
            {"user_id": payload["user_id"]},
            {"_id": 0}
        )
        if user:
            return user
    
    raise HTTPException(status_code=401, detail="Não autenticado")

async def get_optional_user(request: Request, credentials = Depends(security)) -> Optional[dict]:
    try:
        return await get_current_user(request, credentials)
    except HTTPException:
        return None

def calculate_end_time(start_time: str, duration_minutes: int) -> str:
    hours, minutes = map(int, start_time.split(':'))
    total_minutes = hours * 60 + minutes + duration_minutes
    end_hours = total_minutes // 60
    end_minutes = total_minutes % 60
    return f"{end_hours:02d}:{end_minutes:02d}"

async def send_email_notification(to_email: str, subject: str, html_content: str):
    if not resend.api_key:
        logger.warning("RESEND_API_KEY not configured, skipping email")
        return None
    
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to_email}")
        return email
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return None


# ==================== ROOT ROUTE ====================

@api_router.get("/")
async def root():
    return {"message": "BarberSaaS API", "status": "ok"}


# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    user_id = generate_id("user")
    hashed_password = hash_password(user_data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "password": hashed_password,
        "name": user_data.name,
        "role": user_data.role,
        "barbershop_id": None,
        "phone": None,
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # If barber, create barbershop
    barbershop = None
    if user_data.role == "barber" and user_data.barbershop_name:
        barbershop_id = generate_id("barb")
        base_slug = generate_slug(user_data.barbershop_name)
        slug = base_slug
        
        # Ensure unique slug
        counter = 1
        while await db.barbershops.find_one({"slug": slug}):
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        barbershop_doc = {
            "barbershop_id": barbershop_id,
            "owner_id": user_id,
            "name": user_data.barbershop_name,
            "slug": slug,
            "description": None,
            "address": None,
            "phone": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.barbershops.insert_one(barbershop_doc)
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"barbershop_id": barbershop_id}}
        )
        user_doc["barbershop_id"] = barbershop_id
        
        # Create default business hours (Mon-Sat 9-18)
        default_hours = []
        for day in range(6):  # Mon-Sat
            default_hours.append({
                "barbershop_id": barbershop_id,
                "day_of_week": day,
                "start_time": "09:00",
                "end_time": "18:00",
                "is_closed": False
            })
        default_hours.append({
            "barbershop_id": barbershop_id,
            "day_of_week": 6,  # Sunday
            "start_time": "09:00",
            "end_time": "18:00",
            "is_closed": True
        })
        await db.business_hours.insert_many(default_hours)
        
        barbershop = {k: v for k, v in barbershop_doc.items() if k != "_id"}
    
    token = create_jwt_token(user_id, user_data.email, user_data.role)
    
    return {
        "token": token,
        "user": {k: v for k, v in user_doc.items() if k not in ["_id", "password"]},
        "barbershop": barbershop
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    token = create_jwt_token(user["user_id"], user["email"], user["role"])
    
    return {
        "token": token,
        "user": {k: v for k, v in user.items() if k != "password"}
    }

@api_router.post("/auth/client/register")
async def register_client(client_data: ClientRegister):
    # Check if phone exists
    existing = await db.users.find_one({"phone": client_data.phone, "role": "client"}, {"_id": 0})
    if existing:
        if client_data.password:
            # Update with password if provided
            hashed = hash_password(client_data.password)
            await db.users.update_one(
                {"user_id": existing["user_id"]},
                {"$set": {"password": hashed, "name": client_data.name}}
            )
            existing["name"] = client_data.name
        token = create_jwt_token(existing["user_id"], existing.get("email", ""), "client")
        return {
            "token": token,
            "user": {k: v for k, v in existing.items() if k != "password"},
            "is_new": False
        }
    
    user_id = generate_id("client")
    user_doc = {
        "user_id": user_id,
        "email": client_data.email,
        "password": hash_password(client_data.password) if client_data.password else None,
        "name": client_data.name,
        "role": "client",
        "barbershop_id": None,
        "phone": client_data.phone,
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    token = create_jwt_token(user_id, client_data.email or "", "client")
    
    return {
        "token": token,
        "user": {k: v for k, v in user_doc.items() if k not in ["_id", "password"]},
        "is_new": True
    }

@api_router.post("/auth/client/login")
async def login_client(phone: str, password: str):
    user = await db.users.find_one({"phone": phone, "role": "client"}, {"_id": 0})
    if not user or not user.get("password"):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if not verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    token = create_jwt_token(user["user_id"], user.get("email", ""), "client")
    
    return {
        "token": token,
        "user": {k: v for k, v in user.items() if k != "password"}
    }

# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
@api_router.post("/auth/google-session")
async def exchange_google_session(session_id: str, response: Response):
    async with httpx.AsyncClient() as client_http:
        resp = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Sessão inválida")
        
        google_data = resp.json()
    
    # Check if user exists
    user = await db.users.find_one({"email": google_data["email"]}, {"_id": 0})
    
    if not user:
        # Create new user as barber
        user_id = generate_id("user")
        user = {
            "user_id": user_id,
            "email": google_data["email"],
            "password": None,
            "name": google_data["name"],
            "role": "barber",
            "barbershop_id": None,
            "phone": None,
            "picture": google_data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
    else:
        user_id = user["user_id"]
        # Update picture if changed
        if google_data.get("picture") and user.get("picture") != google_data["picture"]:
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"picture": google_data["picture"]}}
            )
            user["picture"] = google_data["picture"]
    
    # Store session
    session_token = google_data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {
        "user": {k: v for k, v in user.items() if k not in ["_id", "password"]},
        "token": create_jwt_token(user_id, user["email"], user["role"])
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {k: v for k, v in current_user.items() if k != "password"}

@api_router.post("/auth/logout")
async def logout(response: Response, current_user: dict = Depends(get_current_user)):
    await db.user_sessions.delete_one({"user_id": current_user["user_id"]})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logout realizado com sucesso"}


# ==================== BARBERSHOP ROUTES ====================

@api_router.get("/barbershops/me")
async def get_my_barbershop(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "barber":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    if not current_user.get("barbershop_id"):
        return None
    
    barbershop = await db.barbershops.find_one(
        {"barbershop_id": current_user["barbershop_id"]},
        {"_id": 0}
    )
    return barbershop

@api_router.post("/barbershops")
async def create_barbershop(data: BarbershopCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "barber":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    if current_user.get("barbershop_id"):
        raise HTTPException(status_code=400, detail="Você já possui uma barbearia")
    
    barbershop_id = generate_id("barb")
    base_slug = generate_slug(data.name)
    slug = base_slug
    
    counter = 1
    while await db.barbershops.find_one({"slug": slug}):
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    barbershop_doc = {
        "barbershop_id": barbershop_id,
        "owner_id": current_user["user_id"],
        "name": data.name,
        "slug": slug,
        "description": data.description,
        "address": data.address,
        "phone": data.phone,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.barbershops.insert_one(barbershop_doc)
    await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {"barbershop_id": barbershop_id}}
    )
    
    # Create default business hours
    default_hours = []
    for day in range(6):
        default_hours.append({
            "barbershop_id": barbershop_id,
            "day_of_week": day,
            "start_time": "09:00",
            "end_time": "18:00",
            "is_closed": False
        })
    default_hours.append({
        "barbershop_id": barbershop_id,
        "day_of_week": 6,
        "start_time": "09:00",
        "end_time": "18:00",
        "is_closed": True
    })
    await db.business_hours.insert_many(default_hours)
    
    return {k: v for k, v in barbershop_doc.items() if k != "_id"}

@api_router.put("/barbershops")
async def update_barbershop(data: BarbershopCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "barber" or not current_user.get("barbershop_id"):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    update_data = {
        "name": data.name,
        "description": data.description,
        "address": data.address,
        "phone": data.phone
    }
    
    await db.barbershops.update_one(
        {"barbershop_id": current_user["barbershop_id"]},
        {"$set": update_data}
    )
    
    barbershop = await db.barbershops.find_one(
        {"barbershop_id": current_user["barbershop_id"]},
        {"_id": 0}
    )
    return barbershop

@api_router.get("/barbershops/public/{slug}")
async def get_public_barbershop(slug: str):
    barbershop = await db.barbershops.find_one({"slug": slug}, {"_id": 0})
    if not barbershop:
        raise HTTPException(status_code=404, detail="Barbearia não encontrada")
    
    services = await db.services.find(
        {"barbershop_id": barbershop["barbershop_id"], "active": True},
        {"_id": 0}
    ).to_list(100)
    
    professionals = await db.professionals.find(
        {"barbershop_id": barbershop["barbershop_id"], "active": True},
        {"_id": 0}
    ).to_list(100)
    
    business_hours = await db.business_hours.find(
        {"barbershop_id": barbershop["barbershop_id"]},
        {"_id": 0}
    ).to_list(7)
    
    return {
        "barbershop": barbershop,
        "services": services,
        "professionals": professionals,
        "business_hours": business_hours
    }


# ==================== SERVICES ROUTES ====================

@api_router.get("/services")
async def get_services(current_user: dict = Depends(get_current_user)):
    if not current_user.get("barbershop_id"):
        return []
    
    services = await db.services.find(
        {"barbershop_id": current_user["barbershop_id"]},
        {"_id": 0}
    ).to_list(100)
    return services

@api_router.post("/services")
async def create_service(data: ServiceCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "barber" or not current_user.get("barbershop_id"):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    service_id = generate_id("serv")
    service_doc = {
        "service_id": service_id,
        "barbershop_id": current_user["barbershop_id"],
        "name": data.name,
        "duration": data.duration,
        "price": data.price,
        "description": data.description,
        "active": True
    }
    
    await db.services.insert_one(service_doc)
    return {k: v for k, v in service_doc.items() if k != "_id"}

@api_router.put("/services/{service_id}")
async def update_service(service_id: str, data: ServiceCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "barber" or not current_user.get("barbershop_id"):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    result = await db.services.update_one(
        {"service_id": service_id, "barbershop_id": current_user["barbershop_id"]},
        {"$set": {
            "name": data.name,
            "duration": data.duration,
            "price": data.price,
            "description": data.description
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    service = await db.services.find_one({"service_id": service_id}, {"_id": 0})
    return service

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "barber" or not current_user.get("barbershop_id"):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    result = await db.services.update_one(
        {"service_id": service_id, "barbershop_id": current_user["barbershop_id"]},
        {"$set": {"active": False}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    return {"message": "Serviço removido com sucesso"}


# ==================== PROFESSIONALS ROUTES ====================

@api_router.get("/professionals")
async def get_professionals(current_user: dict = Depends(get_current_user)):
    if not current_user.get("barbershop_id"):
        return []
    
    professionals = await db.professionals.find(
        {"barbershop_id": current_user["barbershop_id"]},
        {"_id": 0}
    ).to_list(100)
    return professionals

@api_router.post("/professionals")
async def create_professional(data: ProfessionalCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "barber" or not current_user.get("barbershop_id"):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    professional_id = generate_id("prof")
    prof_doc = {
        "professional_id": professional_id,
        "barbershop_id": current_user["barbershop_id"],
        "name": data.name,
        "phone": data.phone,
        "email": data.email,
        "active": True
    }
    
    await db.professionals.insert_one(prof_doc)
    return {k: v for k, v in prof_doc.items() if k != "_id"}

@api_router.put("/professionals/{professional_id}")
async def update_professional(professional_id: str, data: ProfessionalCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "barber" or not current_user.get("barbershop_id"):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    result = await db.professionals.update_one(
        {"professional_id": professional_id, "barbershop_id": current_user["barbershop_id"]},
        {"$set": {"name": data.name, "phone": data.phone, "email": data.email}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profissional não encontrado")
    
    prof = await db.professionals.find_one({"professional_id": professional_id}, {"_id": 0})
    return prof

@api_router.delete("/professionals/{professional_id}")
async def delete_professional(professional_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "barber" or not current_user.get("barbershop_id"):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    result = await db.professionals.update_one(
        {"professional_id": professional_id, "barbershop_id": current_user["barbershop_id"]},
        {"$set": {"active": False}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profissional não encontrado")
    
    return {"message": "Profissional removido com sucesso"}


# ==================== BUSINESS HOURS ROUTES ====================

@api_router.get("/business-hours")
async def get_business_hours(current_user: dict = Depends(get_current_user)):
    if not current_user.get("barbershop_id"):
        return []
    
    hours = await db.business_hours.find(
        {"barbershop_id": current_user["barbershop_id"]},
        {"_id": 0}
    ).to_list(7)
    return hours

@api_router.put("/business-hours")
async def update_business_hours(hours: List[BusinessHoursCreate], current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "barber" or not current_user.get("barbershop_id"):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Delete existing and insert new
    await db.business_hours.delete_many({"barbershop_id": current_user["barbershop_id"]})
    
    docs = []
    for h in hours:
        docs.append({
            "barbershop_id": current_user["barbershop_id"],
            "day_of_week": h.day_of_week,
            "start_time": h.start_time,
            "end_time": h.end_time,
            "is_closed": h.is_closed
        })
    
    if docs:
        await db.business_hours.insert_many(docs)
    
    # Return the updated hours
    updated_hours = await db.business_hours.find(
        {"barbershop_id": current_user["barbershop_id"]},
        {"_id": 0}
    ).to_list(7)
    
    return updated_hours


# ==================== TIME BLOCKS ROUTES ====================

@api_router.get("/time-blocks")
async def get_time_blocks(current_user: dict = Depends(get_current_user)):
    if not current_user.get("barbershop_id"):
        return []
    
    blocks = await db.time_blocks.find(
        {"barbershop_id": current_user["barbershop_id"]},
        {"_id": 0}
    ).to_list(100)
    return blocks

@api_router.post("/time-blocks")
async def create_time_block(data: TimeBlockCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "barber" or not current_user.get("barbershop_id"):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    block_id = generate_id("block")
    block_doc = {
        "block_id": block_id,
        "barbershop_id": current_user["barbershop_id"],
        "date": data.date,
        "start_time": data.start_time,
        "end_time": data.end_time,
        "reason": data.reason,
        "professional_id": data.professional_id
    }
    
    await db.time_blocks.insert_one(block_doc)
    return {k: v for k, v in block_doc.items() if k != "_id"}

@api_router.delete("/time-blocks/{block_id}")
async def delete_time_block(block_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "barber" or not current_user.get("barbershop_id"):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    result = await db.time_blocks.delete_one(
        {"block_id": block_id, "barbershop_id": current_user["barbershop_id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bloqueio não encontrado")
    
    return {"message": "Bloqueio removido com sucesso"}


# ==================== APPOINTMENTS ROUTES ====================

@api_router.get("/appointments")
async def get_appointments(
    date: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("barbershop_id"):
        return []
    
    query = {"barbershop_id": current_user["barbershop_id"]}
    if date:
        query["date"] = date
    if status:
        query["status"] = status
    
    appointments = await db.appointments.find(query, {"_id": 0}).sort("time", 1).to_list(1000)
    
    # Enrich with service and professional names
    for apt in appointments:
        service = await db.services.find_one({"service_id": apt["service_id"]}, {"_id": 0})
        if service:
            apt["service_name"] = service["name"]
            apt["service_duration"] = service["duration"]
            apt["service_price"] = service["price"]
        
        if apt.get("professional_id"):
            prof = await db.professionals.find_one({"professional_id": apt["professional_id"]}, {"_id": 0})
            if prof:
                apt["professional_name"] = prof["name"]
    
    return appointments

@api_router.get("/appointments/client")
async def get_client_appointments(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "client":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    appointments = await db.appointments.find(
        {"client_id": current_user["user_id"]},
        {"_id": 0}
    ).sort([("date", -1), ("time", -1)]).to_list(100)
    
    # Enrich with barbershop and service info
    for apt in appointments:
        barbershop = await db.barbershops.find_one({"barbershop_id": apt["barbershop_id"]}, {"_id": 0})
        if barbershop:
            apt["barbershop_name"] = barbershop["name"]
            apt["barbershop_slug"] = barbershop["slug"]
        
        service = await db.services.find_one({"service_id": apt["service_id"]}, {"_id": 0})
        if service:
            apt["service_name"] = service["name"]
    
    return appointments

@api_router.get("/appointments/availability/{barbershop_id}")
async def get_availability(
    barbershop_id: str,
    date: str,
    service_id: str,
    professional_id: Optional[str] = None
):
    # Get service duration
    service = await db.services.find_one({"service_id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    duration = service["duration"]
    
    # Get business hours for the day
    date_obj = datetime.strptime(date, "%Y-%m-%d")
    day_of_week = date_obj.weekday()
    
    business_hours = await db.business_hours.find_one(
        {"barbershop_id": barbershop_id, "day_of_week": day_of_week},
        {"_id": 0}
    )
    
    if not business_hours or business_hours.get("is_closed"):
        return {"available_slots": [], "message": "Fechado neste dia"}
    
    # Get existing appointments for the day
    query = {"barbershop_id": barbershop_id, "date": date, "status": {"$ne": "cancelled"}}
    if professional_id:
        query["professional_id"] = professional_id
    
    appointments = await db.appointments.find(query, {"_id": 0}).to_list(100)
    
    # Get time blocks
    block_query = {"barbershop_id": barbershop_id, "date": date}
    if professional_id:
        block_query["$or"] = [{"professional_id": professional_id}, {"professional_id": None}]
    
    blocks = await db.time_blocks.find(block_query, {"_id": 0}).to_list(100)
    
    # Generate available slots
    start_time = business_hours["start_time"]
    end_time = business_hours["end_time"]
    
    start_minutes = int(start_time.split(":")[0]) * 60 + int(start_time.split(":")[1])
    end_minutes = int(end_time.split(":")[0]) * 60 + int(end_time.split(":")[1])
    
    # Check if date is today and filter past times
    today = datetime.now(timezone.utc).date()
    is_today = date_obj.date() == today
    current_minutes = 0
    if is_today:
        now = datetime.now(timezone.utc)
        current_minutes = now.hour * 60 + now.minute + 30  # Add 30 min buffer
    
    available_slots = []
    slot_interval = 30  # 30 minute intervals
    
    current_slot = start_minutes
    while current_slot + duration <= end_minutes:
        slot_time = f"{current_slot // 60:02d}:{current_slot % 60:02d}"
        slot_end = current_slot + duration
        slot_end_time = f"{slot_end // 60:02d}:{slot_end % 60:02d}"
        
        # Skip if in the past
        if is_today and current_slot < current_minutes:
            current_slot += slot_interval
            continue
        
        # Check conflicts with appointments
        is_available = True
        for apt in appointments:
            apt_start = int(apt["time"].split(":")[0]) * 60 + int(apt["time"].split(":")[1])
            apt_end = int(apt["end_time"].split(":")[0]) * 60 + int(apt["end_time"].split(":")[1])
            
            if not (slot_end <= apt_start or current_slot >= apt_end):
                is_available = False
                break
        
        # Check conflicts with blocks
        if is_available:
            for block in blocks:
                block_start = int(block["start_time"].split(":")[0]) * 60 + int(block["start_time"].split(":")[1])
                block_end = int(block["end_time"].split(":")[0]) * 60 + int(block["end_time"].split(":")[1])
                
                if not (slot_end <= block_start or current_slot >= block_end):
                    is_available = False
                    break
        
        if is_available:
            available_slots.append({
                "time": slot_time,
                "end_time": slot_end_time
            })
        
        current_slot += slot_interval
    
    return {"available_slots": available_slots}

@api_router.post("/appointments")
async def create_appointment(data: AppointmentCreate, current_user: dict = Depends(get_optional_user)):
    # Get service
    service = await db.services.find_one({"service_id": data.service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    # Calculate end time
    end_time = calculate_end_time(data.time, service["duration"])
    
    # Check availability
    availability = await get_availability(
        data.barbershop_id, data.date, data.service_id, data.professional_id
    )
    
    slot_available = any(slot["time"] == data.time for slot in availability["available_slots"])
    if not slot_available:
        raise HTTPException(status_code=400, detail="Horário não disponível")
    
    appointment_id = generate_id("apt")
    apt_doc = {
        "appointment_id": appointment_id,
        "barbershop_id": data.barbershop_id,
        "service_id": data.service_id,
        "professional_id": data.professional_id,
        "client_id": current_user["user_id"] if current_user else None,
        "date": data.date,
        "time": data.time,
        "end_time": end_time,
        "client_name": data.client_name,
        "client_phone": data.client_phone,
        "client_email": data.client_email,
        "notes": data.notes,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.appointments.insert_one(apt_doc)
    
    # Send email notification
    barbershop = await db.barbershops.find_one({"barbershop_id": data.barbershop_id}, {"_id": 0})
    if data.client_email and barbershop:
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #F59E0B;">Agendamento Confirmado!</h2>
            <p>Olá {data.client_name},</p>
            <p>Seu agendamento na <strong>{barbershop['name']}</strong> foi realizado com sucesso!</p>
            <div style="background: #18181B; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #fff; margin: 5px 0;"><strong>Serviço:</strong> {service['name']}</p>
                <p style="color: #fff; margin: 5px 0;"><strong>Data:</strong> {data.date}</p>
                <p style="color: #fff; margin: 5px 0;"><strong>Horário:</strong> {data.time}</p>
                <p style="color: #fff; margin: 5px 0;"><strong>Valor:</strong> R$ {service['price']:.2f}</p>
            </div>
            <p style="color: #666;">Obrigado por escolher a {barbershop['name']}!</p>
        </div>
        """
        await send_email_notification(
            data.client_email,
            f"Agendamento confirmado - {barbershop['name']}",
            html_content
        )
    
    return {k: v for k, v in apt_doc.items() if k != "_id"}

@api_router.put("/appointments/{appointment_id}")
async def update_appointment(
    appointment_id: str,
    data: AppointmentUpdate,
    current_user: dict = Depends(get_current_user)
):
    apt = await db.appointments.find_one({"appointment_id": appointment_id}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    
    # Check permissions
    is_owner = current_user.get("barbershop_id") == apt["barbershop_id"]
    is_client = current_user["user_id"] == apt.get("client_id")
    
    if not is_owner and not is_client:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    update_data = {}
    if data.status:
        update_data["status"] = data.status
    if data.date:
        update_data["date"] = data.date
    if data.time:
        service = await db.services.find_one({"service_id": apt["service_id"]}, {"_id": 0})
        update_data["time"] = data.time
        update_data["end_time"] = calculate_end_time(data.time, service["duration"])
    if data.notes is not None:
        update_data["notes"] = data.notes
    
    if update_data:
        await db.appointments.update_one(
            {"appointment_id": appointment_id},
            {"$set": update_data}
        )
    
    updated = await db.appointments.find_one({"appointment_id": appointment_id}, {"_id": 0})
    
    # Send email on status change
    if data.status and apt.get("client_email"):
        barbershop = await db.barbershops.find_one({"barbershop_id": apt["barbershop_id"]}, {"_id": 0})
        status_text = {
            "confirmed": "confirmado",
            "cancelled": "cancelado",
            "completed": "concluído"
        }.get(data.status, data.status)
        
        if barbershop:
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #F59E0B;">Atualização do Agendamento</h2>
                <p>Olá {apt['client_name']},</p>
                <p>Seu agendamento na <strong>{barbershop['name']}</strong> foi <strong>{status_text}</strong>.</p>
                <div style="background: #18181B; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: #fff; margin: 5px 0;"><strong>Data:</strong> {apt['date']}</p>
                    <p style="color: #fff; margin: 5px 0;"><strong>Horário:</strong> {apt['time']}</p>
                </div>
            </div>
            """
            await send_email_notification(
                apt["client_email"],
                f"Agendamento {status_text} - {barbershop['name']}",
                html_content
            )
    
    return updated

@api_router.delete("/appointments/{appointment_id}")
async def cancel_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    apt = await db.appointments.find_one({"appointment_id": appointment_id}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    
    is_owner = current_user.get("barbershop_id") == apt["barbershop_id"]
    is_client = current_user["user_id"] == apt.get("client_id")
    
    if not is_owner and not is_client:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    await db.appointments.update_one(
        {"appointment_id": appointment_id},
        {"$set": {"status": "cancelled"}}
    )
    
    return {"message": "Agendamento cancelado com sucesso"}


# ==================== DASHBOARD STATS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    if not current_user.get("barbershop_id"):
        return {}
    
    barbershop_id = current_user["barbershop_id"]
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Today's appointments
    today_appointments = await db.appointments.count_documents({
        "barbershop_id": barbershop_id,
        "date": today,
        "status": {"$ne": "cancelled"}
    })
    
    # Pending appointments
    pending = await db.appointments.count_documents({
        "barbershop_id": barbershop_id,
        "status": "pending"
    })
    
    # This week revenue (completed appointments)
    week_start = (datetime.now(timezone.utc) - timedelta(days=datetime.now(timezone.utc).weekday())).strftime("%Y-%m-%d")
    completed_this_week = await db.appointments.find({
        "barbershop_id": barbershop_id,
        "date": {"$gte": week_start},
        "status": "completed"
    }, {"_id": 0}).to_list(1000)
    
    week_revenue = 0
    for apt in completed_this_week:
        service = await db.services.find_one({"service_id": apt["service_id"]}, {"_id": 0})
        if service:
            week_revenue += service["price"]
    
    # Total clients
    total_clients = len(set([
        apt["client_phone"] 
        async for apt in db.appointments.find({"barbershop_id": barbershop_id}, {"client_phone": 1})
    ]))
    
    return {
        "today_appointments": today_appointments,
        "pending_appointments": pending,
        "week_revenue": week_revenue,
        "total_clients": total_clients
    }


# ==================== MAIN APP SETUP ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
