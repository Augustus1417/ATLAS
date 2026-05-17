from datetime import datetime, timedelta, timezone
from typing import Any
import secrets
import logging
from pathlib import Path

from jose import JWTError, jwt
from passlib.context import CryptContext

from config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
DEV_JWT_SECRET_PATH = Path(__file__).resolve().parents[1] / ".dev_jwt_secret"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def _ensure_jwt_secret() -> None:
    """Ensure `settings.jwt_secret_key` has a value; generate or reuse a local dev secret if missing."""
    try:
        has = bool(getattr(settings, "jwt_secret_key", None))
    except Exception:
        has = False

    if not has:
        secret = None
        try:
            if DEV_JWT_SECRET_PATH.exists():
                secret = DEV_JWT_SECRET_PATH.read_text(encoding="utf-8").strip() or None
            if not secret:
                secret = secrets.token_hex(32)
                DEV_JWT_SECRET_PATH.write_text(secret + "\n", encoding="utf-8")
        except Exception:
            secret = secrets.token_hex(32)
            logging.warning("Unable to persist dev JWT secret to disk; using in-memory fallback")

        try:
            settings.jwt_secret_key = secret
        except Exception:
            logging.warning("Unable to persist jwt_secret_key on settings; using temporary secret in-memory")

        logging.warning(
            "JWT secret key not provided; using a local dev secret.\n"
            "For persistent setups, set JWT_SECRET_KEY in your environment or .env file."
        )


def create_access_token(subject: str, expires_minutes: int | None = None) -> str:
    _ensure_jwt_secret()
    expire_delta = timedelta(minutes=expires_minutes or settings.jwt_expire_minutes)
    expire_at = datetime.now(timezone.utc) + expire_delta
    payload: dict[str, Any] = {"sub": subject, "exp": expire_at}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    _ensure_jwt_secret()
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc
