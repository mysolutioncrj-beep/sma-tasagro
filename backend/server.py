"""Agro MLM — Binary MLM + E-commerce backend.

Single-file FastAPI app with:
- JWT auth (httpOnly cookies, bcrypt)
- Binary tree placement (BFS spillover)
- Kit purchase + direct referral commission ladder (24 levels)
- Monthly cashback scheduler (24 x ₹1000)
- Product orders + team level profit commissions
- Milestone rewards (25+ direct recruits, business targets)
- Wallet ledger, withdrawals
- Admin endpoints
"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import secrets
import string
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware


# ---------------------------------------------------------------------------
# Config & DB
# ---------------------------------------------------------------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@example.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
KIT_PRICE = float(os.environ.get("KIT_PRICE", "10000"))
KIT_MONTHLY_CASHBACK = float(os.environ.get("KIT_MONTHLY_CASHBACK", "1000"))
KIT_CASHBACK_MONTHS = int(os.environ.get("KIT_CASHBACK_MONTHS", "24"))

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Agro MLM API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("agro-mlm")


# ---------------------------------------------------------------------------
# Commission rate maps (from reference images)
# ---------------------------------------------------------------------------
# Direct Referral Bonus on kit purchase: paid up the sponsor chain 24 levels
DIRECT_BONUS_MAP = {
    1: 0.05,
    2: 0.02,
    3: 0.02,
    **{i: 0.01 for i in range(4, 10)},
    **{i: 0.005 for i in range(10, 17)},
    17: 0.0,
    **{i: 0.0025 for i in range(18, 25)},
}

# Team level profit on product orders (applied to order profit)
TEAM_LEVEL_MAP = {
    **{i: 0.10 for i in range(1, 5)},
    5: 0.05,
    6: 0.03,
    7: 0.02,
    **{i: 0.01 for i in range(8, 11)},
    **{i: 0.005 for i in range(11, 25)},
}

# Milestone business rewards
MILESTONE_TIERS = [
    {"tier": 1, "target": 250000, "bonus": 5000, "salary": 1000, "months": 10},
    {"tier": 2, "target": 500000, "bonus": 10000, "salary": 2000, "months": 10},
    {"tier": 3, "target": 1000000, "bonus": 20000, "salary": 3500, "months": 10},
    {"tier": 4, "target": 2000000, "bonus": 50000, "salary": 5000, "months": 10},
    {"tier": 5, "target": 5000000, "bonus": 250000, "salary": 10000, "months": 15},
    {"tier": 6, "target": 10000000, "bonus": 500000, "salary": 20000, "months": 15},
    {"tier": 7, "target": 20000000, "bonus": 1000000, "salary": 25000, "months": 20},
    {"tier": 8, "target": 50000000, "bonus": 2000000, "salary": 50000, "months": 20},
    {"tier": 9, "target": 100000000, "bonus": 4000000, "salary": 100000, "months": 25},
    {"tier": 10, "target": 200000000, "bonus": 8000000, "salary": 200000, "months": 25},
    {"tier": 12, "target": 1000000000, "bonus": 32000000, "salary": 500000, "months": 40},
]

DEFAULT_PROFIT_MARGIN = 0.10  # used if a product has no profit field


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": now_utc() + timedelta(hours=2),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "type": "refresh", "exp": now_utc() + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=7200, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


def gen_referral_code(name: str) -> str:
    base = "".join(c for c in (name or "USR").upper() if c.isalpha())[:4] or "USR"
    suffix = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(5))
    return f"{base}{suffix}"


def serialize_user(u: dict) -> dict:
    return {
        "id": str(u["_id"]),
        "email": u["email"],
        "name": u["name"],
        "phone": u.get("phone", ""),
        "role": u.get("role", "user"),
        "referral_code": u.get("referral_code"),
        "sponsor_id": u.get("sponsor_id"),
        "sponsor_code": u.get("sponsor_code"),
        "placement_parent_id": u.get("placement_parent_id"),
        "position": u.get("position"),
        "kit_purchased": u.get("kit_purchased", False),
        "kit_purchased_at": u.get("kit_purchased_at"),
        "wallet_balance": u.get("wallet_balance", 0.0),
        "total_earnings": u.get("total_earnings", 0.0),
        "direct_referrals_count": u.get("direct_referrals_count", 0),
        "team_business": u.get("team_business", 0.0),
        "highest_milestone_tier": u.get("highest_milestone_tier", 0),
        "created_at": u.get("created_at"),
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ---------------------------------------------------------------------------
# Binary tree placement
# ---------------------------------------------------------------------------
async def find_placement_slot(sponsor_id: str) -> tuple[str, str]:
    """BFS from sponsor to find first empty L/R slot; returns (parent_id, position)."""
    queue = [sponsor_id]
    while queue:
        current_id = queue.pop(0)
        left = await db.users.find_one({"placement_parent_id": current_id, "position": "L"})
        if not left:
            return current_id, "L"
        right = await db.users.find_one({"placement_parent_id": current_id, "position": "R"})
        if not right:
            return current_id, "R"
        queue.append(str(left["_id"]))
        queue.append(str(right["_id"]))
    return sponsor_id, "L"  # fallback


# ---------------------------------------------------------------------------
# Wallet & commissions
# ---------------------------------------------------------------------------
async def credit_wallet(user_id: str, amount: float, tx_type: str, description: str,
                        source_user_id: Optional[str] = None, level: Optional[int] = None) -> None:
    if amount <= 0:
        return
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$inc": {"wallet_balance": amount, "total_earnings": amount}},
    )
    await db.wallet_transactions.insert_one({
        "user_id": user_id,
        "type": tx_type,
        "amount": amount,
        "source_user_id": source_user_id,
        "level": level,
        "description": description,
        "created_at": now_utc().isoformat(),
    })


async def distribute_direct_referral_bonus(buyer: dict) -> None:
    """Pay kit-purchase commissions up sponsor chain (24 levels)."""
    kit_amount = KIT_PRICE
    current_sponsor_id = buyer.get("sponsor_id")
    level = 1
    while current_sponsor_id and level <= 24:
        rate = DIRECT_BONUS_MAP.get(level, 0)
        if rate > 0:
            amt = round(kit_amount * rate, 2)
            await credit_wallet(
                user_id=current_sponsor_id,
                amount=amt,
                tx_type="direct_referral",
                description=f"Kit purchase by {buyer['name']} at L{level}",
                source_user_id=str(buyer["_id"]),
                level=level,
            )
        sponsor = await db.users.find_one({"_id": ObjectId(current_sponsor_id)}, {"sponsor_id": 1})
        if not sponsor:
            break
        current_sponsor_id = sponsor.get("sponsor_id")
        level += 1


async def distribute_team_level_profit(buyer: dict, order_profit: float, order_id: str) -> None:
    """Pay team level profit up sponsor chain (24 levels)."""
    current_sponsor_id = buyer.get("sponsor_id")
    level = 1
    while current_sponsor_id and level <= 24:
        rate = TEAM_LEVEL_MAP.get(level, 0)
        if rate > 0:
            amt = round(order_profit * rate, 2)
            await credit_wallet(
                user_id=current_sponsor_id,
                amount=amt,
                tx_type="team_level",
                description=f"Order {order_id[:8]} L{level} profit share",
                source_user_id=str(buyer["_id"]),
                level=level,
            )
        sponsor = await db.users.find_one({"_id": ObjectId(current_sponsor_id)}, {"sponsor_id": 1})
        if not sponsor:
            break
        current_sponsor_id = sponsor.get("sponsor_id")
        level += 1


async def schedule_monthly_cashback(user_id: str) -> None:
    start = now_utc()
    docs = []
    for m in range(1, KIT_CASHBACK_MONTHS + 1):
        docs.append({
            "user_id": user_id,
            "month_index": m,
            "due_date": (start + timedelta(days=30 * m)).isoformat(),
            "amount": KIT_MONTHLY_CASHBACK,
            "paid": False,
            "paid_at": None,
        })
    await db.cashback_schedule.insert_many(docs)


async def update_sponsor_direct_count_and_milestones(sponsor_id: str) -> None:
    """Increment sponsor's direct count & business volume; award milestone if crossed."""
    sponsor = await db.users.find_one({"_id": ObjectId(sponsor_id)})
    if not sponsor:
        return
    new_count = sponsor.get("direct_referrals_count", 0) + 1
    new_biz = sponsor.get("team_business", 0.0) + KIT_PRICE
    await db.users.update_one(
        {"_id": ObjectId(sponsor_id)},
        {"$set": {"direct_referrals_count": new_count, "team_business": new_biz}},
    )
    # Check milestones (based on team_business target)
    current_tier = sponsor.get("highest_milestone_tier", 0)
    for tier in MILESTONE_TIERS:
        if tier["tier"] <= current_tier:
            continue
        if new_biz >= tier["target"]:
            # award one-time bonus + schedule salary
            await credit_wallet(
                user_id=sponsor_id,
                amount=tier["bonus"],
                tx_type="milestone_bonus",
                description=f"Milestone tier {tier['tier']}: ₹{tier['bonus']} bonus",
            )
            # schedule salary
            start = now_utc()
            salary_docs = []
            for m in range(1, tier["months"] + 1):
                salary_docs.append({
                    "user_id": sponsor_id,
                    "tier": tier["tier"],
                    "month_index": m,
                    "due_date": (start + timedelta(days=30 * m)).isoformat(),
                    "amount": tier["salary"],
                    "paid": False,
                    "paid_at": None,
                })
            if salary_docs:
                await db.milestone_salary_schedule.insert_many(salary_docs)
            await db.users.update_one(
                {"_id": ObjectId(sponsor_id)},
                {"$set": {"highest_milestone_tier": tier["tier"]}},
            )


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)
    phone: str = ""
    sponsor_code: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class KitPurchaseIn(BaseModel):
    payment_method: Literal["mock", "upi", "bank"] = "mock"


class WithdrawIn(BaseModel):
    amount: float = Field(gt=0)
    method: Literal["bank", "upi"] = "bank"
    details: str = ""


class ProductIn(BaseModel):
    name: str
    description: str = ""
    price: float
    category_id: Optional[str] = None
    image: str = ""
    stock: int = 100
    profit_margin: float = DEFAULT_PROFIT_MARGIN


class CategoryIn(BaseModel):
    name: str
    slug: str = ""


class OfferIn(BaseModel):
    title: str
    type: Literal["bogo", "discount", "festive"] = "discount"
    product_ids: List[str] = []
    discount_pct: float = 0
    banner_image: str = ""
    active: bool = True


class OrderItemIn(BaseModel):
    product_id: str
    quantity: int = Field(gt=0)


class OrderIn(BaseModel):
    items: List[OrderItemIn]
    address: str = ""


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@api.post("/auth/register")
async def register(data: RegisterIn, response: Response):
    email = data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    sponsor = None
    sponsor_id = None
    placement_parent_id = None
    position = None

    if data.sponsor_code:
        sponsor = await db.users.find_one({"referral_code": data.sponsor_code.upper()})
        if not sponsor:
            raise HTTPException(status_code=400, detail="Invalid sponsor code")
        sponsor_id = str(sponsor["_id"])
        placement_parent_id, position = await find_placement_slot(sponsor_id)

    # generate unique referral code
    for _ in range(10):
        ref = gen_referral_code(data.name)
        if not await db.users.find_one({"referral_code": ref}):
            break
    else:
        ref = f"USR{secrets.token_hex(4).upper()}"

    user_doc = {
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "phone": data.phone,
        "role": "user",
        "referral_code": ref,
        "sponsor_id": sponsor_id,
        "sponsor_code": data.sponsor_code.upper() if data.sponsor_code else None,
        "placement_parent_id": placement_parent_id,
        "position": position,
        "kit_purchased": False,
        "kit_purchased_at": None,
        "wallet_balance": 0.0,
        "total_earnings": 0.0,
        "direct_referrals_count": 0,
        "team_business": 0.0,
        "highest_milestone_tier": 0,
        "created_at": now_utc().isoformat(),
    }
    res = await db.users.insert_one(user_doc)
    user_doc["_id"] = res.inserted_id

    access = create_access_token(str(res.inserted_id), email)
    refresh = create_refresh_token(str(res.inserted_id))
    set_auth_cookies(response, access, refresh)
    return serialize_user(user_doc)


@api.post("/auth/login")
async def login(data: LoginIn, response: Response, request: Request):
    email = data.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"

    # brute force lock check
    la = await db.login_attempts.find_one({"identifier": identifier})
    if la and la.get("locked_until") and datetime.fromisoformat(la["locked_until"]) > now_utc():
        raise HTTPException(status_code=429, detail="Too many failed attempts. Try later.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        count = (la or {}).get("count", 0) + 1
        update = {"identifier": identifier, "count": count, "last_attempt": now_utc().isoformat()}
        if count >= 5:
            update["locked_until"] = (now_utc() + timedelta(minutes=15)).isoformat()
            update["count"] = 0
        await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_one({"identifier": identifier})
    access = create_access_token(str(user["_id"]), email)
    refresh = create_refresh_token(str(user["_id"]))
    set_auth_cookies(response, access, refresh)
    return serialize_user(user)


@api.post("/auth/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return serialize_user(user)


# ---------------------------------------------------------------------------
# User endpoints
# ---------------------------------------------------------------------------
@api.get("/user/dashboard")
async def user_dashboard(user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    direct_count = await db.users.count_documents({"sponsor_id": uid})
    # team count = all descendants via sponsor
    total_team = await _count_downline(uid)
    # pending cashback next
    next_cashback = await db.cashback_schedule.find_one(
        {"user_id": uid, "paid": False}, {"_id": 0}, sort=[("due_date", 1)]
    )
    recent_tx = await db.wallet_transactions.find(
        {"user_id": uid}, {"_id": 0}
    ).sort("created_at", -1).to_list(10)
    return {
        "user": serialize_user(user),
        "stats": {
            "wallet_balance": user.get("wallet_balance", 0),
            "total_earnings": user.get("total_earnings", 0),
            "direct_referrals": direct_count,
            "total_team": total_team,
            "team_business": user.get("team_business", 0),
            "milestone_tier": user.get("highest_milestone_tier", 0),
        },
        "next_cashback": next_cashback,
        "recent_transactions": recent_tx,
    }


async def _count_downline(user_id: str) -> int:
    total = 0
    queue = [user_id]
    while queue:
        current = queue.pop(0)
        children = await db.users.find({"sponsor_id": current}, {"_id": 1}).to_list(10000)
        total += len(children)
        queue.extend([str(c["_id"]) for c in children])
    return total


@api.get("/user/tree")
async def user_tree(user: dict = Depends(get_current_user), depth: int = 4):
    return await _build_tree(str(user["_id"]), depth)


async def _build_tree(user_id: str, depth: int) -> dict:
    u = await db.users.find_one({"_id": ObjectId(user_id)})
    if not u:
        return None
    node = {
        "id": str(u["_id"]),
        "name": u["name"],
        "referral_code": u.get("referral_code"),
        "kit_purchased": u.get("kit_purchased", False),
        "position": u.get("position"),
        "left": None,
        "right": None,
    }
    if depth <= 0:
        return node
    left = await db.users.find_one({"placement_parent_id": user_id, "position": "L"})
    right = await db.users.find_one({"placement_parent_id": user_id, "position": "R"})
    if left:
        node["left"] = await _build_tree(str(left["_id"]), depth - 1)
    if right:
        node["right"] = await _build_tree(str(right["_id"]), depth - 1)
    return node


@api.get("/user/team")
async def user_team(user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    direct = await db.users.find(
        {"sponsor_id": uid}, {"password_hash": 0}
    ).to_list(1000)
    return [serialize_user(u) for u in direct]


@api.get("/user/wallet/transactions")
async def wallet_tx(user: dict = Depends(get_current_user), tx_type: Optional[str] = None):
    q = {"user_id": str(user["_id"])}
    if tx_type:
        q["type"] = tx_type
    tx = await db.wallet_transactions.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return tx


@api.post("/user/kit/purchase")
async def purchase_kit(data: KitPurchaseIn, user: dict = Depends(get_current_user)):
    if user.get("kit_purchased"):
        raise HTTPException(status_code=400, detail="Kit already purchased")
    # create kit order (auto-approved in mock mode for instant MVP)
    order_id = str(uuid.uuid4())
    order = {
        "order_id": order_id,
        "user_id": str(user["_id"]),
        "user_name": user["name"],
        "amount": KIT_PRICE,
        "payment_method": data.payment_method,
        "status": "approved",
        "created_at": now_utc().isoformat(),
        "approved_at": now_utc().isoformat(),
    }
    await db.kit_orders.insert_one(order)
    # mark user
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"kit_purchased": True, "kit_purchased_at": now_utc().isoformat()}},
    )
    # schedule monthly cashback
    await schedule_monthly_cashback(str(user["_id"]))
    # distribute direct referral commission up sponsor chain
    buyer = await db.users.find_one({"_id": user["_id"]})
    await distribute_direct_referral_bonus(buyer)
    # update sponsor direct counts + milestone check
    if buyer.get("sponsor_id"):
        await update_sponsor_direct_count_and_milestones(buyer["sponsor_id"])
    return {"order_id": order_id, "status": "approved", "message": "Kit purchased successfully"}


@api.post("/user/withdraw")
async def withdraw_request(data: WithdrawIn, user: dict = Depends(get_current_user)):
    if data.amount > user.get("wallet_balance", 0):
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")
    # deduct and create pending request
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$inc": {"wallet_balance": -data.amount}},
    )
    wid = str(uuid.uuid4())
    await db.withdrawals.insert_one({
        "withdrawal_id": wid,
        "user_id": str(user["_id"]),
        "user_name": user["name"],
        "amount": data.amount,
        "method": data.method,
        "details": data.details,
        "status": "pending",
        "created_at": now_utc().isoformat(),
    })
    await db.wallet_transactions.insert_one({
        "user_id": str(user["_id"]),
        "type": "withdrawal_request",
        "amount": -data.amount,
        "description": f"Withdrawal request via {data.method}",
        "created_at": now_utc().isoformat(),
    })
    return {"withdrawal_id": wid, "status": "pending"}


@api.get("/user/withdrawals")
async def my_withdrawals(user: dict = Depends(get_current_user)):
    w = await db.withdrawals.find({"user_id": str(user["_id"])}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return w


@api.get("/user/cashback")
async def my_cashback(user: dict = Depends(get_current_user)):
    schedule = await db.cashback_schedule.find({"user_id": str(user["_id"])}, {"_id": 0}).sort("month_index", 1).to_list(100)
    return schedule


# ---------------------------------------------------------------------------
# Shop / products
# ---------------------------------------------------------------------------
@api.get("/categories")
async def list_categories():
    cats = await db.categories.find({}, {"_id": 0}).to_list(500)
    return cats


@api.get("/products")
async def list_products(category_id: Optional[str] = None):
    q = {}
    if category_id:
        q["category_id"] = category_id
    prods = await db.products.find(q, {"_id": 0}).to_list(1000)
    return prods


@api.get("/offers")
async def list_offers():
    offers = await db.offers.find({"active": True}, {"_id": 0}).to_list(200)
    return offers


@api.post("/orders")
async def create_order(data: OrderIn, user: dict = Depends(get_current_user)):
    if not data.items:
        raise HTTPException(status_code=400, detail="No items")
    total = 0.0
    profit = 0.0
    enriched = []
    for it in data.items:
        p = await db.products.find_one({"product_id": it.product_id}, {"_id": 0})
        if not p:
            raise HTTPException(status_code=400, detail=f"Product {it.product_id} not found")
        line_total = p["price"] * it.quantity
        line_profit = line_total * p.get("profit_margin", DEFAULT_PROFIT_MARGIN)
        total += line_total
        profit += line_profit
        enriched.append({
            "product_id": it.product_id,
            "name": p["name"],
            "price": p["price"],
            "quantity": it.quantity,
            "line_total": line_total,
        })
    order_id = str(uuid.uuid4())
    order = {
        "order_id": order_id,
        "user_id": str(user["_id"]),
        "user_name": user["name"],
        "items": enriched,
        "total": total,
        "profit": profit,
        "address": data.address,
        "status": "placed",
        "created_at": now_utc().isoformat(),
    }
    await db.orders.insert_one(order)
    # distribute team level profit on the order profit
    buyer = await db.users.find_one({"_id": user["_id"]})
    await distribute_team_level_profit(buyer, profit, order_id)
    return {"order_id": order_id, "total": total, "status": "placed"}


@api.get("/orders")
async def my_orders(user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": str(user["_id"])}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------
@api.get("/admin/overview")
async def admin_overview(admin: dict = Depends(require_admin)):
    users_count = await db.users.count_documents({"role": "user"})
    kit_purchased = await db.users.count_documents({"kit_purchased": True})
    total_revenue = kit_purchased * KIT_PRICE
    pending_withdrawals = await db.withdrawals.count_documents({"status": "pending"})
    total_orders = await db.orders.count_documents({})
    pending_cashback = await db.cashback_schedule.count_documents({"paid": False})
    return {
        "users_count": users_count,
        "kit_purchased": kit_purchased,
        "total_revenue": total_revenue,
        "pending_withdrawals": pending_withdrawals,
        "total_orders": total_orders,
        "pending_cashback": pending_cashback,
    }


@api.get("/admin/users")
async def admin_users(admin: dict = Depends(require_admin)):
    users = await db.users.find({}, {"password_hash": 0}).sort("created_at", -1).to_list(5000)
    return [serialize_user(u) for u in users]


@api.get("/admin/kit-orders")
async def admin_kit_orders(admin: dict = Depends(require_admin), status: Optional[str] = None):
    q = {}
    if status:
        q["status"] = status
    orders = await db.kit_orders.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orders


@api.get("/admin/withdrawals")
async def admin_withdrawals(admin: dict = Depends(require_admin), status: Optional[str] = None):
    q = {}
    if status:
        q["status"] = status
    w = await db.withdrawals.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return w


@api.post("/admin/withdrawals/{withdrawal_id}/approve")
async def admin_approve_withdrawal(withdrawal_id: str, admin: dict = Depends(require_admin)):
    w = await db.withdrawals.find_one({"withdrawal_id": withdrawal_id})
    if not w:
        raise HTTPException(status_code=404, detail="Not found")
    if w["status"] != "pending":
        raise HTTPException(status_code=400, detail="Already processed")
    await db.withdrawals.update_one(
        {"withdrawal_id": withdrawal_id},
        {"$set": {"status": "approved", "approved_at": now_utc().isoformat()}},
    )
    await db.wallet_transactions.insert_one({
        "user_id": w["user_id"],
        "type": "withdrawal_approved",
        "amount": 0,
        "description": f"Withdrawal ₹{w['amount']} approved",
        "created_at": now_utc().isoformat(),
    })
    return {"ok": True}


@api.post("/admin/withdrawals/{withdrawal_id}/reject")
async def admin_reject_withdrawal(withdrawal_id: str, admin: dict = Depends(require_admin)):
    w = await db.withdrawals.find_one({"withdrawal_id": withdrawal_id})
    if not w:
        raise HTTPException(status_code=404, detail="Not found")
    if w["status"] != "pending":
        raise HTTPException(status_code=400, detail="Already processed")
    # refund amount
    await db.users.update_one(
        {"_id": ObjectId(w["user_id"])},
        {"$inc": {"wallet_balance": w["amount"]}},
    )
    await db.withdrawals.update_one(
        {"withdrawal_id": withdrawal_id},
        {"$set": {"status": "rejected", "approved_at": now_utc().isoformat()}},
    )
    return {"ok": True}


@api.post("/admin/cashback/run")
async def admin_run_cashback(admin: dict = Depends(require_admin)):
    """Pay all due monthly cashbacks (due_date <= now and not paid)."""
    now = now_utc()
    due = await db.cashback_schedule.find(
        {"paid": False, "due_date": {"$lte": now.isoformat()}}
    ).to_list(10000)
    paid_count = 0
    total = 0.0
    for item in due:
        await credit_wallet(
            user_id=item["user_id"],
            amount=item["amount"],
            tx_type="monthly_cashback",
            description=f"Month {item['month_index']}/24 kit cashback",
        )
        await db.cashback_schedule.update_one(
            {"_id": item["_id"]},
            {"$set": {"paid": True, "paid_at": now.isoformat()}},
        )
        paid_count += 1
        total += item["amount"]
    return {"paid_count": paid_count, "total_paid": total}


@api.post("/admin/cashback/run-all")
async def admin_run_all_cashback(admin: dict = Depends(require_admin)):
    """Pay ALL outstanding monthly cashbacks regardless of due_date (demo helper)."""
    due = await db.cashback_schedule.find({"paid": False}).to_list(100000)
    paid_count = 0
    total = 0.0
    for item in due:
        await credit_wallet(
            user_id=item["user_id"],
            amount=item["amount"],
            tx_type="monthly_cashback",
            description=f"Month {item['month_index']}/24 kit cashback (admin run)",
        )
        await db.cashback_schedule.update_one(
            {"_id": item["_id"]},
            {"$set": {"paid": True, "paid_at": now_utc().isoformat()}},
        )
        paid_count += 1
        total += item["amount"]
    return {"paid_count": paid_count, "total_paid": total}


@api.post("/admin/salary/run")
async def admin_run_salary(admin: dict = Depends(require_admin)):
    due = await db.milestone_salary_schedule.find(
        {"paid": False, "due_date": {"$lte": now_utc().isoformat()}}
    ).to_list(10000)
    paid = 0
    total = 0.0
    for item in due:
        await credit_wallet(
            user_id=item["user_id"],
            amount=item["amount"],
            tx_type="milestone_salary",
            description=f"Tier {item['tier']} salary month {item['month_index']}",
        )
        await db.milestone_salary_schedule.update_one(
            {"_id": item["_id"]},
            {"$set": {"paid": True, "paid_at": now_utc().isoformat()}},
        )
        paid += 1
        total += item["amount"]
    return {"paid_count": paid, "total_paid": total}


# --- Products / Categories / Offers CRUD ---
@api.post("/admin/categories")
async def admin_create_category(data: CategoryIn, admin: dict = Depends(require_admin)):
    cid = str(uuid.uuid4())
    doc = {
        "category_id": cid,
        "name": data.name,
        "slug": data.slug or data.name.lower().replace(" ", "-"),
        "created_at": now_utc().isoformat(),
    }
    await db.categories.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/admin/categories/{category_id}")
async def admin_delete_category(category_id: str, admin: dict = Depends(require_admin)):
    await db.categories.delete_one({"category_id": category_id})
    return {"ok": True}


@api.post("/admin/products")
async def admin_create_product(data: ProductIn, admin: dict = Depends(require_admin)):
    pid = str(uuid.uuid4())
    doc = {
        "product_id": pid,
        **data.model_dump(),
        "created_at": now_utc().isoformat(),
    }
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/admin/products/{product_id}")
async def admin_update_product(product_id: str, data: ProductIn, admin: dict = Depends(require_admin)):
    await db.products.update_one({"product_id": product_id}, {"$set": data.model_dump()})
    p = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    return p


@api.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, admin: dict = Depends(require_admin)):
    await db.products.delete_one({"product_id": product_id})
    return {"ok": True}


@api.post("/admin/offers")
async def admin_create_offer(data: OfferIn, admin: dict = Depends(require_admin)):
    oid = str(uuid.uuid4())
    doc = {
        "offer_id": oid,
        **data.model_dump(),
        "created_at": now_utc().isoformat(),
    }
    await db.offers.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/admin/offers/{offer_id}")
async def admin_delete_offer(offer_id: str, admin: dict = Depends(require_admin)):
    await db.offers.delete_one({"offer_id": offer_id})
    return {"ok": True}


@api.get("/admin/orders")
async def admin_orders(admin: dict = Depends(require_admin)):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return orders


@api.get("/admin/tree/{user_id}")
async def admin_user_tree(user_id: str, admin: dict = Depends(require_admin), depth: int = 6):
    return await _build_tree(user_id, depth)


# ---------------------------------------------------------------------------
# Public info endpoint (for landing page stats)
# ---------------------------------------------------------------------------
@api.get("/public/stats")
async def public_stats():
    users = await db.users.count_documents({"role": "user"})
    kit = await db.users.count_documents({"kit_purchased": True})
    return {
        "total_members": users,
        "active_kits": kit,
        "kit_price": KIT_PRICE,
        "monthly_cashback": KIT_MONTHLY_CASHBACK,
        "cashback_months": KIT_CASHBACK_MONTHS,
    }


@api.get("/public/plan")
async def public_plan():
    return {
        "kit_price": KIT_PRICE,
        "monthly_cashback": KIT_MONTHLY_CASHBACK,
        "cashback_months": KIT_CASHBACK_MONTHS,
        "direct_bonus_map": {str(k): v for k, v in DIRECT_BONUS_MAP.items()},
        "team_level_map": {str(k): v for k, v in TEAM_LEVEL_MAP.items()},
        "milestones": MILESTONE_TIERS,
    }


@api.get("/")
async def root():
    return {"service": "Agro MLM API", "status": "ok"}


# ---------------------------------------------------------------------------
# Startup — indexes + admin seed + sample products
# ---------------------------------------------------------------------------
async def seed_admin_and_sample_data():
    admin = await db.users.find_one({"email": ADMIN_EMAIL.lower()})
    if not admin:
        admin_doc = {
            "email": ADMIN_EMAIL.lower(),
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Admin",
            "phone": "",
            "role": "admin",
            "referral_code": "ADMIN001",
            "sponsor_id": None,
            "sponsor_code": None,
            "placement_parent_id": None,
            "position": None,
            "kit_purchased": True,
            "kit_purchased_at": now_utc().isoformat(),
            "wallet_balance": 0.0,
            "total_earnings": 0.0,
            "direct_referrals_count": 0,
            "team_business": 0.0,
            "highest_milestone_tier": 0,
            "created_at": now_utc().isoformat(),
        }
        await db.users.insert_one(admin_doc)
        logger.info("Admin seeded")
    elif not verify_password(ADMIN_PASSWORD, admin["password_hash"]):
        await db.users.update_one(
            {"email": ADMIN_EMAIL.lower()},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}},
        )

    # seed categories + products if none
    if await db.categories.count_documents({}) == 0:
        cats = [
            {"category_id": str(uuid.uuid4()), "name": "Organic Fertilizers", "slug": "organic-fertilizers", "created_at": now_utc().isoformat()},
            {"category_id": str(uuid.uuid4()), "name": "Bio Pesticides", "slug": "bio-pesticides", "created_at": now_utc().isoformat()},
            {"category_id": str(uuid.uuid4()), "name": "Seeds & Saplings", "slug": "seeds-saplings", "created_at": now_utc().isoformat()},
            {"category_id": str(uuid.uuid4()), "name": "Growth Enhancers", "slug": "growth-enhancers", "created_at": now_utc().isoformat()},
        ]
        await db.categories.insert_many(cats)
        sample_image = "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80"
        sample_products = []
        demo_list = [
            ("Gold Harvest Organic Compost", 450, cats[0]["category_id"]),
            ("Vermi Pro Fertilizer 5kg", 800, cats[0]["category_id"]),
            ("Neem Guard Bio Pesticide", 650, cats[1]["category_id"]),
            ("Agro Shield Spray 1L", 550, cats[1]["category_id"]),
            ("Premium Paddy Seeds 2kg", 380, cats[2]["category_id"]),
            ("Hybrid Tomato Seedlings Pack", 220, cats[2]["category_id"]),
            ("Root Max Growth Booster", 720, cats[3]["category_id"]),
            ("Flora Bloom Enhancer", 620, cats[3]["category_id"]),
        ]
        for name, price, cat_id in demo_list:
            sample_products.append({
                "product_id": str(uuid.uuid4()),
                "name": name,
                "description": "Premium quality agro product, ethically sourced.",
                "price": float(price),
                "category_id": cat_id,
                "image": sample_image,
                "stock": 100,
                "profit_margin": 0.10,
                "created_at": now_utc().isoformat(),
            })
        if sample_products:
            await db.products.insert_many(sample_products)

        # sample offer
        if await db.offers.count_documents({}) == 0:
            await db.offers.insert_one({
                "offer_id": str(uuid.uuid4()),
                "title": "Festive Sale — Buy 1 Get 1",
                "type": "bogo",
                "product_ids": [],
                "discount_pct": 0,
                "banner_image": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
                "active": True,
                "created_at": now_utc().isoformat(),
            })
        logger.info("Sample shop data seeded")


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("referral_code", unique=True, sparse=True)
    await db.users.create_index("sponsor_id")
    await db.users.create_index([("placement_parent_id", 1), ("position", 1)])
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.wallet_transactions.create_index([("user_id", 1), ("created_at", -1)])
    await db.cashback_schedule.create_index([("user_id", 1), ("month_index", 1)])
    await seed_admin_and_sample_data()
    logger.info("Startup complete")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://sma-tasagro-yr9p.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
