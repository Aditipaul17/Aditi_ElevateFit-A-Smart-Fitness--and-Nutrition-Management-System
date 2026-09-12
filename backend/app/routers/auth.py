from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.database import users_collection
from app.models.schemas import Token, UserCreate, UserOut, UserProfileUpdate

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def _serialize_user(user: dict) -> UserOut:
    return UserOut(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        age=user.get("age"),
        gender=user.get("gender"),
        height=user.get("height"),
        weight=user.get("weight"),
        fitness_goal=user.get("fitness_goal"),
        activity_level=user.get("activity_level"),
        dietary_preference=user.get("dietary_preference"),
        workout_experience=user.get("workout_experience"),
        equipment=user.get("equipment"),
        created_at=user.get("created_at"),
        updated_at=user.get("updated_at"),
    )


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise credentials_error
    except Exception:
        raise credentials_error

    try:
        object_id = ObjectId(user_id)
    except (InvalidId, TypeError):
        raise credentials_error

    user = await users_collection.find_one({"_id": object_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate):
    normalized_email = payload.email.lower().strip()

    existing = await users_collection.find_one({"email": normalized_email})
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    now = datetime.now(timezone.utc)
    doc = {
        "name": payload.name.strip(),
        "email": normalized_email,
        "hashed_password": hash_password(payload.password),
        "age": None,
        "gender": None,
        "height": None,
        "weight": None,
        "fitness_goal": None,
        "activity_level": None,
        "dietary_preference": None,
        "workout_experience": None,
        "equipment": None,
        "created_at": now,
        "updated_at": now,
    }

    try:
        result = await users_collection.insert_one(doc)
    except Exception:
        # Guards against a race condition on the unique email index.
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    token = create_access_token(subject=str(result.inserted_id))
    return Token(access_token=token)


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    normalized_email = form_data.username.lower().strip()
    user = await users_collection.find_one({"email": normalized_email})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(subject=str(user["_id"]))
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
async def read_current_user(current_user: dict = Depends(get_current_user)):
    return _serialize_user(current_user)


@router.patch("/me", response_model=UserOut)
async def update_current_user(
    payload: UserProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items()}
    if updates:
        updates["updated_at"] = datetime.now(timezone.utc)
        await users_collection.update_one(
            {"_id": current_user["_id"]},
            {"$set": updates},
        )
    refreshed = await users_collection.find_one({"_id": current_user["_id"]})
    return _serialize_user(refreshed)
