from contextlib import asynccontextmanager
import logging

import psycopg2
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import builds, compatibility, components, pricing, recommendations, specs, users


def ensure_roles_exist() -> None:
    try:
        conn = psycopg2.connect(settings.database_url)
    except Exception as exc:
        logging.warning("Could not connect to database during startup: %s", exc)
        return

    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO roles (role_name, description)
            VALUES
                ('admin', 'Administrator role with elevated component management access'),
                ('user', 'Standard user role')
            ON CONFLICT (role_name) DO NOTHING
            """
        )
        conn.commit()
        cur.close()
    finally:
        conn.close()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    ensure_roles_exist()
    yield


app = FastAPI(
    title="ATLAS Backend API",
    description="Automated Technology Lookup and Analysis Service backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Temporary: allow all origins to diagnose frontend connectivity issues.
        # Revert to explicit origins after debugging.
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"data": None, "message": str(exc.detail)})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    # Log raw request body to help debug JSON decode / validation issues from the frontend.
    try:
        body = await _request.body()
        logging.warning("Request validation error. Raw body: %s", body.decode(errors="replace"))
    except Exception:
        logging.warning("Request validation error but failed to read raw body")
    return JSONResponse(status_code=422, content={"data": exc.errors(), "message": "Validation error"})


@app.get("/")
def health_check():
    """Health check endpoint for basic service availability."""
    return {"data": {"status": "ok"}, "message": "ATLAS backend is running"}


app.include_router(users.router)
app.include_router(components.router)
app.include_router(specs.router)
app.include_router(pricing.router)
app.include_router(compatibility.router)
app.include_router(builds.router)
app.include_router(recommendations.router)
