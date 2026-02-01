from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request, BackgroundTasks, UploadFile, File
from fastapi.security import HTTPBearer
from fastapi.staticfiles import StaticFiles
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
from passlib.context import CryptContext

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
import jwt
from datetime import datetime, timezone, timedelta
import httpx
import resend
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import base64
import shutil
from twilio.rest import Client as TwilioClient

ROOT_DIR = Path(__file__).parent
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
(UPLOADS_DIR / "logos").mkdir(exist_ok=True)
(UPLOADS_DIR / "banners").mkdir(exist_ok=True)
(UPLOADS_DIR / "gallery").mkdir(exist_ok=True)

load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)

# Get database from MONGO_URL - Emergent provides the database name in the connection string
# Use get_default_database() which extracts from the URL path automatically
db = client.get_default_database(default="barberhub")

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'barberhub-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168  # 7 days

# Resend Config
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

# Mercado Pago Config
MERCADOPAGO_ACCESS_TOKEN = os.environ.get('MERCADOPAGO_ACCESS_TOKEN', '')

# Twilio Config (WhatsApp API)
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_WHATSAPP_NUMBER = os.environ.get('TWILIO_WHATSAPP_NUMBER', '')

# Super Admin Config
SUPER_ADMIN_PASSWORD = os.environ.get('SUPER_ADMIN_PASSWORD', 'alunyx110205')

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
            "Criação de clientes VIP com desconto",
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
    font_style: Optional[str] = None  # modern, classic, bold
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    banner_position: Optional[str] = None  # top, center, bottom
    about_text: Optional[str] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    whatsapp_number: Optional[str] = None

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
    font_style: str = "modern"
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    banner_position: str = "center"  # top, center, bottom
    about_text: Optional[str] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    whatsapp_number: Optional[str] = None
    gallery_images: List[str] = []
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
    original_price: Optional[float] = None
    final_price: Optional[float] = None
    discount_percentage: Optional[float] = None
    is_vip: bool = False
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

# ==================== VIP CLIENTS (SIMPLIFIED) ====================

class VipClientCreate(BaseModel):
    client_name: str
    client_phone: str
    client_email: Optional[str] = None
    discount_percentage: float = 10.0  # Default 10% discount
    notes: Optional[str] = None

class VipClientUpdate(BaseModel):
    client_name: Optional[str] = None
    discount_percentage: Optional[float] = None
    notes: Optional[str] = None
    active: Optional[bool] = None


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

# ==================== PHONE NUMBER NORMALIZATION ====================

# Valid Brazilian DDD codes
VALID_DDDS = {
    '11', '12', '13', '14', '15', '16', '17', '18', '19',  # SP
    '21', '22', '24',  # RJ
    '27', '28',  # ES
    '31', '32', '33', '34', '35', '37', '38',  # MG
    '41', '42', '43', '44', '45', '46',  # PR
    '47', '48', '49',  # SC
    '51', '53', '54', '55',  # RS
    '61',  # DF
    '62', '64',  # GO
    '63',  # TO
    '65', '66',  # MT
    '67',  # MS
    '68',  # AC
    '69',  # RO
    '71', '73', '74', '75', '77',  # BA
    '79',  # SE
    '81', '82', '83', '84', '85', '86', '87', '88', '89',  # NE
    '91', '92', '93', '94', '95', '96', '97', '98', '99',  # Norte
}

def normalize_brazilian_phone(phone: str) -> dict:
    """
    Normalize Brazilian phone number to international format +55DDNNNNNNNNN
    
    Returns:
        {
            "success": bool,
            "normalized": str (E.164 format like +5564999766685),
            "formatted": str (display format like (64) 99976-6685),
            "error": str (if success is False)
        }
    """
    if not phone:
        return {"success": False, "normalized": None, "formatted": None, "error": "Número de telefone é obrigatório"}
    
    # Remove all non-numeric characters
    digits = ''.join(filter(str.isdigit, phone))
    
    # Remove country code if present
    if digits.startswith('55') and len(digits) >= 12:
        digits = digits[2:]
    
    # Validate minimum length (DDD + 8 digits minimum)
    if len(digits) < 10:
        return {
            "success": False, 
            "normalized": None, 
            "formatted": None, 
            "error": "Número incompleto. Informe DDD + número (ex: 64999766685)"
        }
    
    # Extract DDD (first 2 digits)
    ddd = digits[:2]
    number = digits[2:]
    
    # Validate DDD
    if ddd not in VALID_DDDS:
        return {
            "success": False,
            "normalized": None,
            "formatted": None,
            "error": f"DDD {ddd} inválido. Verifique o número informado."
        }
    
    # Brazilian mobile numbers must have 9 digits (starting with 9)
    # Landlines have 8 digits
    if len(number) == 8:
        # Could be landline or mobile missing the 9
        # If starts with 9, 8, 7, 6 - it's likely a mobile missing the leading 9
        if number[0] in '6789':
            number = '9' + number
    elif len(number) == 9:
        # Mobile number - validate it starts with 9
        if number[0] != '9':
            return {
                "success": False,
                "normalized": None,
                "formatted": None,
                "error": "Celular deve começar com 9 após o DDD"
            }
    elif len(number) > 9:
        return {
            "success": False,
            "normalized": None,
            "formatted": None,
            "error": "Número muito longo. Verifique se digitou corretamente."
        }
    
    # Build normalized number (E.164 format)
    normalized = f"+55{ddd}{number}"
    
    # Build formatted display
    if len(number) == 9:
        # Mobile: (DD) 9NNNN-NNNN
        formatted = f"({ddd}) {number[:5]}-{number[5:]}"
    else:
        # Landline: (DD) NNNN-NNNN
        formatted = f"({ddd}) {number[:4]}-{number[4:]}"
    
    return {
        "success": True,
        "normalized": normalized,
        "formatted": formatted,
        "error": None
    }

def format_phone_for_whatsapp(phone: str) -> str:
    """Format phone number for WhatsApp API (E.164 format without +)"""
    result = normalize_brazilian_phone(phone)
    if result["success"]:
        # Return without the + for WhatsApp API
        return result["normalized"][1:]  # Remove leading +
    
    # Fallback: just clean the digits and add 55 if needed
    digits = ''.join(filter(str.isdigit, phone))
    if not digits.startswith('55') and len(digits) >= 10:
        digits = '55' + digits
    return digits

def format_phone_for_display(phone: str) -> str:
    """Format phone number for display"""
    result = normalize_brazilian_phone(phone)
    if result["success"]:
        return result["formatted"]
    return phone  # Return original if can't format

# API endpoint to validate/normalize phone
@api_router.post("/utils/normalize-phone")
async def normalize_phone_endpoint(phone: str):
    """Normalize and validate a Brazilian phone number"""
    result = normalize_brazilian_phone(phone)
    return result

def get_twilio_client():
    """Get Twilio client instance"""
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        return TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    return None

async def send_whatsapp_message(phone: str, message: str):
    """Send WhatsApp message via Twilio API"""
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_WHATSAPP_NUMBER:
        logger.warning("Twilio not configured, skipping WhatsApp")
        return None
    
    try:
        formatted_phone = format_phone_for_whatsapp(phone)
        
        # Run Twilio in thread pool to avoid blocking
        def send_message():
            client = get_twilio_client()
            if not client:
                return None
            
            # Format numbers for WhatsApp
            from_whatsapp = f"whatsapp:{TWILIO_WHATSAPP_NUMBER}"
            to_whatsapp = f"whatsapp:+{formatted_phone}"
            
            msg = client.messages.create(
                body=message,
                from_=from_whatsapp,
                to=to_whatsapp
            )
            return msg.sid
        
        # Execute in thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, send_message)
        
        if result:
            logger.info(f"WhatsApp sent via Twilio to {phone}, SID: {result}")
            return result
        else:
            logger.error("Twilio client not available")
            return None
            
    except Exception as e:
        logger.error(f"Twilio failed: {str(e)}")
        return None

async def send_whatsapp_reminder(phone: str, barbershop_name: str, service_name: str, 
                                  date: str, time: str, address: str = None, 
                                  latitude: float = None, longitude: float = None):
    """Send WhatsApp reminder with barbershop info and location"""
    # Format date for Brazilian format
    try:
        from datetime import datetime as dt
        date_obj = dt.strptime(date, "%Y-%m-%d")
        formatted_date = date_obj.strftime("%d/%m/%Y")
    except:
        formatted_date = date
    
    message_body = f"""🔔 *Lembrete de Agendamento*

Olá! Você tem um horário marcado na *{barbershop_name}* em 30 minutos!

✂️ Serviço: {service_name}
📅 Data: {formatted_date}
⏰ Horário: {time}"""
    
    if address:
        message_body += f"\n📌 Endereço: {address}"
    
    # Add Google Maps link if coordinates available
    if latitude and longitude:
        maps_link = f"https://www.google.com/maps?q={latitude},{longitude}"
        message_body += f"\n🗺️ Ver no mapa: {maps_link}"
    
    message_body += "\n\nTe esperamos! 💈"
    
    return await send_whatsapp_message(phone, message_body)

async def send_whatsapp_booking_confirmation(phone: str, client_name: str, barbershop_name: str,
                                              service_name: str, date: str, time: str,
                                              original_price: float, final_price: float,
                                              discount_percentage: float = 0,
                                              address: str = None, latitude: float = None,
                                              longitude: float = None):
    """Send WhatsApp confirmation when booking is created"""
    # Format date for Brazilian format
    try:
        from datetime import datetime as dt
        date_obj = dt.strptime(date, "%Y-%m-%d")
        formatted_date = date_obj.strftime("%d/%m/%Y")
    except:
        formatted_date = date
    
    message_body = f"""✅ *Agendamento Confirmado!*

Olá {client_name}! Seu horário na *{barbershop_name}* foi confirmado.

✂️ Serviço: {service_name}
📅 Data: {formatted_date}
⏰ Horário: {time}"""
    
    # Show discount if VIP
    if discount_percentage > 0:
        message_body += f"""

🌟 *Você é cliente VIP!*
💰 Valor original: R$ {original_price:.2f}
🎁 Desconto: {discount_percentage}%
💵 *Valor final: R$ {final_price:.2f}*"""
    else:
        message_body += f"\n💰 Valor: R$ {final_price:.2f}"
    
    if address:
        message_body += f"\n\n📌 Endereço: {address}"
    
    if latitude and longitude:
        maps_link = f"https://www.google.com/maps?q={latitude},{longitude}"
        message_body += f"\n🗺️ Ver no mapa: {maps_link}"
    
    message_body += "\n\n📲 Você receberá um lembrete 30 minutos antes do horário.\n\nAté logo! 💈"
    
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
                # Send WhatsApp reminder with barbershop location
                result = await send_whatsapp_reminder(
                    phone=apt["client_phone"],
                    barbershop_name=barbershop["name"],
                    service_name=service["name"],
                    date=apt["date"],
                    time=apt["time"],
                    address=barbershop.get("address"),
                    latitude=barbershop.get("latitude"),
                    longitude=barbershop.get("longitude")
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

@api_router.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes/deployment probes"""
    try:
        # Quick DB ping to verify connection
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}


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
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_WHATSAPP_NUMBER:
        return {"success": False, "error": "No WhatsApp provider configured (Twilio)"}
    
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
        "twilio_configured": bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_WHATSAPP_NUMBER),
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
    # Using Preapproval (Subscriptions) API for recurring billing
    try:
        frontend_url = os.environ.get('FRONTEND_URL', '')
        if not frontend_url:
            raise HTTPException(status_code=500, detail="FRONTEND_URL não configurado")
        
        # Create preapproval (subscription) for automatic recurring billing
        preapproval_data = {
            "reason": f"BarberHub - {plan['name']}",
            "auto_recurring": {
                "frequency": 1,
                "frequency_type": "months",
                "transaction_amount": plan["price"],
                "currency_id": "BRL"
            },
            "back_url": f"{frontend_url}/pagamento/sucesso?plan={data.plan_id}",
            "payer_email": data.customer_email,
            "external_reference": f"{current_user['user_id']}_{data.plan_id}_{datetime.now(timezone.utc).timestamp()}"
        }
        
        async with httpx.AsyncClient() as client_http:
            resp = await client_http.post(
                "https://api.mercadopago.com/preapproval",
                json=preapproval_data,
                headers={
                    "Authorization": f"Bearer {MERCADOPAGO_ACCESS_TOKEN}",
                    "Content-Type": "application/json"
                }
            )
            
            if resp.status_code not in [200, 201]:
                logger.error(f"Mercado Pago preapproval error: {resp.status_code} - {resp.text}")
                # Fallback to simple checkout if preapproval fails
                return await create_simple_checkout(data, plan, current_user)
            
            mp_response = resp.json()
            
            # Store subscription info
            await db.subscriptions.update_one(
                {"user_id": current_user["user_id"]},
                {"$set": {
                    "user_id": current_user["user_id"],
                    "plan_id": data.plan_id,
                    "mp_preapproval_id": mp_response.get("id"),
                    "status": "pending",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }},
                upsert=True
            )
        
        return {
            "success": True,
            "payment_url": mp_response.get("init_point"),
            "subscription_id": mp_response.get("id"),
            "plan": plan,
            "recurring": True
        }
        
    except Exception as e:
        logger.error(f"Mercado Pago error: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao processar pagamento")

async def create_simple_checkout(data: SubscriptionPayment, plan: dict, current_user: dict):
    """Fallback to simple checkout preference (non-recurring)"""
    frontend_url = os.environ.get('FRONTEND_URL', '')
    if not frontend_url:
        raise HTTPException(status_code=500, detail="FRONTEND_URL não configurado")
    
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
            "success": f"{frontend_url}/pagamento/sucesso?plan={data.plan_id}",
            "failure": f"{frontend_url}/pagamento/erro",
            "pending": f"{frontend_url}/pagamento/pendente"
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
        "plan": plan,
        "recurring": False
    }

@api_router.get("/subscription/info")
async def get_subscription_info(current_user: dict = Depends(get_current_user)):
    """Get subscription information for the current user"""
    if current_user["role"] != "barber":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    if not current_user.get("barbershop_id"):
        raise HTTPException(status_code=404, detail="Barbearia não encontrada")
    
    # Get barbershop info
    barbershop = await db.barbershops.find_one(
        {"barbershop_id": current_user["barbershop_id"]},
        {"_id": 0}
    )
    
    if not barbershop:
        raise HTTPException(status_code=404, detail="Barbearia não encontrada")
    
    # Get subscription from database
    subscription = await db.subscriptions.find_one(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    # Get last payment
    last_payment = await db.payments.find_one(
        {"user_id": current_user["user_id"]},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    plan_info = SUBSCRIPTION_PLANS.get(barbershop.get("plan", "comum"), SUBSCRIPTION_PLANS["comum"])
    
    return {
        "plan": barbershop.get("plan", "comum"),
        "plan_name": plan_info["name"],
        "plan_price": plan_info["price"],
        "status": barbershop.get("plan_status", "pending"),
        "expires_at": barbershop.get("plan_expires_at"),
        "auto_renew": barbershop.get("auto_renew", True),
        "subscription": {
            "mp_preapproval_id": subscription.get("mp_preapproval_id") if subscription else None,
            "status": subscription.get("status") if subscription else None,
            "created_at": subscription.get("created_at") if subscription else None
        } if subscription else None,
        "last_payment": {
            "amount": last_payment.get("amount") if last_payment else None,
            "date": last_payment.get("created_at") if last_payment else None,
            "status": last_payment.get("status") if last_payment else None
        } if last_payment else None
    }

@api_router.post("/subscription/cancel")
async def cancel_subscription(current_user: dict = Depends(get_current_user)):
    """Cancel the current subscription"""
    if current_user["role"] != "barber":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    if not current_user.get("barbershop_id"):
        raise HTTPException(status_code=404, detail="Barbearia não encontrada")
    
    # Get subscription
    subscription = await db.subscriptions.find_one(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    # If there's a Mercado Pago preapproval, try to cancel it
    if subscription and subscription.get("mp_preapproval_id") and MERCADOPAGO_ACCESS_TOKEN:
        try:
            async with httpx.AsyncClient() as client_http:
                resp = await client_http.put(
                    f"https://api.mercadopago.com/preapproval/{subscription['mp_preapproval_id']}",
                    json={"status": "cancelled"},
                    headers={
                        "Authorization": f"Bearer {MERCADOPAGO_ACCESS_TOKEN}",
                        "Content-Type": "application/json"
                    }
                )
                if resp.status_code in [200, 201]:
                    logger.info(f"Cancelled MP subscription {subscription['mp_preapproval_id']}")
                else:
                    logger.warning(f"Could not cancel MP subscription: {resp.status_code}")
        except Exception as e:
            logger.error(f"Error cancelling MP subscription: {str(e)}")
    
    # Update local subscription status
    await db.subscriptions.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Update barbershop - keep access until expiration but mark as cancelled
    await db.barbershops.update_one(
        {"barbershop_id": current_user["barbershop_id"]},
        {"$set": {"auto_renew": False}}
    )
    
    # Send WhatsApp confirmation
    user = await db.users.find_one({"user_id": current_user["user_id"]}, {"_id": 0})
    if user and user.get("phone") and TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        barbershop = await db.barbershops.find_one(
            {"barbershop_id": current_user["barbershop_id"]},
            {"_id": 0}
        )
        expires_at = barbershop.get("plan_expires_at", "")
        try:
            from datetime import datetime as dt
            exp_date = dt.fromisoformat(expires_at.replace('Z', '+00:00'))
            exp_formatted = exp_date.strftime("%d/%m/%Y")
        except:
            exp_formatted = expires_at
        
        message = f"""📋 *Cancelamento de Assinatura*

Sua assinatura do BarberHub foi cancelada conforme solicitado.

Você continuará tendo acesso até: *{exp_formatted}*

Caso mude de ideia, você pode reativar sua assinatura a qualquer momento pelo painel.

Obrigado por usar o BarberHub! 💈"""
        
        await send_whatsapp_message(user["phone"], message)
    
    return {
        "success": True,
        "message": "Assinatura cancelada. Você terá acesso até o fim do período pago."
    }

@api_router.post("/webhooks/mercadopago")
async def mercadopago_webhook(request: Request):
    """Handle Mercado Pago payment and subscription notifications"""
    try:
        data = await request.json()
        logger.info(f"Mercado Pago webhook: {data}")
        
        notification_type = data.get("type")
        resource_id = data.get("data", {}).get("id")
        
        if notification_type == "payment":
            # Handle payment notification
            await handle_payment_notification(resource_id)
        
        elif notification_type == "subscription_preapproval":
            # Handle subscription (preapproval) notification
            await handle_subscription_notification(resource_id)
        
        elif notification_type == "subscription_authorized_payment":
            # Handle recurring payment notification
            await handle_recurring_payment_notification(resource_id)
        
        return Response(status_code=200)
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return Response(status_code=200)

async def handle_payment_notification(payment_id: str):
    """Process payment notification from Mercado Pago"""
    try:
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
                        await activate_subscription(user_id, plan_id, payment_id, payment_data.get("transaction_amount"))
                        
                elif status in ["rejected", "cancelled"]:
                    # Payment failed
                    logger.warning(f"Payment {payment_id} status: {status}")
    except Exception as e:
        logger.error(f"Payment notification error: {str(e)}")

async def handle_subscription_notification(preapproval_id: str):
    """Process subscription (preapproval) status changes"""
    try:
        async with httpx.AsyncClient() as client_http:
            resp = await client_http.get(
                f"https://api.mercadopago.com/preapproval/{preapproval_id}",
                headers={"Authorization": f"Bearer {MERCADOPAGO_ACCESS_TOKEN}"}
            )
            
            if resp.status_code == 200:
                preapproval_data = resp.json()
                external_ref = preapproval_data.get("external_reference", "")
                status = preapproval_data.get("status")
                
                logger.info(f"Subscription {preapproval_id} status: {status}")
                
                if status == "authorized" and external_ref:
                    # Subscription is authorized and active
                    parts = external_ref.split("_")
                    if len(parts) >= 2:
                        user_id = parts[0]
                        plan_id = parts[1]
                        
                        # Update subscription record
                        await db.subscriptions.update_one(
                            {"mp_preapproval_id": preapproval_id},
                            {"$set": {
                                "status": "active",
                                "authorized_at": datetime.now(timezone.utc).isoformat()
                            }}
                        )
                        
                        # Activate barbershop subscription
                        await activate_subscription(user_id, plan_id)
                
                elif status in ["paused", "cancelled"]:
                    # Subscription was paused or cancelled
                    await db.subscriptions.update_one(
                        {"mp_preapproval_id": preapproval_id},
                        {"$set": {"status": status}}
                    )
                    
                    # If cancelled, could deactivate but we'll let expiration handle it
                    if status == "cancelled":
                        logger.info(f"Subscription {preapproval_id} was cancelled")
                        
    except Exception as e:
        logger.error(f"Subscription notification error: {str(e)}")

async def handle_recurring_payment_notification(authorized_payment_id: str):
    """Process recurring payment from subscription"""
    try:
        async with httpx.AsyncClient() as client_http:
            resp = await client_http.get(
                f"https://api.mercadopago.com/authorized_payments/{authorized_payment_id}",
                headers={"Authorization": f"Bearer {MERCADOPAGO_ACCESS_TOKEN}"}
            )
            
            if resp.status_code == 200:
                payment_data = resp.json()
                status = payment_data.get("status")
                preapproval_id = payment_data.get("preapproval_id")
                
                logger.info(f"Recurring payment {authorized_payment_id} status: {status}")
                
                if status == "approved":
                    # Find subscription and renew
                    subscription = await db.subscriptions.find_one(
                        {"mp_preapproval_id": preapproval_id},
                        {"_id": 0}
                    )
                    
                    if subscription:
                        await activate_subscription(
                            subscription["user_id"],
                            subscription["plan_id"],
                            authorized_payment_id,
                            payment_data.get("transaction_amount")
                        )
                        
                        # Send WhatsApp notification about successful renewal
                        user = await db.users.find_one({"user_id": subscription["user_id"]}, {"_id": 0})
                        if user and user.get("phone") and TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
                            plan = SUBSCRIPTION_PLANS.get(subscription["plan_id"])
                            message = f"""✅ *Pagamento Confirmado*

Sua assinatura do BarberHub ({plan['name']}) foi renovada automaticamente.

💰 Valor: R$ {plan['price']:.2f}
📅 Próxima cobrança em 30 dias

Obrigado por confiar no BarberHub! 💈"""
                            await send_whatsapp_message(user["phone"], message)
                
                elif status == "rejected":
                    # Recurring payment failed - send alert
                    subscription = await db.subscriptions.find_one(
                        {"mp_preapproval_id": preapproval_id},
                        {"_id": 0}
                    )
                    
                    if subscription:
                        user = await db.users.find_one({"user_id": subscription["user_id"]}, {"_id": 0})
                        if user and user.get("phone") and TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
                            plan = SUBSCRIPTION_PLANS.get(subscription["plan_id"])
                            message = f"""⚠️ *Problema no Pagamento*

Não foi possível processar a renovação automática da sua assinatura do BarberHub ({plan['name']}).

Por favor, acesse sua conta e atualize seus dados de pagamento para evitar a suspensão do serviço.

Precisa de ajuda? Entre em contato conosco."""
                            await send_whatsapp_message(user["phone"], message)
                            
    except Exception as e:
        logger.error(f"Recurring payment notification error: {str(e)}")

async def activate_subscription(user_id: str, plan_id: str, payment_id: str = None, amount: float = None):
    """Activate or renew a subscription"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if user and user.get("barbershop_id"):
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        await db.barbershops.update_one(
            {"barbershop_id": user["barbershop_id"]},
            {"$set": {
                "plan": plan_id,
                "plan_status": "active",
                "plan_expires_at": expires_at.isoformat()
            }}
        )
        
        # Log payment if provided
        if payment_id:
            await db.payments.insert_one({
                "payment_id": generate_id("pay"),
                "barbershop_id": user["barbershop_id"],
                "user_id": user_id,
                "plan_id": plan_id,
                "amount": amount or SUBSCRIPTION_PLANS.get(plan_id, {}).get("price"),
                "mp_payment_id": payment_id,
                "status": "approved",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        logger.info(f"Subscription activated for user {user_id}, plan {plan_id}")


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
        # Normalize phone number
        phone_result = normalize_brazilian_phone(data.phone)
        update_data["phone"] = phone_result["normalized"] if phone_result["success"] else data.phone
    if data.latitude is not None:
        update_data["latitude"] = data.latitude
    if data.longitude is not None:
        update_data["longitude"] = data.longitude
    if data.primary_color is not None:
        update_data["primary_color"] = data.primary_color
    if data.background_color is not None:
        update_data["background_color"] = data.background_color
    if data.font_style is not None:
        update_data["font_style"] = data.font_style
    if data.logo_url is not None:
        update_data["logo_url"] = data.logo_url
    if data.banner_url is not None:
        update_data["banner_url"] = data.banner_url
    if data.banner_position is not None:
        update_data["banner_position"] = data.banner_position
    if data.about_text is not None:
        update_data["about_text"] = data.about_text
    if data.instagram_url is not None:
        update_data["instagram_url"] = data.instagram_url
    if data.facebook_url is not None:
        update_data["facebook_url"] = data.facebook_url
    if data.whatsapp_number is not None:
        # Normalize WhatsApp number
        whatsapp_result = normalize_brazilian_phone(data.whatsapp_number)
        update_data["whatsapp_number"] = whatsapp_result["normalized"] if whatsapp_result["success"] else data.whatsapp_number
    
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

@api_router.post("/barbershops/upload/{upload_type}")
async def upload_barbershop_image(
    upload_type: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload logo, banner or gallery image for barbershop"""
    if current_user["role"] != "barber" or not current_user.get("barbershop_id"):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    if upload_type not in ["logo", "banner", "gallery"]:
        raise HTTPException(status_code=400, detail="Tipo de upload inválido")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido. Use JPG, PNG, WEBP ou GIF")
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{current_user['barbershop_id']}_{uuid.uuid4().hex[:8]}.{ext}"
    
    # Determine folder
    folder_map = {"logo": "logos", "banner": "banners", "gallery": "gallery"}
    folder = UPLOADS_DIR / folder_map[upload_type]
    filepath = folder / filename
    
    # Save file
    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao salvar arquivo")
    
    # Generate URL - use relative path that works in any environment
    # The frontend will prepend the correct base URL
    image_url = f"/api/uploads/{folder_map[upload_type]}/{filename}"
    
    # Update barbershop if logo or banner
    if upload_type in ["logo", "banner"]:
        field = f"{upload_type}_url"
        await db.barbershops.update_one(
            {"barbershop_id": current_user["barbershop_id"]},
            {"$set": {field: image_url}}
        )
    elif upload_type == "gallery":
        # Add to gallery array
        await db.barbershops.update_one(
            {"barbershop_id": current_user["barbershop_id"]},
            {"$push": {"gallery_images": image_url}}
        )
    
    return {"success": True, "url": image_url, "type": upload_type}

@api_router.delete("/barbershops/gallery")
async def delete_gallery_image(image_url: str, current_user: dict = Depends(get_current_user)):
    """Remove image from gallery"""
    if current_user["role"] != "barber" or not current_user.get("barbershop_id"):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Remove from database
    await db.barbershops.update_one(
        {"barbershop_id": current_user["barbershop_id"]},
        {"$pull": {"gallery_images": image_url}}
    )
    
    # Try to delete file
    try:
        filename = image_url.split("/")[-1]
        filepath = UPLOADS_DIR / "gallery" / filename
        if filepath.exists():
            filepath.unlink()
    except Exception as e:
        logger.warning(f"Could not delete file: {str(e)}")
    
    return {"success": True}

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
    
    # Batch fetch all services and professionals to avoid N+1 queries
    service_ids = list(set(apt.get("service_id") for apt in appointments if apt.get("service_id")))
    professional_ids = list(set(apt.get("professional_id") for apt in appointments if apt.get("professional_id")))
    
    services = await db.services.find({"service_id": {"$in": service_ids}}, {"_id": 0}).to_list(len(service_ids))
    professionals = await db.professionals.find({"professional_id": {"$in": professional_ids}}, {"_id": 0}).to_list(len(professional_ids))
    
    # Create lookup dictionaries
    services_map = {s["service_id"]: s for s in services}
    professionals_map = {p["professional_id"]: p for p in professionals}
    
    # Enrich appointments
    for apt in appointments:
        service = services_map.get(apt.get("service_id"))
        if service:
            apt["service_name"] = service["name"]
            apt["service_duration"] = service["duration"]
            apt["service_price"] = service["price"]
        
        if apt.get("professional_id"):
            prof = professionals_map.get(apt["professional_id"])
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
            apt["service_price"] = service["price"]
    
    return appointments

@api_router.get("/client/profile")
async def get_client_profile(current_user: dict = Depends(get_current_user)):
    """Get client profile with VIP status across barbershops"""
    if current_user["role"] != "client":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    phone = current_user.get("phone", "")
    clean_phone = ''.join(filter(str.isdigit, phone))
    
    # Find VIP statuses across barbershops
    vip_statuses = []
    if clean_phone:
        vip_entries = await db.vip_clients.find({
            "client_phone": {"$regex": clean_phone},
            "active": True
        }, {"_id": 0}).to_list(100)
        
        for vip in vip_entries:
            barbershop = await db.barbershops.find_one(
                {"barbershop_id": vip["barbershop_id"]},
                {"_id": 0, "name": 1, "slug": 1}
            )
            if barbershop:
                vip_statuses.append({
                    "barbershop_name": barbershop["name"],
                    "barbershop_slug": barbershop["slug"],
                    "discount_percentage": vip["discount_percentage"]
                })
    
    # Count appointments
    total_appointments = await db.appointments.count_documents({
        "client_id": current_user["user_id"]
    })
    completed_appointments = await db.appointments.count_documents({
        "client_id": current_user["user_id"],
        "status": "completed"
    })
    
    return {
        "user": {k: v for k, v in current_user.items() if k != "password"},
        "vip_statuses": vip_statuses,
        "is_vip_anywhere": len(vip_statuses) > 0,
        "total_appointments": total_appointments,
        "completed_appointments": completed_appointments
    }

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
    
    # Get barbershop for VIP check and notifications
    barbershop = await db.barbershops.find_one({"barbershop_id": data.barbershop_id}, {"_id": 0})
    
    # Normalize client phone number
    phone_result = normalize_brazilian_phone(data.client_phone)
    normalized_phone = phone_result["normalized"] if phone_result["success"] else data.client_phone
    
    # Check if client is VIP and calculate discount
    original_price = service["price"]
    final_price = original_price
    discount_percentage = 0
    is_vip = False
    
    # Only check VIP if barbershop has premium plan
    if barbershop and barbershop.get("plan") == "premium":
        clean_phone = ''.join(filter(str.isdigit, normalized_phone))
        vip_client = await db.vip_clients.find_one({
            "barbershop_id": data.barbershop_id,
            "client_phone": {"$regex": clean_phone},
            "active": True
        }, {"_id": 0})
        
        if vip_client:
            is_vip = True
            discount_percentage = vip_client.get("discount_percentage", 0)
            final_price = original_price * (1 - discount_percentage / 100)
            logger.info(f"VIP discount applied: {discount_percentage}% for {normalized_phone}")
    
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
        "client_phone": normalized_phone,
        "client_email": data.client_email,
        "notes": data.notes,
        "status": "pending",
        "reminder_sent": False,
        "original_price": original_price,
        "final_price": final_price,
        "discount_percentage": discount_percentage,
        "is_vip": is_vip,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.appointments.insert_one(apt_doc)
    
    # Send WhatsApp confirmation
    if barbershop:
        try:
            await send_whatsapp_booking_confirmation(
                phone=normalized_phone,
                client_name=data.client_name,
                barbershop_name=barbershop["name"],
                service_name=service["name"],
                date=data.date,
                time=data.time,
                original_price=original_price,
                final_price=final_price,
                discount_percentage=discount_percentage,
                address=barbershop.get("address"),
                latitude=barbershop.get("latitude"),
                longitude=barbershop.get("longitude")
            )
        except Exception as e:
            logger.error(f"Failed to send WhatsApp confirmation: {str(e)}")
    
    # Send email notification
    if data.client_email and barbershop:
        address_html = ""
        if barbershop.get("address"):
            address_html = f'<p style="color: #fff; margin: 5px 0;"><strong>Endereço:</strong> {barbershop["address"]}</p>'
            if barbershop.get("latitude") and barbershop.get("longitude"):
                maps_url = f"https://www.google.com/maps?q={barbershop['latitude']},{barbershop['longitude']}"
                address_html += f'<p style="margin: 5px 0;"><a href="{maps_url}" style="color: #F59E0B;">Ver no Google Maps</a></p>'
        
        # Show discount in email if VIP
        price_html = f'<p style="color: #fff; margin: 5px 0;"><strong>Valor:</strong> R$ {final_price:.2f}</p>'
        if is_vip:
            price_html = f'''
                <p style="color: #fff; margin: 5px 0;"><strong>Valor original:</strong> <s>R$ {original_price:.2f}</s></p>
                <p style="color: #F59E0B; margin: 5px 0;"><strong>🌟 Desconto VIP ({discount_percentage}%):</strong> R$ {final_price:.2f}</p>
            '''
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #F59E0B;">Agendamento Confirmado!</h2>
            <p>Olá {data.client_name},</p>
            <p>Seu agendamento na <strong>{barbershop['name']}</strong> foi realizado com sucesso!</p>
            <div style="background: #18181B; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #fff; margin: 5px 0;"><strong>Serviço:</strong> {service['name']}</p>
                <p style="color: #fff; margin: 5px 0;"><strong>Data:</strong> {data.date}</p>
                <p style="color: #fff; margin: 5px 0;"><strong>Horário:</strong> {data.time}</p>
                {price_html}
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
    
    # Return appointment with barbershop location and VIP info
    apt_response = {k: v for k, v in apt_doc.items() if k != "_id"}
    apt_response["service_name"] = service["name"]
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


# ==================== VIP CLIENTS (SIMPLIFIED) ====================

async def check_premium_access(current_user: dict):
    """Check if user has premium plan"""
    if not current_user.get("barbershop_id"):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    barbershop = await db.barbershops.find_one(
        {"barbershop_id": current_user["barbershop_id"]},
        {"_id": 0}
    )
    
    if not barbershop or barbershop.get("plan") != "premium":
        raise HTTPException(status_code=403, detail="Recurso disponível apenas no plano Premium")
    
    return barbershop

@api_router.get("/vip-clients")
async def list_vip_clients(current_user: dict = Depends(get_current_user)):
    """List all VIP clients for a barbershop (Premium only)"""
    barbershop = await check_premium_access(current_user)
    
    clients = await db.vip_clients.find(
        {"barbershop_id": current_user["barbershop_id"]},
        {"_id": 0}
    ).to_list(500)
    
    return clients

@api_router.post("/vip-clients")
async def add_vip_client(data: VipClientCreate, current_user: dict = Depends(get_current_user)):
    """Add a VIP client (Premium only)"""
    barbershop = await check_premium_access(current_user)
    
    # Normalize phone number
    phone_result = normalize_brazilian_phone(data.client_phone)
    normalized_phone = phone_result["normalized"] if phone_result["success"] else data.client_phone
    
    # Check if client already exists by phone
    clean_phone = ''.join(filter(str.isdigit, normalized_phone))
    existing = await db.vip_clients.find_one({
        "barbershop_id": current_user["barbershop_id"],
        "client_phone": {"$regex": clean_phone}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Cliente já cadastrado como VIP")
    
    client_id = generate_id("vip")
    client_doc = {
        "vip_id": client_id,
        "barbershop_id": current_user["barbershop_id"],
        "client_name": data.client_name,
        "client_phone": normalized_phone,
        "client_email": data.client_email,
        "discount_percentage": data.discount_percentage,
        "notes": data.notes,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.vip_clients.insert_one(client_doc)
    del client_doc["_id"]
    
    # Send WhatsApp notification
    message = f"""🌟 *Parabéns, você é VIP!*

Olá {data.client_name}!

Você agora faz parte dos clientes especiais da *{barbershop['name']}*!

🎁 Seu benefício: *{data.discount_percentage}% de desconto* em todos os serviços!

Agende seu próximo horário e aproveite! 💈"""
    
    await send_whatsapp_message(normalized_phone, message)
    
    return client_doc

@api_router.put("/vip-clients/{vip_id}")
async def update_vip_client(vip_id: str, data: VipClientUpdate, current_user: dict = Depends(get_current_user)):
    """Update a VIP client (Premium only)"""
    barbershop = await check_premium_access(current_user)
    
    client = await db.vip_clients.find_one(
        {"vip_id": vip_id, "barbershop_id": current_user["barbershop_id"]}
    )
    
    if not client:
        raise HTTPException(status_code=404, detail="Cliente VIP não encontrado")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.vip_clients.update_one(
        {"vip_id": vip_id},
        {"$set": update_data}
    )
    
    updated = await db.vip_clients.find_one({"vip_id": vip_id}, {"_id": 0})
    return updated

@api_router.delete("/vip-clients/{vip_id}")
async def remove_vip_client(vip_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a VIP client (Premium only)"""
    barbershop = await check_premium_access(current_user)
    
    result = await db.vip_clients.delete_one(
        {"vip_id": vip_id, "barbershop_id": current_user["barbershop_id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente VIP não encontrado")
    
    return {"success": True, "message": "Cliente removido da lista VIP"}

@api_router.get("/vip-clients/check/{phone}")
async def check_vip_by_phone(phone: str, barbershop_id: str):
    """Check if a client is VIP (public endpoint for booking)"""
    clean_phone = ''.join(filter(str.isdigit, phone))
    
    vip = await db.vip_clients.find_one({
        "barbershop_id": barbershop_id,
        "client_phone": {"$regex": clean_phone},
        "active": True
    }, {"_id": 0})
    
    if not vip:
        return {"is_vip": False, "discount_percentage": 0}
    
    return {
        "is_vip": True,
        "client_name": vip["client_name"],
        "discount_percentage": vip["discount_percentage"]
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
    
    # Batch fetch all appointments and services to avoid N+1 queries
    client_phones = [c["_id"] for c in clients]
    all_client_appointments = await db.appointments.find({
        "barbershop_id": barbershop_id,
        "client_phone": {"$in": client_phones},
        "status": "completed"
    }, {"_id": 0}).to_list(1000)
    
    # Get unique service IDs and fetch all services at once
    service_ids = list(set(apt.get("service_id") for apt in all_client_appointments if apt.get("service_id")))
    services = await db.services.find({"service_id": {"$in": service_ids}}, {"_id": 0}).to_list(len(service_ids))
    services_map = {s["service_id"]: s for s in services}
    
    # Group appointments by phone and calculate totals
    appointments_by_phone = {}
    for apt in all_client_appointments:
        phone = apt.get("client_phone")
        if phone not in appointments_by_phone:
            appointments_by_phone[phone] = []
        appointments_by_phone[phone].append(apt)
    
    # Calculate total revenue per client
    for client in clients:
        phone = client["_id"]
        client_apts = appointments_by_phone.get(phone, [])
        total_spent = sum(
            services_map.get(apt.get("service_id"), {}).get("price", 0) 
            for apt in client_apts
        )
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
                
                if owner and (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_WHATSAPP_NUMBER):
                    # Send WhatsApp reminder about renewal
                    plan = SUBSCRIPTION_PLANS.get(barbershop.get("plan", "comum"))
                    try:
                        if owner.get("phone"):
                            message_text = f"""⚠️ *Lembrete de Renovação*

Olá! Sua assinatura do BarberHub ({plan['name']}) expira em breve.

💰 Valor: R$ {plan['price']:.2f}/mês

Para continuar recebendo agendamentos, renove sua assinatura acessando o painel.

Obrigado por usar o BarberHub! 💈"""
                            
                            result = await send_whatsapp_message(owner["phone"], message_text)
                            if result:
                                logger.info(f"Renewal reminder sent to {barbershop['barbershop_id']}: {result}")
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


# ==================== ADMIN: DEMO ACCOUNT ====================

@api_router.post("/admin/create-demo-account")
async def create_demo_premium_account(secret_key: str):
    """Create a demo premium account for testing (no payment required)"""
    # Simple secret key protection
    if secret_key != "barberhub-demo-2024":
        raise HTTPException(status_code=403, detail="Chave inválida")
    
    # Check if demo account already exists
    existing = await db.users.find_one({"email": "demo@barberhubpro.com.br"}, {"_id": 0})
    if existing:
        barbershop = await db.barbershops.find_one(
            {"owner_id": existing["user_id"]},
            {"_id": 0}
        )
        return {
            "message": "Conta demo já existe",
            "email": "demo@barberhubpro.com.br",
            "password": "Demo@2024",
            "barbershop_slug": barbershop["slug"] if barbershop else None
        }
    
    # Create demo user
    user_id = generate_id("user")
    user_doc = {
        "user_id": user_id,
        "email": "demo@barberhubpro.com.br",
        "password": hash_password("Demo@2024"),
        "name": "Barbearia Demo",
        "role": "barber",
        "barbershop_id": None,
        "phone": "+5511999999999",
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Create demo barbershop
    barbershop_id = generate_id("barb")
    expires_at = datetime.now(timezone.utc) + timedelta(days=365 * 10)  # 10 years
    
    barbershop_doc = {
        "barbershop_id": barbershop_id,
        "owner_id": user_id,
        "name": "Barbearia Demo Premium",
        "slug": "demo-premium",
        "description": "Conta de demonstração do BarberHub com todas as funcionalidades Premium",
        "address": "Rua Demonstração, 123 - São Paulo, SP",
        "phone": "+5511999999999",
        "latitude": -23.5505,
        "longitude": -46.6333,
        "primary_color": "#F59E0B",
        "background_color": "#09090B",
        "plan": "premium",
        "plan_status": "active",
        "plan_expires_at": expires_at.isoformat(),
        "is_demo": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.barbershops.insert_one(barbershop_doc)
    
    # Update user with barbershop_id
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"barbershop_id": barbershop_id}}
    )
    
    # Create default business hours
    default_hours = []
    for day in range(6):
        default_hours.append({
            "barbershop_id": barbershop_id,
            "day_of_week": day,
            "start_time": "09:00",
            "end_time": "19:00",
            "is_closed": False
        })
    default_hours.append({
        "barbershop_id": barbershop_id,
        "day_of_week": 6,
        "start_time": "09:00",
        "end_time": "14:00",
        "is_closed": False
    })
    await db.business_hours.insert_many(default_hours)
    
    # Create sample services
    services = [
        {"name": "Corte Masculino", "duration": 30, "price": 45.00, "description": "Corte moderno e estiloso"},
        {"name": "Barba", "duration": 20, "price": 30.00, "description": "Barba completa com navalha"},
        {"name": "Corte + Barba", "duration": 50, "price": 65.00, "description": "Combo completo"},
        {"name": "Pigmentação", "duration": 40, "price": 80.00, "description": "Pigmentação de barba ou cabelo"},
        {"name": "Hidratação", "duration": 30, "price": 35.00, "description": "Tratamento capilar"}
    ]
    for s in services:
        await db.services.insert_one({
            "service_id": generate_id("serv"),
            "barbershop_id": barbershop_id,
            **s,
            "active": True
        })
    
    # Create sample professionals
    professionals = [
        {"name": "João Silva", "phone": "+5511988888888", "email": "joao@demo.com"},
        {"name": "Pedro Santos", "phone": "+5511977777777", "email": "pedro@demo.com"}
    ]
    for p in professionals:
        await db.professionals.insert_one({
            "professional_id": generate_id("prof"),
            "barbershop_id": barbershop_id,
            **p,
            "active": True
        })
    
    # Create sample VIP client
    await db.vip_clients.insert_one({
        "vip_id": generate_id("vip"),
        "barbershop_id": barbershop_id,
        "client_name": "Cliente VIP Teste",
        "client_phone": "+5511966666666",
        "client_email": "vip@teste.com",
        "discount_percentage": 15.0,
        "notes": "Cliente de demonstração",
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": "Conta demo premium criada com sucesso!",
        "credentials": {
            "email": "demo@barberhubpro.com.br",
            "password": "Demo@2024"
        },
        "barbershop": {
            "name": "Barbearia Demo Premium",
            "slug": "demo-premium",
            "public_url": "https://barberhubpro.com.br/b/demo-premium"
        },
        "features": {
            "plan": "premium",
            "services": len(services),
            "professionals": len(professionals),
            "vip_clients": 1
        }
    }


# ==================== SUPER ADMIN ====================

class SuperAdminLogin(BaseModel):
    password: str

@api_router.post("/super-admin/login")
async def super_admin_login(data: SuperAdminLogin):
    """Login to Super Admin panel"""
    if data.password != SUPER_ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Senha incorreta")
    
    # Generate admin token
    token_data = {
        "role": "super_admin",
        "exp": datetime.now(timezone.utc) + timedelta(hours=24)
    }
    token = jwt.encode(token_data, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {"success": True, "token": token}

async def verify_super_admin(request: Request):
    """Verify super admin token"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token não fornecido")
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Acesso negado")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

@api_router.get("/super-admin/dashboard")
async def super_admin_dashboard(admin: dict = Depends(verify_super_admin)):
    """Get dashboard metrics for super admin"""
    
    # Total barbershops
    total_barbershops = await db.barbershops.count_documents({})
    active_barbershops = await db.barbershops.count_documents({"plan_status": "active"})
    expired_barbershops = await db.barbershops.count_documents({"plan_status": "expired"})
    pending_barbershops = await db.barbershops.count_documents({"plan_status": "pending"})
    
    # Subscriptions by plan
    comum_active = await db.barbershops.count_documents({"plan": "comum", "plan_status": "active"})
    premium_active = await db.barbershops.count_documents({"plan": "premium", "plan_status": "active"})
    
    # Calculate MRR (Monthly Recurring Revenue)
    mrr = (comum_active * 49.90) + (premium_active * 99.90)
    
    # Total appointments
    total_appointments = await db.appointments.count_documents({})
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    appointments_today = await db.appointments.count_documents({"date": today})
    
    # Appointments this month
    first_day_of_month = datetime.now(timezone.utc).replace(day=1).strftime("%Y-%m-%d")
    appointments_this_month = await db.appointments.count_documents({
        "date": {"$gte": first_day_of_month}
    })
    
    # Total users
    total_users = await db.users.count_documents({})
    barbers = await db.users.count_documents({"role": "barber"})
    clients = await db.users.count_documents({"role": "client"})
    
    # VIP clients
    total_vip = await db.vip_clients.count_documents({"active": True})
    
    # Failed payments (subscriptions with issues)
    failed_subscriptions = await db.subscriptions.count_documents({"status": {"$in": ["cancelled", "paused"]}})
    
    # Recent activity - last 7 days signups
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    new_signups = await db.users.count_documents({
        "created_at": {"$gte": seven_days_ago},
        "role": "barber"
    })
    
    # Churn calculation (cancelled in last 30 days)
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    cancelled_last_month = await db.subscriptions.count_documents({
        "status": "cancelled",
        "cancelled_at": {"$gte": thirty_days_ago}
    })
    
    return {
        "overview": {
            "total_barbershops": total_barbershops,
            "active_barbershops": active_barbershops,
            "expired_barbershops": expired_barbershops,
            "pending_barbershops": pending_barbershops,
            "total_appointments": total_appointments,
            "appointments_today": appointments_today,
            "appointments_this_month": appointments_this_month,
            "total_users": total_users,
            "barbers": barbers,
            "clients": clients,
            "total_vip_clients": total_vip
        },
        "financial": {
            "mrr": round(mrr, 2),
            "comum_subscriptions": comum_active,
            "premium_subscriptions": premium_active,
            "failed_subscriptions": failed_subscriptions,
            "revenue_comum": round(comum_active * 49.90, 2),
            "revenue_premium": round(premium_active * 99.90, 2)
        },
        "growth": {
            "new_signups_7d": new_signups,
            "cancelled_30d": cancelled_last_month,
            "churn_rate": round((cancelled_last_month / max(active_barbershops, 1)) * 100, 2)
        },
        "integrations": {
            "mercadopago": {
                "configured": bool(MERCADOPAGO_ACCESS_TOKEN),
                "mode": "production" if MERCADOPAGO_ACCESS_TOKEN else "not_configured"
            },
            "whatsapp_twilio": {
                "configured": bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_WHATSAPP_NUMBER),
                "account_sid_set": bool(TWILIO_ACCOUNT_SID),
                "auth_token_set": bool(TWILIO_AUTH_TOKEN),
                "whatsapp_number_set": bool(TWILIO_WHATSAPP_NUMBER)
            },
            "email_resend": {
                "configured": bool(resend.api_key)
            }
        }
    }

@api_router.get("/super-admin/barbershops")
async def super_admin_list_barbershops(
    admin: dict = Depends(verify_super_admin),
    plan: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    """List all barbershops with filters"""
    query = {}
    
    if plan:
        query["plan"] = plan
    if status:
        query["plan_status"] = status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"slug": {"$regex": search, "$options": "i"}}
        ]
    
    barbershops = await db.barbershops.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.barbershops.count_documents(query)
    
    # Enrich with stats
    enriched = []
    for b in barbershops:
        appointments_count = await db.appointments.count_documents({"barbershop_id": b["barbershop_id"]})
        services_count = await db.services.count_documents({"barbershop_id": b["barbershop_id"]})
        professionals_count = await db.professionals.count_documents({"barbershop_id": b["barbershop_id"]})
        
        # Get owner info
        owner = await db.users.find_one({"barbershop_id": b["barbershop_id"], "role": "barber"}, {"_id": 0, "name": 1, "email": 1})
        
        enriched.append({
            **b,
            "stats": {
                "appointments": appointments_count,
                "services": services_count,
                "professionals": professionals_count
            },
            "owner": owner
        })
    
    return {
        "barbershops": enriched,
        "total": total,
        "page": skip // limit + 1,
        "pages": (total + limit - 1) // limit
    }

@api_router.get("/super-admin/barbershops/{barbershop_id}")
async def super_admin_get_barbershop(barbershop_id: str, admin: dict = Depends(verify_super_admin)):
    """Get detailed barbershop info"""
    barbershop = await db.barbershops.find_one({"barbershop_id": barbershop_id}, {"_id": 0})
    if not barbershop:
        raise HTTPException(status_code=404, detail="Barbearia não encontrada")
    
    # Get owner
    owner = await db.users.find_one({"barbershop_id": barbershop_id, "role": "barber"}, {"_id": 0})
    
    # Get subscription
    subscription = await db.subscriptions.find_one({"barbershop_id": barbershop_id}, {"_id": 0})
    
    # Get stats
    appointments = await db.appointments.find({"barbershop_id": barbershop_id}, {"_id": 0}).to_list(100)
    services = await db.services.find({"barbershop_id": barbershop_id}, {"_id": 0}).to_list(50)
    professionals = await db.professionals.find({"barbershop_id": barbershop_id}, {"_id": 0}).to_list(20)
    vip_clients = await db.vip_clients.find({"barbershop_id": barbershop_id}, {"_id": 0}).to_list(100)
    
    # Calculate revenue
    total_revenue = sum(apt.get("final_price", 0) for apt in appointments if apt.get("status") == "completed")
    
    return {
        "barbershop": barbershop,
        "owner": owner,
        "subscription": subscription,
        "stats": {
            "total_appointments": len(appointments),
            "completed_appointments": len([a for a in appointments if a.get("status") == "completed"]),
            "cancelled_appointments": len([a for a in appointments if a.get("status") == "cancelled"]),
            "total_revenue": round(total_revenue, 2),
            "services_count": len(services),
            "professionals_count": len(professionals),
            "vip_clients_count": len(vip_clients)
        },
        "services": services,
        "professionals": professionals,
        "vip_clients": vip_clients,
        "recent_appointments": appointments[:20]
    }

@api_router.put("/super-admin/barbershops/{barbershop_id}/status")
async def super_admin_update_barbershop_status(
    barbershop_id: str,
    status: str,
    admin: dict = Depends(verify_super_admin)
):
    """Activate or deactivate a barbershop"""
    if status not in ["active", "expired", "suspended"]:
        raise HTTPException(status_code=400, detail="Status inválido")
    
    result = await db.barbershops.update_one(
        {"barbershop_id": barbershop_id},
        {"$set": {"plan_status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Barbearia não encontrada")
    
    return {"success": True, "message": f"Status atualizado para {status}"}

@api_router.delete("/super-admin/barbershops/{barbershop_id}")
async def super_admin_delete_barbershop(
    barbershop_id: str,
    admin: dict = Depends(verify_super_admin)
):
    """Permanently delete a barbershop and all related data"""
    
    # Delete all related data
    await db.services.delete_many({"barbershop_id": barbershop_id})
    await db.professionals.delete_many({"barbershop_id": barbershop_id})
    await db.appointments.delete_many({"barbershop_id": barbershop_id})
    await db.subscriptions.delete_many({"barbershop_id": barbershop_id})
    await db.vip_clients.delete_many({"barbershop_id": barbershop_id})
    await db.blocked_times.delete_many({"barbershop_id": barbershop_id})
    await db.payments.delete_many({"barbershop_id": barbershop_id})
    
    # Delete barbershop owner user
    barbershop = await db.barbershops.find_one({"barbershop_id": barbershop_id})
    if barbershop and barbershop.get("owner_id"):
        await db.users.delete_one({"user_id": barbershop["owner_id"]})
    
    # Delete barbershop
    result = await db.barbershops.delete_one({"barbershop_id": barbershop_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Barbearia não encontrada")
    
    return {"success": True, "message": "Barbearia e dados relacionados deletados"}

@api_router.get("/super-admin/subscriptions")
async def super_admin_list_subscriptions(admin: dict = Depends(verify_super_admin)):
    """List all subscriptions"""
    subscriptions = await db.subscriptions.find({}, {"_id": 0}).to_list(500)
    
    # Enrich with barbershop info
    enriched = []
    for sub in subscriptions:
        barbershop = await db.barbershops.find_one(
            {"barbershop_id": sub["barbershop_id"]}, 
            {"_id": 0, "name": 1, "slug": 1, "plan": 1}
        )
        enriched.append({
            **sub,
            "barbershop": barbershop
        })
    
    return {"subscriptions": enriched, "total": len(enriched)}

@api_router.get("/super-admin/payments")
async def super_admin_list_payments(
    admin: dict = Depends(verify_super_admin),
    status: Optional[str] = None,
    limit: int = 100
):
    """List payment history"""
    query = {}
    if status:
        query["status"] = status
    
    payments = await db.payments.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"payments": payments, "total": len(payments)}

@api_router.get("/super-admin/activity-logs")
async def super_admin_activity_logs(admin: dict = Depends(verify_super_admin), limit: int = 100):
    """Get recent activity logs"""
    
    # Recent signups
    recent_users = await db.users.find(
        {"role": "barber"},
        {"_id": 0, "name": 1, "email": 1, "created_at": 1}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    # Recent appointments
    recent_appointments = await db.appointments.find(
        {},
        {"_id": 0, "barbershop_id": 1, "client_name": 1, "date": 1, "time": 1, "status": 1, "created_at": 1}
    ).sort("created_at", -1).limit(30).to_list(30)
    
    # Recent subscriptions
    recent_subscriptions = await db.subscriptions.find(
        {},
        {"_id": 0, "barbershop_id": 1, "plan": 1, "status": 1, "created_at": 1}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return {
        "recent_signups": recent_users,
        "recent_appointments": recent_appointments,
        "recent_subscriptions": recent_subscriptions
    }

@api_router.get("/super-admin/whatsapp-report")
async def super_admin_whatsapp_report(admin: dict = Depends(verify_super_admin)):
    """Get detailed WhatsApp (Twilio) integration report"""
    
    return {
        "integration_status": {
            "configured": bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_WHATSAPP_NUMBER),
            "account_sid_set": bool(TWILIO_ACCOUNT_SID),
            "auth_token_set": bool(TWILIO_AUTH_TOKEN),
            "whatsapp_number_set": bool(TWILIO_WHATSAPP_NUMBER),
            "provider": "Twilio"
        },
        "message_types": [
            {
                "type": "booking_confirmation",
                "trigger": "Quando um cliente finaliza um agendamento",
                "content": [
                    "Nome do cliente",
                    "Nome da barbearia",
                    "Serviço agendado",
                    "Data e horário",
                    "Valor (com desconto VIP se aplicável)",
                    "Endereço com link do Google Maps"
                ],
                "example": """✅ *Agendamento Confirmado!*

Olá João!

Seu agendamento na *Barbearia Demo Premium* foi confirmado:

📅 *Data:* 29/01/2026
🕐 *Horário:* 14:00
💇 *Serviço:* Corte + Barba
💰 *Valor:* R$ 50,00

📍 *Endereço:* Rua Demonstração, 123 - São Paulo
🗺️ Ver no mapa: https://maps.google.com/...

Até lá! 💈"""
            },
            {
                "type": "appointment_reminder",
                "trigger": "30 minutos antes do horário agendado (automático)",
                "content": [
                    "Nome do cliente",
                    "Nome da barbearia", 
                    "Serviço",
                    "Horário",
                    "Valor",
                    "Localização"
                ],
                "example": """⏰ *Lembrete de Agendamento*

Olá João!

Seu horário na *Barbearia Demo Premium* é daqui a 30 minutos!

📅 Hoje às 14:00
💇 Corte + Barba
💰 R$ 50,00

📍 Rua Demonstração, 123 - São Paulo

Estamos te esperando! 💈"""
            },
            {
                "type": "vip_notification",
                "trigger": "Quando o dono marca um cliente como VIP",
                "content": [
                    "Nome do cliente",
                    "Nome da barbearia",
                    "Percentual de desconto"
                ],
                "example": """🌟 *Parabéns, você é VIP!*

Olá Maria!

Você agora faz parte dos clientes especiais da *Barbearia Demo Premium*!

🎁 Seu benefício: *15% de desconto* em todos os serviços!

Agende seu próximo horário e aproveite! 💈"""
            },
            {
                "type": "payment_reminder",
                "trigger": "3 dias antes da renovação da assinatura (para donos)",
                "content": [
                    "Nome do plano",
                    "Valor",
                    "Data de renovação"
                ],
                "example": """💳 *Lembrete de Renovação*

Olá!

Sua assinatura do *Plano Premium* será renovada em 3 dias.

💰 Valor: R$ 99,90
📅 Data: 01/02/2026

Certifique-se de que seu método de pagamento está atualizado!"""
            },
            {
                "type": "payment_failed",
                "trigger": "Quando uma cobrança falha",
                "content": [
                    "Nome do plano",
                    "Motivo da falha",
                    "Instruções para regularização"
                ],
                "example": """⚠️ *Falha no Pagamento*

Olá!

Não conseguimos processar o pagamento da sua assinatura do *Plano Premium*.

Por favor, verifique seu método de pagamento e tente novamente.

Acesse: https://barberhubpro.com.br/assinatura"""
            },
            {
                "type": "payment_success",
                "trigger": "Quando um pagamento é confirmado",
                "content": [
                    "Nome do plano",
                    "Valor pago",
                    "Próxima renovação"
                ],
                "example": """✅ *Pagamento Confirmado!*

Sua assinatura do *Plano Premium* foi renovada com sucesso!

💰 Valor: R$ 99,90
📅 Próxima renovação: 01/03/2026

Obrigado por usar o BarberHub! 💈"""
            }
        ],
        "scheduler_jobs": [
            {
                "job": "check_and_send_reminders",
                "frequency": "A cada 5 minutos",
                "description": "Verifica agendamentos próximos e envia lembretes 30 min antes"
            },
            {
                "job": "check_expired_subscriptions", 
                "frequency": "A cada 1 hora",
                "description": "Verifica assinaturas expiradas e envia alertas"
            },
            {
                "job": "process_recurring_billing",
                "frequency": "A cada 12 horas",
                "description": "Processa cobranças recorrentes via Mercado Pago"
            }
        ],
        "api_details": {
            "provider": "Twilio",
            "endpoint": "https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json",
            "authentication": "Basic Auth (Account SID + Auth Token)",
            "phone_format": "E.164 format (ex: +5564999766685)"
        },
        "notes": [
            "As mensagens são enviadas apenas se TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_WHATSAPP_NUMBER estiverem configurados",
            "Os números de telefone são normalizados automaticamente para o formato E.164",
            "Em caso de falha no envio, o erro é logado mas não interrompe o fluxo",
            "O sistema funciona mesmo sem WhatsApp (as mensagens simplesmente não são enviadas)"
        ]
    }

@api_router.post("/super-admin/cleanup-database")
async def super_admin_cleanup_database(admin: dict = Depends(verify_super_admin)):
    """Clean database keeping only demo-premium account"""
    
    # Get demo-premium barbershop
    demo_barbershop = await db.barbershops.find_one({"slug": "demo-premium"})
    demo_barbershop_id = demo_barbershop["barbershop_id"] if demo_barbershop else None
    
    # Get demo user
    demo_user = await db.users.find_one({"email": "demo@barberpro.com"})
    demo_user_id = demo_user["user_id"] if demo_user else None
    
    deleted_counts = {}
    
    # Delete all barbershops except demo-premium
    if demo_barbershop_id:
        result = await db.barbershops.delete_many({"barbershop_id": {"$ne": demo_barbershop_id}})
        deleted_counts["barbershops"] = result.deleted_count
    else:
        result = await db.barbershops.delete_many({})
        deleted_counts["barbershops"] = result.deleted_count
    
    # Delete all users except demo user and clients
    if demo_user_id:
        result = await db.users.delete_many({
            "user_id": {"$ne": demo_user_id},
            "role": "barber"
        })
        deleted_counts["barber_users"] = result.deleted_count
    else:
        result = await db.users.delete_many({"role": "barber"})
        deleted_counts["barber_users"] = result.deleted_count
    
    # Delete all services except demo's
    if demo_barbershop_id:
        result = await db.services.delete_many({"barbershop_id": {"$ne": demo_barbershop_id}})
        deleted_counts["services"] = result.deleted_count
    else:
        result = await db.services.delete_many({})
        deleted_counts["services"] = result.deleted_count
    
    # Delete all professionals except demo's
    if demo_barbershop_id:
        result = await db.professionals.delete_many({"barbershop_id": {"$ne": demo_barbershop_id}})
        deleted_counts["professionals"] = result.deleted_count
    else:
        result = await db.professionals.delete_many({})
        deleted_counts["professionals"] = result.deleted_count
    
    # Delete all appointments except demo's
    if demo_barbershop_id:
        result = await db.appointments.delete_many({"barbershop_id": {"$ne": demo_barbershop_id}})
        deleted_counts["appointments"] = result.deleted_count
    else:
        result = await db.appointments.delete_many({})
        deleted_counts["appointments"] = result.deleted_count
    
    # Delete all subscriptions except demo's
    if demo_barbershop_id:
        result = await db.subscriptions.delete_many({"barbershop_id": {"$ne": demo_barbershop_id}})
        deleted_counts["subscriptions"] = result.deleted_count
    else:
        result = await db.subscriptions.delete_many({})
        deleted_counts["subscriptions"] = result.deleted_count
    
    # Delete all VIP clients except demo's
    if demo_barbershop_id:
        result = await db.vip_clients.delete_many({"barbershop_id": {"$ne": demo_barbershop_id}})
        deleted_counts["vip_clients"] = result.deleted_count
    else:
        result = await db.vip_clients.delete_many({})
        deleted_counts["vip_clients"] = result.deleted_count
    
    # Delete all blocked times except demo's
    if demo_barbershop_id:
        result = await db.blocked_times.delete_many({"barbershop_id": {"$ne": demo_barbershop_id}})
        deleted_counts["blocked_times"] = result.deleted_count
    else:
        result = await db.blocked_times.delete_many({})
        deleted_counts["blocked_times"] = result.deleted_count
    
    # Delete all payments except demo's
    if demo_barbershop_id:
        result = await db.payments.delete_many({"barbershop_id": {"$ne": demo_barbershop_id}})
        deleted_counts["payments"] = result.deleted_count
    else:
        result = await db.payments.delete_many({})
        deleted_counts["payments"] = result.deleted_count
    
    # Clean client users (keep structure but remove all)
    result = await db.users.delete_many({"role": "client"})
    deleted_counts["client_users"] = result.deleted_count
    
    return {
        "success": True,
        "message": "Banco de dados limpo com sucesso!",
        "kept": {
            "demo_barbershop": demo_barbershop_id,
            "demo_user": demo_user_id
        },
        "deleted": deleted_counts
    }


# ==================== MAIN APP SETUP ====================

# CORS configuration - MUST be added BEFORE routes for preflight to work
# When using credentials, cannot use wildcard origins
cors_origins_env = os.environ.get('CORS_ORIGINS', '')
if cors_origins_env and cors_origins_env != '*':
    allowed_origins = [origin.strip() for origin in cors_origins_env.split(',')]
else:
    # Default production origins - CORS with credentials requires explicit origins
    allowed_origins = [
        "https://barberhubpro.com.br",
        "https://www.barberhubpro.com.br",
        "https://barberhub-25.preview.emergentagent.com",
        "http://localhost:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router)

# Mount uploads directory for serving static files
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

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
