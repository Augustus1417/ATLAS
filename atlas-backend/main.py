from contextlib import asynccontextmanager
import logging

import psycopg2
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import builder, builds, chat, compatibility, components, pricing, recommendations, specs, users


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

_cors_origins = settings.cors_origin_list()
if not _cors_origins:
    logging.warning("CORS_ORIGINS is empty — browsers may block API requests from the frontend.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"data": None, "message": str(exc.detail)})


@app.exception_handler(RuntimeError)
async def runtime_error_handler(_request: Request, exc: RuntimeError):
    logging.error("Runtime error: %s", exc)
    return JSONResponse(
        status_code=503,
        content={"data": None, "message": str(exc)},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    # Log validation error info from Pydantic
    logging.warning("Request validation error: %s", exc.errors())
    
    # Convert errors to JSON-serializable format
    errors = []
    for error in exc.errors():
        error_dict = dict(error)
        # Remove 'input' if it's bytes or not JSON-serializable
        if 'input' in error_dict:
            if isinstance(error_dict['input'], bytes):
                try:
                    error_dict['input'] = error_dict['input'].decode(errors="replace")
                except Exception:
                    error_dict['input'] = str(error_dict['input'])
            else:
                # Convert to string representation if not serializable
                try:
                    import json
                    json.dumps(error_dict['input'])
                except (TypeError, ValueError):
                    error_dict['input'] = str(error_dict['input'])
        errors.append(error_dict)
    
    return JSONResponse(status_code=422, content={"data": errors, "message": "Validation error"})


@app.get("/")
def root():
    """Basic service identity (use /health for load balancers)."""
    return {"data": {"status": "ok"}, "message": "ATLAS backend is running"}


@app.get("/health")
def health_check():
    """Health check for deployment probes; verifies database connectivity."""
    try:
        conn = psycopg2.connect(settings.database_url)
        conn.close()
        db_status = "connected"
    except Exception as exc:
        logging.warning("Health check database error: %s", exc)
        return JSONResponse(
            status_code=503,
            content={
                "data": {"status": "degraded", "database": "unavailable"},
                "message": "Database connection failed",
            },
        )

    return {
        "data": {
            "status": "ok",
            "database": db_status,
            "environment": settings.environment,
        },
        "message": "ATLAS backend is healthy",
    }


app.include_router(users.router)
app.include_router(components.router)
app.include_router(specs.router)
app.include_router(pricing.router)
app.include_router(compatibility.router)
app.include_router(builds.router)
app.include_router(builder.router)
app.include_router(recommendations.router)
app.include_router(chat.router)
