from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request, BackgroundTasks
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
from twilio.rest import Client as TwilioClient
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'barberhub-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168  # 7 days

# Resend Config
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

# Mercado Pago Config
MERCADOPAGO_ACCESS_TOKEN = os.environ.get('MERCADOPAGO_ACCESS_TOKEN', '')

# WhatsApp Config - Support both Twilio and Evolution API
WHATSAPP_PROVIDER = os.environ.get('WHATSAPP_PROVIDER', 'twilio')  # 'twilio' or 'evolution'

# Twilio Config (WhatsApp Sandbox/Business)
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_WHATSAPP_NUMBER = os.environ.get('TWILIO_WHATSAPP_NUMBER', 'whatsapp:+14155238886')

# Evolution API Config (Production WhatsApp)
EVOLUTION_API_URL = os.environ.get('EVOLUTION_API_URL', '')  # Ex: https://your-evolution-api.com
EVOLUTION_API_KEY = os.environ.get('EVOLUTION_API_KEY', '')
EVOLUTION_INSTANCE = os.environ.get('EVOLUTION_INSTANCE', 'barberhub')  # Instance name

# Initialize Twilio client
twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# Initialize scheduler for background jobs
scheduler = AsyncIOScheduler()

# Create the main app
app = FastAPI(title="BarberHub API")

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


# ==================== SUBSCRIPTION PLANS ====================
SUBSCRIPTION_PLANS = {
    "comum": {
        "plan_id": "comum",
        "name": "Plano Comum",
        "price": 49.90,
        "features": [
            "Criação automática da barbearia",
            "Agendamentos online ilimitados",
            "Agenda digital organizada",
            "Cadastro de serviços",
            "Cadastro de profissionais",
            "Configuração de horários",
            "Link público para clientes",
            "Confirmação automática de agendamentos",
            "Acesso pelo celular ou computador"
        ]
    },
    "premium": {
        "plan_id": "premium",
        "name": "Plano Premium",
        "price": 99.90,
        "features": [
            "Tudo do Plano Comum +",
            "Relatórios de faturamento",
            "Lucro por profissional",
            "Lucro por horário de atendimento",
            "Estatísticas de horários mais vendidos",
            "Histórico financeiro da barbearia",
            "Gestão avançada de clientes",
            "Criação de planos/mensalidades para clientes",
            "Controle de clientes recorrentes",
            "Prioridade em novas funcionalidades"
        ]
    }
}


# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
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
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class BarbershopUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    primary_color: Optional[str] = None
    background_color: Optional[str] = None

class Barbershop(BaseModel):
    barbershop_id: str
    owner_id: str
    name: str
    slug: str
    description: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    primary_color: str = "#F59E0B"
    background_color: str = "#09090B"
    plan: str = "comum"
    plan_status: str = "pending"  # pending, active, expired, cancelled
    plan_expires_at: Optional[datetime] = None
    created_at: datetime

class ServiceCreate(BaseModel):
    name: str
    duration: int
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
    day_of_week: int
    start_time: str
    end_time: str
    is_closed: bool = False

class BusinessHours(BaseModel):
    barbershop_id: str
    day_of_week: int
    start_time: str
    end_time: str
    is_closed: bool = False

class TimeBlockCreate(BaseModel):
    date: str
    start_time: str
    end_time: str
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
    date: str
    time: str
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
    status: str = "pending"
    reminder_sent: bool = False
    created_at: datetime

class AppointmentUpdate(BaseModel):
    status: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    notes: Optional[str] = None

class SubscriptionPayment(BaseModel):
    plan_id: str
    payment_method: str
    customer_name: str
    customer_email: str
    customer_document: str


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

def format_phone_for_whatsapp(phone: str) -> str:
    """Format phone number for WhatsApp (E.164 format)"""
    # Remove all non-digits
    digits = ''.join(filter(str.isdigit, phone))
    # Add Brazil country code if not present
    if len(digits) == 11:  # Brazilian mobile with DDD
        digits = '55' + digits
    elif len(digits) == 10:  # Brazilian landline with DDD
        digits = '55' + digits
    return f"whatsapp:+{digits}"

async def send_whatsapp_message(phone: str, message: str):
    """Send WhatsApp message via configured provider (Twilio or Evolution API)"""
    to_number = format_phone_for_whatsapp(phone)
    
    # Try Evolution API first if configured
    if EVOLUTION_API_URL and EVOLUTION_API_KEY:
        try:
            # Format phone for Evolution API (just numbers with country code)
            evolution_phone = to_number.replace("whatsapp:", "").replace("+", "")
            
            async with httpx.AsyncClient() as http_client:
                response = await http_client.post(
                    f"{EVOLUTION_API_URL}/message/sendText/{EVOLUTION_INSTANCE}",
                    json={
                        "number": evolution_phone,
                        "text": message
                    },
                    headers={
                        "apikey": EVOLUTION_API_KEY,
                        "Content-Type": "application/json"
                    },
                    timeout=30
                )
                
                if response.status_code == 200 or response.status_code == 201:
                    result = response.json()
                    logger.info(f"Evolution API WhatsApp sent to {phone}: {result.get('key', {}).get('id', 'sent')}")
                    return result.get('key', {}).get('id', 'evolution_sent')
                else:
                    logger.error(f"Evolution API error: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"Evolution API failed: {str(e)}")
    
    # Fallback to Twilio if Evolution fails or not configured
    if twilio_client:
        try:
            twilio_message = twilio_client.messages.create(
                body=message,
                from_=TWILIO_WHATSAPP_NUMBER,
                to=to_number
            )
            logger.info(f"Twilio WhatsApp sent to {phone}: {twilio_message.sid}")
            return twilio_message.sid
        except Exception as e:
            logger.error(f"Twilio failed: {str(e)}")
    
    logger.warning("No WhatsApp provider configured or all providers failed")
    return None

async def send_whatsapp_reminder(phone: str, barbershop_name: str, service_name: str, 
                                  date: str, time: str, address: str = None):
    """Send WhatsApp reminder"""
    # Format message
    message_body = f"""🔔 *Lembrete de Agendamento*

Olá! Seu horário está chegando:

📍 *{barbershop_name}*
✂️ Serviço: {service_name}
📅 Data: {date}
⏰ Horário: {time}"""
    
    if address:
        message_body += f"\n📌 Endereço: {address}"
    
    message_body += "\n\nTe esperamos! 💈"
    
    return await send_whatsapp_message(phone, message_body)

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

async def check_and_send_reminders():
    """Background task to send reminders 30 minutes before appointments"""
    try:
        now = datetime.now(timezone.utc)
        # Check appointments in a 5-minute window around the 30-minute mark
        # This ensures we don't miss appointments due to timing issues
        reminder_start = now + timedelta(minutes=28)
        reminder_end = now + timedelta(minutes=32)
        
        today = now.strftime("%Y-%m-%d")
        start_time = reminder_start.strftime("%H:%M")
        end_time = reminder_end.strftime("%H:%M")
        
        logger.info(f"Checking for reminders: date={today}, time_window={start_time}-{end_time}")
        
        # Find appointments that need reminders
        appointments = await db.appointments.find({
            "date": today,
            "time": {"$gte": start_time, "$lte": end_time},
            "status": {"$in": ["pending", "confirmed"]},
            "reminder_sent": {"$ne": True}
        }, {"_id": 0}).to_list(100)
        
        logger.info(f"Found {len(appointments)} appointments needing reminders")
        
        for apt in appointments:
            barbershop = await db.barbershops.find_one(
                {"barbershop_id": apt["barbershop_id"]},
                {"_id": 0}
            )
            service = await db.services.find_one(
                {"service_id": apt["service_id"]},
                {"_id": 0}
            )
            
            if barbershop and service:
                # Send WhatsApp reminder
                result = await send_whatsapp_reminder(
                    phone=apt["client_phone"],
                    barbershop_name=barbershop["name"],
                    service_name=service["name"],
                    date=apt["date"],
                    time=apt["time"],
                    address=barbershop.get("address")
                )
                
                if result:
                    # Mark as sent only if successful
                    await db.appointments.update_one(
                        {"appointment_id": apt["appointment_id"]},
                        {"$set": {"reminder_sent": True, "reminder_sent_at": now.isoformat()}}
                    )
                    logger.info(f"Reminder sent for appointment {apt['appointment_id']}")
    except Exception as e:
        logger.error(f"Error in check_and_send_reminders: {str(e)}")

async def check_expired_subscriptions():
    """Background task to check and mark expired subscriptions"""
    now = datetime.now(timezone.utc)
    
    # Find active subscriptions that have expired
    expired = await db.barbershops.find({
        "plan_status": "active",
        "plan_expires_at": {"$lt": now.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    for barbershop in expired:
        await db.barbershops.update_one(
            {"barbershop_id": barbershop["barbershop_id"]},
            {"$set": {"plan_status": "expired"}}
        )
        logger.info(f"Subscription expired for barbershop: {barbershop['barbershop_id']}")


# ==================== ROOT ROUTE ====================

@api_router.get("/")
async def root():
    return {"message": "BarberHub API", "status": "ok"}


# ==================== BACKGROUND TASKS ====================

@api_router.post("/tasks/send-reminders")
async def trigger_reminders(background_tasks: BackgroundTasks):
    """Endpoint to trigger reminder sending (call this via cron job)"""
    background_tasks.add_task(check_and_send_reminders)
    return {"status": "Reminders check scheduled"}

@api_router.post("/tasks/check-subscriptions")
async def trigger_subscription_check(background_tasks: BackgroundTasks):
    """Endpoint to check expired subscriptions (call this via cron job)"""
    background_tasks.add_task(check_expired_subscriptions)
    return {"status": "Subscription check scheduled"}

@api_router.post("/tasks/test-whatsapp")
async def test_whatsapp_notification(phone: str):
    """Test WhatsApp notification - for debugging"""
    if not twilio_client and not (EVOLUTION_API_URL and EVOLUTION_API_KEY):
        return {"success": False, "error": "No WhatsApp provider configured (Twilio or Evolution API)"}
    
    try:
        result = await send_whatsapp_reminder(
            phone=phone,
            barbershop_name="BarberHub Teste",
            service_name="Corte de Cabelo",
            date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            time="15:00",
            address="Rua Teste, 123"
        )
        return {"success": True, "message_sid": result}
    except Exception as e:
        return {"success": False, "error": str(e)}

@api_router.get("/tasks/scheduler-status")
async def get_scheduler_status():
    """Get scheduler status and next run times"""
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None
        })
    return {
        "running": scheduler.running,
        "jobs": jobs,
        "twilio_configured": twilio_client is not None,
        "evolution_api_configured": bool(EVOLUTION_API_URL and EVOLUTION_API_KEY),
        "whatsapp_provider": WHATSAPP_PROVIDER,
        "mercadopago_configured": bool(MERCADOPAGO_ACCESS_TOKEN)
    }


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
    
    # DON'T create barbershop here - user needs to pay first
    token = create_jwt_token(user_id, user_data.email, user_data.role)
    
    return {
        "token": token,
        "user": {k: v for k, v in user_doc.items() if k not in ["_id", "password"]},
        "barbershop": None,
        "needs_payment": True
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    token = create_jwt_token(user["user_id"], user["email"], user["role"])
    
    # Check if user needs to complete payment
    needs_payment = user["role"] == "barber" and not user.get("barbershop_id")
    
    return {
        "token": token,
        "user": {k: v for k, v in user.items() if k != "password"},
        "needs_payment": needs_payment
    }

@api_router.post("/auth/client/register")
async def register_client(client_data: ClientRegister):
    existing = await db.users.find_one({"phone": client_data.phone, "role": "client"}, {"_id": 0})
    if existing:
        if client_data.password:
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
    
    user = await db.users.find_one({"email": google_data["email"]}, {"_id": 0})
    
    if not user:
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
        if google_data.get("picture") and user.get("picture") != google_data["picture"]:
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"picture": google_data["picture"]}}
            )
            user["picture"] = google_data["picture"]
    
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
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    needs_payment = user["role"] == "barber" and not user.get("barbershop_id")
    
    return {
        "user": {k: v for k, v in user.items() if k not in ["_id", "password"]},
        "token": create_jwt_token(user_id, user["email"], user["role"]),
        "needs_payment": needs_payment
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {k: v for k, v in current_user.items() if k != "password"}

@api_router.post("/auth/logout")
async def logout(response: Response, current_user: dict = Depends(get_current_user)):
    await db.user_sessions.delete_one({"user_id": current_user["user_id"]})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logout realizado com sucesso"}


# ==================== SUBSCRIPTION PLANS ROUTES ====================

@api_router.get("/plans")
async def get_plans():
    return list(SUBSCRIPTION_PLANS.values())

@api_router.post("/subscription/create")
async def create_subscription(data: SubscriptionPayment, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "barber":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    plan = SUBSCRIPTION_PLANS.get(data.plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Plano não encontrado")
    
    # Check if user already has an ACTIVE barbershop subscription
    if current_user.get("barbershop_id"):
        barbershop = await db.barbershops.find_one(
            {"barbershop_id": current_user["barbershop_id"]},
            {"_id": 0}
        )
        if barbershop and barbershop.get("plan_status") == "active":
            # Update existing active subscription (renewal)
            expires_at = datetime.now(timezone.utc) + timedelta(days=30)
            await db.barbershops.update_one(
                {"barbershop_id": current_user["barbershop_id"]},
                {"$set": {
                    "plan": data.plan_id,
                    "plan_status": "active",
                    "plan_expires_at": expires_at.isoformat()
                }}
            )
            return {
                "success": True,
                "message": "Assinatura renovada com sucesso!",
                "plan": plan,
                "expires_at": expires_at.isoformat()
            }
    
    # Create payment preference with Mercado Pago for new subscriptions or pending ones
    if not MERCADOPAGO_ACCESS_TOKEN:
        # Demo mode - simulate payment success
        return {
            "success": True,
            "demo_mode": True,
            "message": "Modo demonstração - configure MERCADOPAGO_ACCESS_TOKEN para pagamentos reais",
            "plan": plan
        }
    
    # Real Mercado Pago integration
    try:
        preference_data = {
            "items": [{
                "id": data.plan_id,
                "title": plan["name"],
                "description": f"Assinatura mensal - {plan['name']}",
                "currency_id": "BRL",
                "quantity": 1,
                "unit_price": plan["price"]
            }],
            "payer": {
                "email": data.customer_email,
                "name": data.customer_name,
                "identification": {
                    "type": "CPF",
                    "number": data.customer_document
                }
            },
            "back_urls": {
                "success": f"{os.environ.get('FRONTEND_URL', '')}/pagamento/sucesso",
                "failure": f"{os.environ.get('FRONTEND_URL', '')}/pagamento/erro",
                "pending": f"{os.environ.get('FRONTEND_URL', '')}/pagamento/pendente"
            },
            "auto_return": "approved",
            "external_reference": f"{current_user['user_id']}_{data.plan_id}_{datetime.now(timezone.utc).timestamp()}"
        }
        
        async with httpx.AsyncClient() as client_http:
            resp = await client_http.post(
                "https://api.mercadopago.com/checkout/preferences",
                json=preference_data,
                headers={
                    "Authorization": f"Bearer {MERCADOPAGO_ACCESS_TOKEN}",
                    "Content-Type": "application/json"
                }
            )
            resp.raise_for_status()
            mp_response = resp.json()
        
        return {
            "success": True,
            "payment_url": mp_response.get("init_point"),
            "preference_id": mp_response.get("id"),
            "plan": plan
        }
        
    except Exception as e:
        logger.error(f"Mercado Pago error: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao processar pagamento")

@api_router.post("/webhooks/mercadopago")
async def mercadopago_webhook(request: Request):
    """Handle Mercado Pago payment notifications"""
    try:
        data = await request.json()
        logger.info(f"Mercado Pago webhook: {data}")
        
        if data.get("type") == "payment":
            payment_id = data.get("data", {}).get("id")
            
            async with httpx.AsyncClient() as client_http:
                resp = await client_http.get(
                    f"https://api.mercadopago.com/v1/payments/{payment_id}",
                    headers={"Authorization": f"Bearer {MERCADOPAGO_ACCESS_TOKEN}"}
                )
                
                if resp.status_code == 200:
                    payment_data = resp.json()
                    external_ref = payment_data.get("external_reference", "")
                    status = payment_data.get("status")
                    
                    if status == "approved" and external_ref:
                        parts = external_ref.split("_")
                        if len(parts) >= 2:
                            user_id = parts[0]
                            plan_id = parts[1]
                            
                            # Get user
                            user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
                            if user and user.get("barbershop_id"):
                                # Activate/renew subscription
                                expires_at = datetime.now(timezone.utc) + timedelta(days=30)
                                await db.barbershops.update_one(
                                    {"barbershop_id": user["barbershop_id"]},
                                    {"$set": {
                                        "plan": plan_id,
                                        "plan_status": "active",
                                        "plan_expires_at": expires_at.isoformat()
                                    }}
                                )
                                
                                # Log payment
                                await db.payments.insert_one({
                                    "payment_id": generate_id("pay"),
                                    "barbershop_id": user["barbershop_id"],
                                    "user_id": user_id,
                                    "plan_id": plan_id,
                                    "amount": payment_data.get("transaction_amount"),
                                    "mp_payment_id": payment_id,
                                    "status": "approved",
                                    "created_at": datetime.now(timezone.utc).isoformat()
                                })
        
        return Response(status_code=200)
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return Response(status_code=200)


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
        "latitude": data.latitude,
        "longitude": data.longitude,
        "primary_color": "#F59E0B",
        "background_color": "#09090B",
        "plan": "comum",
        "plan_status": "pending",  # Pending until payment
        "plan_expires_at": None,
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

@api_router.post("/barbershops/activate")
async def activate_barbershop(plan_id: str, current_user: dict = Depends(get_current_user)):
    """Activate barbershop after payment (demo mode)"""
    if current_user["role"] != "barber" or not current_user.get("barbershop_id"):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    
    await db.barbershops.update_one(
        {"barbershop_id": current_user["barbershop_id"]},
        {"$set": {
            "plan": plan_id,
            "plan_status": "active",
            "plan_expires_at": expires_at.isoformat()
        }}
    )
    
    barbershop = await db.barbershops.find_one(
        {"barbershop_id": current_user["barbershop_id"]},
        {"_id": 0}
    )
    
    return {
        "success": True,
        "barbershop": barbershop,
        "message": "Barbearia ativada com sucesso!"
    }

@api_router.put("/barbershops")
async def update_barbershop(data: BarbershopUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "barber" or not current_user.get("barbershop_id"):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.description is not None:
        update_data["description"] = data.description
    if data.address is not None:
        update_data["address"] = data.address
    if data.phone is not None:
        update_data["phone"] = data.phone
    if data.latitude is not None:
        update_data["latitude"] = data.latitude
    if data.longitude is not None:
        update_data["longitude"] = data.longitude
    if data.primary_color is not None:
        update_data["primary_color"] = data.primary_color
    if data.background_color is not None:
        update_data["background_color"] = data.background_color
    
    if update_data:
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
    
    # Check if subscription is active
    if barbershop.get("plan_status") not in ["active", "pending"]:
        raise HTTPException(status_code=403, detail="Barbearia temporariamente indisponível")
    
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
    
    for apt in appointments:
        barbershop = await db.barbershops.find_one({"barbershop_id": apt["barbershop_id"]}, {"_id": 0})
        if barbershop:
            apt["barbershop_name"] = barbershop["name"]
            apt["barbershop_slug"] = barbershop["slug"]
            apt["barbershop_address"] = barbershop.get("address")
            apt["barbershop_latitude"] = barbershop.get("latitude")
            apt["barbershop_longitude"] = barbershop.get("longitude")
        
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
    service = await db.services.find_one({"service_id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    duration = service["duration"]
    
    date_obj = datetime.strptime(date, "%Y-%m-%d")
    day_of_week = date_obj.weekday()
    
    business_hours = await db.business_hours.find_one(
        {"barbershop_id": barbershop_id, "day_of_week": day_of_week},
        {"_id": 0}
    )
    
    if not business_hours or business_hours.get("is_closed"):
        return {"available_slots": [], "message": "Fechado neste dia"}
    
    query = {"barbershop_id": barbershop_id, "date": date, "status": {"$ne": "cancelled"}}
    if professional_id:
        query["professional_id"] = professional_id
    
    appointments = await db.appointments.find(query, {"_id": 0}).to_list(100)
    
    block_query = {"barbershop_id": barbershop_id, "date": date}
    if professional_id:
        block_query["$or"] = [{"professional_id": professional_id}, {"professional_id": None}]
    
    blocks = await db.time_blocks.find(block_query, {"_id": 0}).to_list(100)
    
    start_time = business_hours["start_time"]
    end_time = business_hours["end_time"]
    
    start_minutes = int(start_time.split(":")[0]) * 60 + int(start_time.split(":")[1])
    end_minutes = int(end_time.split(":")[0]) * 60 + int(end_time.split(":")[1])
    
    today = datetime.now(timezone.utc).date()
    is_today = date_obj.date() == today
    current_minutes = 0
    if is_today:
        now = datetime.now(timezone.utc)
        current_minutes = now.hour * 60 + now.minute + 30
    
    available_slots = []
    slot_interval = 30
    
    current_slot = start_minutes
    while current_slot + duration <= end_minutes:
        slot_time = f"{current_slot // 60:02d}:{current_slot % 60:02d}"
        slot_end = current_slot + duration
        slot_end_time = f"{slot_end // 60:02d}:{slot_end % 60:02d}"
        
        if is_today and current_slot < current_minutes:
            current_slot += slot_interval
            continue
        
        is_available = True
        for apt in appointments:
            apt_start = int(apt["time"].split(":")[0]) * 60 + int(apt["time"].split(":")[1])
            apt_end = int(apt["end_time"].split(":")[0]) * 60 + int(apt["end_time"].split(":")[1])
            
            if not (slot_end <= apt_start or current_slot >= apt_end):
                is_available = False
                break
        
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
    service = await db.services.find_one({"service_id": data.service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    end_time = calculate_end_time(data.time, service["duration"])
    
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
        "reminder_sent": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.appointments.insert_one(apt_doc)
    
    # Get barbershop for response and notifications
    barbershop = await db.barbershops.find_one({"barbershop_id": data.barbershop_id}, {"_id": 0})
    
    # Send email notification
    if data.client_email and barbershop:
        address_html = ""
        if barbershop.get("address"):
            address_html = f'<p style="color: #fff; margin: 5px 0;"><strong>Endereço:</strong> {barbershop["address"]}</p>'
            if barbershop.get("latitude") and barbershop.get("longitude"):
                maps_url = f"https://www.google.com/maps?q={barbershop['latitude']},{barbershop['longitude']}"
                address_html += f'<p style="margin: 5px 0;"><a href="{maps_url}" style="color: #F59E0B;">Ver no Google Maps</a></p>'
        
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
                {address_html}
            </div>
            <p style="color: #666;">Obrigado por escolher a {barbershop['name']}!</p>
            <p style="color: #666; font-size: 12px;">Você receberá um lembrete por WhatsApp 30 minutos antes do seu horário.</p>
        </div>
        """
        await send_email_notification(
            data.client_email,
            f"Agendamento confirmado - {barbershop['name']}",
            html_content
        )
    
    # Return appointment with barbershop location
    apt_response = {k: v for k, v in apt_doc.items() if k != "_id"}
    if barbershop:
        apt_response["barbershop_name"] = barbershop["name"]
        apt_response["barbershop_address"] = barbershop.get("address")
        apt_response["barbershop_latitude"] = barbershop.get("latitude")
        apt_response["barbershop_longitude"] = barbershop.get("longitude")
        apt_response["barbershop_phone"] = barbershop.get("phone")
    
    return apt_response

@api_router.put("/appointments/{appointment_id}")
async def update_appointment(
    appointment_id: str,
    data: AppointmentUpdate,
    current_user: dict = Depends(get_current_user)
):
    apt = await db.appointments.find_one({"appointment_id": appointment_id}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    
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
    
    today_appointments = await db.appointments.count_documents({
        "barbershop_id": barbershop_id,
        "date": today,
        "status": {"$ne": "cancelled"}
    })
    
    pending = await db.appointments.count_documents({
        "barbershop_id": barbershop_id,
        "status": "pending"
    })
    
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


# ==================== REPORTS (PREMIUM) ====================

@api_router.get("/reports/revenue")
async def get_revenue_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("barbershop_id"):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    barbershop = await db.barbershops.find_one(
        {"barbershop_id": current_user["barbershop_id"]},
        {"_id": 0}
    )
    
    if barbershop.get("plan") != "premium":
        raise HTTPException(status_code=403, detail="Recurso disponível apenas no plano Premium")
    
    barbershop_id = current_user["barbershop_id"]
    
    if not end_date:
        end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not start_date:
        start_date = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    
    appointments = await db.appointments.find({
        "barbershop_id": barbershop_id,
        "date": {"$gte": start_date, "$lte": end_date},
        "status": "completed"
    }, {"_id": 0}).to_list(1000)
    
    total_revenue = 0
    revenue_by_service = {}
    revenue_by_professional = {}
    revenue_by_hour = {}
    
    for apt in appointments:
        service = await db.services.find_one({"service_id": apt["service_id"]}, {"_id": 0})
        if service:
            price = service["price"]
            total_revenue += price
            
            service_name = service["name"]
            if service_name not in revenue_by_service:
                revenue_by_service[service_name] = {"count": 0, "revenue": 0}
            revenue_by_service[service_name]["count"] += 1
            revenue_by_service[service_name]["revenue"] += price
            
            if apt.get("professional_id"):
                prof = await db.professionals.find_one({"professional_id": apt["professional_id"]}, {"_id": 0})
                if prof:
                    prof_name = prof["name"]
                    if prof_name not in revenue_by_professional:
                        revenue_by_professional[prof_name] = {"count": 0, "revenue": 0}
                    revenue_by_professional[prof_name]["count"] += 1
                    revenue_by_professional[prof_name]["revenue"] += price
            
            hour = apt["time"].split(":")[0]
            if hour not in revenue_by_hour:
                revenue_by_hour[hour] = {"count": 0, "revenue": 0}
            revenue_by_hour[hour]["count"] += 1
            revenue_by_hour[hour]["revenue"] += price
    
    return {
        "period": {"start": start_date, "end": end_date},
        "total_revenue": total_revenue,
        "total_appointments": len(appointments),
        "by_service": revenue_by_service,
        "by_professional": revenue_by_professional,
        "by_hour": revenue_by_hour
    }

@api_router.get("/reports/daily")
async def get_daily_report(
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get daily report - available for all plans"""
    if not current_user.get("barbershop_id"):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    barbershop_id = current_user["barbershop_id"]
    
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    appointments = await db.appointments.find({
        "barbershop_id": barbershop_id,
        "date": date
    }, {"_id": 0}).to_list(100)
    
    total = len(appointments)
    completed = len([a for a in appointments if a["status"] == "completed"])
    cancelled = len([a for a in appointments if a["status"] == "cancelled"])
    pending = len([a for a in appointments if a["status"] in ["pending", "confirmed"]])
    
    revenue = 0
    for apt in [a for a in appointments if a["status"] == "completed"]:
        service = await db.services.find_one({"service_id": apt["service_id"]}, {"_id": 0})
        if service:
            revenue += service["price"]
    
    return {
        "date": date,
        "total_appointments": total,
        "completed": completed,
        "cancelled": cancelled,
        "pending": pending,
        "revenue": revenue
    }

@api_router.get("/reports/weekly")
async def get_weekly_report(current_user: dict = Depends(get_current_user)):
    """Get weekly report with daily breakdown - Premium only"""
    if not current_user.get("barbershop_id"):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    barbershop = await db.barbershops.find_one(
        {"barbershop_id": current_user["barbershop_id"]},
        {"_id": 0}
    )
    
    if barbershop.get("plan") != "premium":
        raise HTTPException(status_code=403, detail="Recurso disponível apenas no plano Premium")
    
    barbershop_id = current_user["barbershop_id"]
    today = datetime.now(timezone.utc)
    
    # Get last 7 days
    daily_data = []
    total_revenue = 0
    total_appointments = 0
    
    for i in range(7):
        date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        appointments = await db.appointments.find({
            "barbershop_id": barbershop_id,
            "date": date,
            "status": "completed"
        }, {"_id": 0}).to_list(100)
        
        day_revenue = 0
        for apt in appointments:
            service = await db.services.find_one({"service_id": apt["service_id"]}, {"_id": 0})
            if service:
                day_revenue += service["price"]
        
        daily_data.append({
            "date": date,
            "appointments": len(appointments),
            "revenue": day_revenue
        })
        
        total_revenue += day_revenue
        total_appointments += len(appointments)
    
    return {
        "period": "last_7_days",
        "total_revenue": total_revenue,
        "total_appointments": total_appointments,
        "average_daily_revenue": total_revenue / 7,
        "daily_breakdown": list(reversed(daily_data))
    }

@api_router.get("/reports/clients")
async def get_clients_report(current_user: dict = Depends(get_current_user)):
    """Get clients report - Premium only"""
    if not current_user.get("barbershop_id"):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    barbershop = await db.barbershops.find_one(
        {"barbershop_id": current_user["barbershop_id"]},
        {"_id": 0}
    )
    
    if barbershop.get("plan") != "premium":
        raise HTTPException(status_code=403, detail="Recurso disponível apenas no plano Premium")
    
    barbershop_id = current_user["barbershop_id"]
    
    # Get all appointments grouped by client
    pipeline = [
        {"$match": {"barbershop_id": barbershop_id, "status": "completed"}},
        {"$group": {
            "_id": "$client_phone",
            "client_name": {"$last": "$client_name"},
            "total_visits": {"$sum": 1},
            "last_visit": {"$max": "$date"}
        }},
        {"$sort": {"total_visits": -1}},
        {"$limit": 50}
    ]
    
    clients = await db.appointments.aggregate(pipeline).to_list(50)
    
    # Calculate total revenue per client
    for client in clients:
        client_appointments = await db.appointments.find({
            "barbershop_id": barbershop_id,
            "client_phone": client["_id"],
            "status": "completed"
        }, {"_id": 0}).to_list(100)
        
        total_spent = 0
        for apt in client_appointments:
            service = await db.services.find_one({"service_id": apt["service_id"]}, {"_id": 0})
            if service:
                total_spent += service["price"]
        
        client["total_spent"] = total_spent
        client["phone"] = client.pop("_id")
    
    return {
        "total_unique_clients": len(clients),
        "top_clients": clients
    }


# ==================== RECURRING BILLING ====================

async def process_recurring_billing():
    """Process recurring billing for expiring subscriptions"""
    try:
        now = datetime.now(timezone.utc)
        # Find subscriptions expiring in the next 3 days
        expiring_soon = now + timedelta(days=3)
        
        barbershops = await db.barbershops.find({
            "plan_status": "active",
            "plan_expires_at": {"$lte": expiring_soon.isoformat(), "$gt": now.isoformat()}
        }, {"_id": 0}).to_list(100)
        
        logger.info(f"Found {len(barbershops)} subscriptions expiring soon")
        
        for barbershop in barbershops:
            # Check if we already sent a renewal reminder
            reminder_sent = await db.billing_reminders.find_one({
                "barbershop_id": barbershop["barbershop_id"],
                "expires_at": barbershop["plan_expires_at"]
            })
            
            if not reminder_sent:
                # Get owner info
                owner = await db.users.find_one({"barbershop_id": barbershop["barbershop_id"]}, {"_id": 0})
                
                if owner and twilio_client:
                    # Send WhatsApp reminder about renewal
                    plan = SUBSCRIPTION_PLANS.get(barbershop.get("plan", "comum"))
                    try:
                        to_number = format_phone_for_whatsapp(owner.get("phone", ""))
                        if to_number and len(to_number) > 15:
                            message = twilio_client.messages.create(
                                body=f"""⚠️ *Lembrete de Renovação*

Olá! Sua assinatura do BarberHub ({plan['name']}) expira em breve.

💰 Valor: R$ {plan['price']:.2f}/mês

Para continuar recebendo agendamentos, renove sua assinatura acessando o painel.

Obrigado por usar o BarberHub! 💈""",
                                from_=TWILIO_WHATSAPP_NUMBER,
                                to=to_number
                            )
                            logger.info(f"Renewal reminder sent to {barbershop['barbershop_id']}: {message.sid}")
                    except Exception as e:
                        logger.error(f"Failed to send renewal reminder: {str(e)}")
                
                # Mark reminder as sent
                await db.billing_reminders.insert_one({
                    "barbershop_id": barbershop["barbershop_id"],
                    "expires_at": barbershop["plan_expires_at"],
                    "sent_at": now.isoformat()
                })
    except Exception as e:
        logger.error(f"Error in process_recurring_billing: {str(e)}")

@api_router.post("/subscription/renew")
async def renew_subscription(current_user: dict = Depends(get_current_user)):
    """Create a renewal payment for existing subscription"""
    if current_user["role"] != "barber" or not current_user.get("barbershop_id"):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    barbershop = await db.barbershops.find_one(
        {"barbershop_id": current_user["barbershop_id"]},
        {"_id": 0}
    )
    
    if not barbershop:
        raise HTTPException(status_code=404, detail="Barbearia não encontrada")
    
    plan_id = barbershop.get("plan", "comum")
    plan = SUBSCRIPTION_PLANS.get(plan_id)
    
    if not MERCADOPAGO_ACCESS_TOKEN:
        # Demo mode - just extend subscription
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        await db.barbershops.update_one(
            {"barbershop_id": current_user["barbershop_id"]},
            {"$set": {
                "plan_status": "active",
                "plan_expires_at": expires_at.isoformat()
            }}
        )
        return {
            "success": True,
            "demo_mode": True,
            "message": "Assinatura renovada (modo demo)",
            "expires_at": expires_at.isoformat()
        }
    
    # Create Mercado Pago payment for renewal
    try:
        preference_data = {
            "items": [{
                "id": f"renewal_{plan_id}",
                "title": f"Renovação - {plan['name']}",
                "description": f"Renovação mensal - {plan['name']}",
                "currency_id": "BRL",
                "quantity": 1,
                "unit_price": plan["price"]
            }],
            "payer": {
                "email": current_user.get("email", "")
            },
            "back_urls": {
                "success": f"{os.environ.get('FRONTEND_URL', '')}/pagamento/sucesso",
                "failure": f"{os.environ.get('FRONTEND_URL', '')}/pagamento/erro",
                "pending": f"{os.environ.get('FRONTEND_URL', '')}/pagamento/pendente"
            },
            "auto_return": "approved",
            "external_reference": f"{current_user['user_id']}_{plan_id}_renewal_{datetime.now(timezone.utc).timestamp()}"
        }
        
        async with httpx.AsyncClient() as client_http:
            resp = await client_http.post(
                "https://api.mercadopago.com/checkout/preferences",
                json=preference_data,
                headers={
                    "Authorization": f"Bearer {MERCADOPAGO_ACCESS_TOKEN}",
                    "Content-Type": "application/json"
                }
            )
            resp.raise_for_status()
            mp_response = resp.json()
        
        return {
            "success": True,
            "payment_url": mp_response.get("init_point"),
            "preference_id": mp_response.get("id"),
            "plan": plan
        }
    except Exception as e:
        logger.error(f"Mercado Pago renewal error: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao processar renovação")

@api_router.get("/subscription/status")
async def get_subscription_status(current_user: dict = Depends(get_current_user)):
    """Get current subscription status"""
    if current_user["role"] != "barber" or not current_user.get("barbershop_id"):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    barbershop = await db.barbershops.find_one(
        {"barbershop_id": current_user["barbershop_id"]},
        {"_id": 0}
    )
    
    if not barbershop:
        raise HTTPException(status_code=404, detail="Barbearia não encontrada")
    
    plan = SUBSCRIPTION_PLANS.get(barbershop.get("plan", "comum"))
    expires_at = barbershop.get("plan_expires_at")
    
    days_remaining = None
    if expires_at:
        try:
            exp_date = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            days_remaining = (exp_date - datetime.now(timezone.utc)).days
        except:
            pass
    
    return {
        "plan": plan,
        "plan_id": barbershop.get("plan"),
        "status": barbershop.get("plan_status"),
        "expires_at": expires_at,
        "days_remaining": days_remaining,
        "auto_renew": barbershop.get("auto_renew", False)
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

@app.on_event("startup")
async def startup_event():
    """Start the scheduler for background jobs"""
    # Run reminder check every 5 minutes
    scheduler.add_job(
        check_and_send_reminders,
        IntervalTrigger(minutes=5),
        id="check_reminders",
        replace_existing=True
    )
    # Run subscription check every hour
    scheduler.add_job(
        check_expired_subscriptions,
        IntervalTrigger(hours=1),
        id="check_subscriptions",
        replace_existing=True
    )
    # Run recurring billing check every 12 hours
    scheduler.add_job(
        process_recurring_billing,
        IntervalTrigger(hours=12),
        id="recurring_billing",
        replace_existing=True
    )
    scheduler.start()
    logger.info("Scheduler started - reminders every 5 min, subscription check every hour, billing every 12h")

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown the scheduler and database connection"""
    scheduler.shutdown()
    client.close()
    logger.info("Scheduler and database connection closed")
