from fastapi import APIRouter, Depends, HTTPException, status

from database import dict_cursor, get_db_connection
from dependencies import get_current_user
from models.user import TokenResponse, UserLoginRequest, UserPublic, UserRegisterRequest
from utils.responses import ok
from utils.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegisterRequest, conn=Depends(get_db_connection)):
    """Register a new user account with default user role."""
    cur = dict_cursor(conn)

    cur.execute("SELECT role_id FROM roles WHERE LOWER(role_name) = 'user' LIMIT 1")
    role = cur.fetchone()
    if not role:
        cur.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Default user role not found")

    password_hash = hash_password(payload.password)

    try:
        cur.execute(
            """
            INSERT INTO users (role_id, username, email, password_hash, is_active)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING user_id, role_id, username, email, is_active, created_at
            """,
            (role["role_id"], payload.username, payload.email, password_hash, True),
        )
        user = cur.fetchone()
        conn.commit()
    except Exception as exc:  # noqa: BLE001
        conn.rollback()
        cur.close()
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unable to register user") from exc

    cur.close()
    return ok(data=UserPublic.model_validate(user).model_dump(mode="json"), message="User registered successfully", status_code=201)


@router.post("/login", response_model=None)
def login_user(payload: UserLoginRequest, conn=Depends(get_db_connection)):
    """Authenticate user credentials and return a JWT bearer token."""
    cur = dict_cursor(conn)
    cur.execute(
        """
        SELECT user_id, role_id, username, email, password_hash, is_active, created_at
        FROM users
        WHERE LOWER(email) = LOWER(%s)
        LIMIT 1
        """,
        (payload.email,),
    )
    user = cur.fetchone()
    cur.close()

    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(subject=str(user["user_id"]))
    token_data = TokenResponse(access_token=token)

    return ok(
        data={
            "token": token_data.model_dump(),
            "user": UserPublic.model_validate(user).model_dump(mode="json"),
        },
        message="Login successful",
    )


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    """Return the currently authenticated user profile."""
    return ok(data=current_user, message="Current user fetched successfully")
