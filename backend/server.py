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

# Helper function to convert MongoDB documents
def serialize_doc(doc):
    """Convert MongoDB document to JSON serializable format"""
    if doc is None:
        return None
    
    # Convert ObjectId to string
    if '_id' in doc:
        doc['_id'] = str(doc['_id'])
    
    # Convert datetime objects to ISO format
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    
    return doc

def serialize_docs(docs):
    """Convert list of MongoDB documents to JSON serializable format"""
    if not docs:
        return []
    return [serialize_doc(doc) for doc in docs]

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
    status: str = "verde"  # verde, amarelo, vermelho, azul (manutenção)
    layout_type: str  # 16_fusos or 32_fusos
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Maintenance(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    machine_number: int
    layout_type: str
    motivo: str
    status: str = "em_manutencao"  # em_manutencao, finalizada
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    finished_at: Optional[datetime] = None
    finished_by: Optional[str] = None

class MaintenanceCreate(BaseModel):
    machine_number: int
    layout_type: str
    motivo: str

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    machine_number: int
    layout_type: str
    cliente: str
    artigo: str
    cor: str
    quantidade: str  # Changed to string to allow letters and numbers
    observacao: str = ""
    status: str = "pendente"  # pendente, em_producao, finalizado
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    observacao_liberacao: str = ""
    laudo_final: str = ""

class OrderCreate(BaseModel):
    machine_number: int
    layout_type: str
    cliente: str
    artigo: str
    cor: str
    quantidade: str  # Changed to string to allow letters and numbers
    observacao: str = ""

class OrderUpdate(BaseModel):
    status: str
    observacao_liberacao: str = ""
    laudo_final: str = ""

class StatusHistory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    machine_number: int
    layout_type: str
    old_status: str
    new_status: str
    changed_by: str
    changed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    order_id: Optional[str] = None
    maintenance_id: Optional[str] = None

class Espula(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cliente: str
    artigo: str
    cor: str
    quantidade: str  # Changed to string to allow letters and numbers
    observacoes: str = ""
    data_lancamento: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    data_prevista_entrega: datetime
    status: str = "pendente"  # pendente, em_producao_aguardando, producao, finalizado
    created_by: str
    finished_at: Optional[datetime] = None

class EspulaCreate(BaseModel):
    cliente: str
    artigo: str
    cor: str
    quantidade: str
    observacoes: str = ""
    data_prevista_entrega: str  # Will be converted to datetime

class EspulaUpdate(BaseModel):
    status: str

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
        if layout == "16_fusos":
            # 24 machines for 16 fusos layout as per the image
            max_machines = 24
        else:
            max_machines = 33
        
        for i in range(1, max_machines + 1):
            machine_exists = await db.machines.find_one({"number": i, "layout_type": layout})
            if not machine_exists:
                machine = Machine(number=i, layout_type=layout)
                machine_dict = machine.dict()
                # Create unique ID based on number and layout
                machine_dict["id"] = f"{layout}_{i}_{str(uuid.uuid4())[:8]}"
                await db.machines.insert_one(machine_dict)

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

# Maintenance routes
@api_router.post("/maintenance", response_model=Maintenance)
async def create_maintenance(maintenance_data: MaintenanceCreate, current_user: User = Depends(get_current_user)):
    # Check if machine exists and is available
    machine = await db.machines.find_one({
        "number": maintenance_data.machine_number,
        "layout_type": maintenance_data.layout_type
    })
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    if machine["status"] != "verde":
        raise HTTPException(status_code=400, detail="Machine must be available to enter maintenance")
    
    maintenance = Maintenance(
        machine_number=maintenance_data.machine_number,
        layout_type=maintenance_data.layout_type,
        motivo=maintenance_data.motivo,
        created_by=current_user.username
    )
    
    await db.maintenance.insert_one(maintenance.dict())
    
    # Update machine status to azul (maintenance)
    await db.machines.update_one(
        {"number": maintenance_data.machine_number, "layout_type": maintenance_data.layout_type},
        {"$set": {"status": "azul", "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Record status history
    history = StatusHistory(
        machine_number=maintenance_data.machine_number,
        layout_type=maintenance_data.layout_type,
        old_status="verde",
        new_status="azul",
        changed_by=current_user.username,
        maintenance_id=maintenance.id
    )
    await db.status_history.insert_one(history.dict())
    
    return maintenance

@api_router.get("/maintenance", response_model=List[Maintenance])
async def get_maintenance(current_user: User = Depends(get_current_user)):
    maintenances = await db.maintenance.find().sort("created_at", -1).to_list(1000)
    return [Maintenance(**m) for m in maintenances]

@api_router.put("/maintenance/{maintenance_id}/finish")
async def finish_maintenance(maintenance_id: str, current_user: User = Depends(get_current_user)):
    maintenance = await db.maintenance.find_one({"id": maintenance_id})
    if not maintenance:
        raise HTTPException(status_code=404, detail="Maintenance not found")
    
    if maintenance["status"] == "finalizada":
        raise HTTPException(status_code=400, detail="Maintenance already finished")
    
    # Update maintenance status
    await db.maintenance.update_one(
        {"id": maintenance_id},
        {
            "$set": {
                "status": "finalizada",
                "finished_at": datetime.now(timezone.utc),
                "finished_by": current_user.username
            }
        }
    )
    
    # Update machine status back to verde (available)
    await db.machines.update_one(
        {"number": maintenance["machine_number"], "layout_type": maintenance["layout_type"]},
        {"$set": {"status": "verde", "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Record status history
    history = StatusHistory(
        machine_number=maintenance["machine_number"],
        layout_type=maintenance["layout_type"],
        old_status="azul",
        new_status="verde",
        changed_by=current_user.username,
        maintenance_id=maintenance_id
    )
    await db.status_history.insert_one(history.dict())
    
    return {"message": "Maintenance finished successfully"}

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
    # Convert quantidade to string if it's an integer (for backward compatibility)
    for order in orders:
        if isinstance(order.get('quantidade'), int):
            order['quantidade'] = str(order['quantidade'])
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

# Espulas routes
@api_router.post("/espulas", response_model=Espula)
async def create_espula(espula_data: EspulaCreate, current_user: User = Depends(get_current_user)):
    try:
        # Convert string date to datetime
        data_prevista = datetime.fromisoformat(espula_data.data_prevista_entrega.replace('Z', '+00:00'))
        
        espula = Espula(
            cliente=espula_data.cliente,
            artigo=espula_data.artigo,
            cor=espula_data.cor,
            quantidade=espula_data.quantidade,
            observacoes=espula_data.observacoes,
            data_prevista_entrega=data_prevista,
            created_by=current_user.username
        )
        
        await db.espulas.insert_one(espula.dict())
        return espula
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating espula: {str(e)}")

@api_router.get("/espulas", response_model=List[Espula])
async def get_espulas(current_user: User = Depends(get_current_user)):
    # Get only non-finished espulas, sorted by delivery date
    espulas = await db.espulas.find({"status": {"$ne": "finalizado"}}).sort("data_prevista_entrega", 1).to_list(1000)
    return [Espula(**espula) for espula in espulas]

@api_router.get("/espulas/finished", response_model=List[Espula])
async def get_finished_espulas(current_user: User = Depends(get_current_user)):
    # Get finished espulas for reports
    espulas = await db.espulas.find({"status": "finalizado"}).sort("finished_at", -1).to_list(1000)
    return [Espula(**espula) for espula in espulas]

@api_router.put("/espulas/{espula_id}")
async def update_espula(
    espula_id: str, 
    espula_update: EspulaUpdate, 
    current_user: User = Depends(get_current_user)
):
    espula = await db.espulas.find_one({"id": espula_id})
    if not espula:
        raise HTTPException(status_code=404, detail="Espula not found")
    
    update_data = {"status": espula_update.status}
    
    if espula_update.status == "finalizado":
        update_data["finished_at"] = datetime.now(timezone.utc)
    
    await db.espulas.update_one({"id": espula_id}, {"$set": update_data})
    
    return {"message": "Espula updated successfully"}

@api_router.get("/espulas/report")
async def get_espulas_report(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        # Get finished espulas for report
        espulas = await db.espulas.find({"status": "finalizado"}).to_list(1000)
        
        # Serialize the data to make it JSON compatible
        serialized_espulas = serialize_docs(espulas)
        
        return {
            "espulas": serialized_espulas,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error exporting espulas report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating espulas report: {str(e)}")

# Reports routes
@api_router.get("/reports/status-history")
async def get_status_history(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    history = await db.status_history.find().sort("changed_at", -1).to_list(1000)
    return serialize_docs(history)

@api_router.get("/reports/maintenance")
async def get_maintenance_report(layout_type: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        # Get maintenance data for the report
        maintenance = await db.maintenance.find({"layout_type": layout_type}).to_list(1000)
        history = await db.status_history.find({
            "layout_type": layout_type,
            "$or": [{"new_status": "azul"}, {"old_status": "azul"}]
        }).to_list(1000)
        
        # Serialize the data to make it JSON compatible
        serialized_maintenance = serialize_docs(maintenance)
        serialized_history = serialize_docs(history)
        
        return {
            "maintenance": serialized_maintenance,
            "status_history": serialized_history,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "layout_type": layout_type
        }
    except Exception as e:
        logger.error(f"Error exporting maintenance report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating maintenance report: {str(e)}")

@api_router.get("/reports/export")
async def export_report(layout_type: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        # Get all data for the report
        orders = await db.orders.find({"layout_type": layout_type}).to_list(1000)
        history = await db.status_history.find({"layout_type": layout_type}).to_list(1000)
        
        # Serialize the data to make it JSON compatible
        serialized_orders = serialize_docs(orders)
        serialized_history = serialize_docs(history)
        
        return {
            "orders": serialized_orders,
            "status_history": serialized_history,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "layout_type": layout_type
        }
    except Exception as e:
        logger.error(f"Error exporting report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")

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