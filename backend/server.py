from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import jwt
import hashlib
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = "fusosmanager_secret_key_2024"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    role: str  # admin, operador_interno, operador_externo
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str

class UserLogin(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: User

class Machine(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    number: int
    status: str = "verde"  # verde, amarelo, vermelho
    layout_type: str  # 16_fusos or 32_fusos
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    machine_number: int
    layout_type: str
    cliente: str
    artigo: str
    cor: str
    quantidade: int
    observacao: str = ""
    status: str = "pendente"  # pendente, em_producao, finalizado
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    observacao_liberacao: str = ""
    laudo_final: str = ""  # New field for final report

class OrderCreate(BaseModel):
    machine_number: int
    layout_type: str
    cliente: str
    artigo: str
    cor: str
    quantidade: int
    observacao: str = ""

class OrderUpdate(BaseModel):
    status: str
    observacao_liberacao: str = ""
    laudo_final: str = ""  # New field for final report

class StatusHistory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    machine_number: int
    layout_type: str
    old_status: str
    new_status: str
    changed_by: str
    changed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    order_id: Optional[str] = None

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(user_id: str, username: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "username": username,
        "role": role,
        "exp": datetime.now(timezone.utc).timestamp() + (24 * 60 * 60)  # 24 hours
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Initialize data
async def init_data():
    # Create default users if they don't exist
    admin_exists = await db.users.find_one({"username": "admin"})
    if not admin_exists:
        admin_user = User(
            username="admin",
            email="admin@mercotextil.com",
            role="admin"
        )
        admin_dict = admin_user.dict()
        admin_dict["password"] = hash_password("admin123")
        await db.users.insert_one(admin_dict)

    interno_exists = await db.users.find_one({"username": "interno"})
    if not interno_exists:
        interno_user = User(
            username="interno",
            email="interno@mercotextil.com",
            role="operador_interno"
        )
        interno_dict = interno_user.dict()
        interno_dict["password"] = hash_password("interno123")
        await db.users.insert_one(interno_dict)

    externo_exists = await db.users.find_one({"username": "externo"})
    if not externo_exists:
        externo_user = User(
            username="externo",
            email="externo@mercotextil.com",
            role="operador_externo"
        )
        externo_dict = externo_user.dict()
        externo_dict["password"] = hash_password("externo123")
        await db.users.insert_one(externo_dict)

    # Initialize machines for both layouts
    for layout in ["16_fusos", "32_fusos"]:
        max_machines = 24 if layout == "16_fusos" else 33
        for i in range(1, max_machines + 1):
            machine_exists = await db.machines.find_one({"number": i, "layout_type": layout})
            if not machine_exists:
                machine = Machine(number=i, layout_type=layout)
                await db.machines.insert_one(machine.dict())

# Auth routes
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"username": login_data.username})
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user["active"]:
        raise HTTPException(status_code=401, detail="User inactive")
    
    token = create_access_token(user["id"], user["username"], user["role"])
    user_obj = User(**user)
    return LoginResponse(token=token, user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# User management routes (admin only)
@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if user already exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user = User(
        username=user_data.username,
        email=user_data.email,
        role=user_data.role
    )
    user_dict = user.dict()
    user_dict["password"] = hash_password(user_data.password)
    await db.users.insert_one(user_dict)
    return user

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    users = await db.users.find().to_list(1000)
    return [User(**user) for user in users]

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Don't allow admin to delete themselves
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

# Machine routes
@api_router.get("/machines/{layout_type}", response_model=List[Machine])
async def get_machines(layout_type: str, current_user: User = Depends(get_current_user)):
    machines = await db.machines.find({"layout_type": layout_type}).sort("number", 1).to_list(1000)
    return [Machine(**machine) for machine in machines]

@api_router.put("/machines/{machine_id}/status")
async def update_machine_status(
    machine_id: str, 
    status: str, 
    current_user: User = Depends(get_current_user)
):
    machine = await db.machines.find_one({"id": machine_id})
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    old_status = machine["status"]
    
    # Update machine status
    await db.machines.update_one(
        {"id": machine_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Record status history
    history = StatusHistory(
        machine_number=machine["number"],
        layout_type=machine["layout_type"],
        old_status=old_status,
        new_status=status,
        changed_by=current_user.username
    )
    await db.status_history.insert_one(history.dict())
    
    return {"message": "Status updated successfully"}

# Order routes
@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "operador_interno"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if machine exists and is available
    machine = await db.machines.find_one({
        "number": order_data.machine_number,
        "layout_type": order_data.layout_type
    })
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    if machine["status"] != "verde":
        raise HTTPException(status_code=400, detail="Machine not available")
    
    order = Order(
        machine_number=order_data.machine_number,
        layout_type=order_data.layout_type,
        cliente=order_data.cliente,
        artigo=order_data.artigo,
        cor=order_data.cor,
        quantidade=order_data.quantidade,
        observacao=order_data.observacao,
        created_by=current_user.username
    )
    
    await db.orders.insert_one(order.dict())
    
    # Update machine status to amarelo (pending)
    await db.machines.update_one(
        {"number": order_data.machine_number, "layout_type": order_data.layout_type},
        {"$set": {"status": "amarelo", "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Record status history
    history = StatusHistory(
        machine_number=order_data.machine_number,
        layout_type=order_data.layout_type,
        old_status="verde",
        new_status="amarelo",
        changed_by=current_user.username,
        order_id=order.id
    )
    await db.status_history.insert_one(history.dict())
    
    return order

@api_router.get("/orders", response_model=List[Order])
async def get_orders(current_user: User = Depends(get_current_user)):
    orders = await db.orders.find().sort("created_at", -1).to_list(1000)
    return [Order(**order) for order in orders]

@api_router.put("/orders/{order_id}")
async def update_order(
    order_id: str, 
    order_update: OrderUpdate, 
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "operador_externo"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {
        "observacao_liberacao": order_update.observacao_liberacao,
        "laudo_final": order_update.laudo_final
    }
    machine_status = "amarelo"
    
    if order_update.status == "em_producao":
        update_data["status"] = "em_producao"
        update_data["started_at"] = datetime.now(timezone.utc)
        machine_status = "vermelho"
    elif order_update.status == "finalizado":
        update_data["status"] = "finalizado"
        update_data["finished_at"] = datetime.now(timezone.utc)
        machine_status = "verde"
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Update machine status
    await db.machines.update_one(
        {"number": order["machine_number"], "layout_type": order["layout_type"]},
        {"$set": {"status": machine_status, "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Record status history
    history = StatusHistory(
        machine_number=order["machine_number"],
        layout_type=order["layout_type"],
        old_status=order["status"],
        new_status=order_update.status,
        changed_by=current_user.username,
        order_id=order_id
    )
    await db.status_history.insert_one(history.dict())
    
    return {"message": "Order updated successfully"}

# Reports routes
@api_router.get("/reports/status-history")
async def get_status_history(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    history = await db.status_history.find().sort("changed_at", -1).to_list(1000)
    return history

@api_router.get("/reports/export")
async def export_report(layout_type: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get all data for the report
    orders = await db.orders.find({"layout_type": layout_type}).to_list(1000)
    history = await db.status_history.find({"layout_type": layout_type}).to_list(1000)
    
    return {
        "orders": orders,
        "status_history": history,
        "generated_at": datetime.now(timezone.utc),
        "layout_type": layout_type
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await init_data()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()