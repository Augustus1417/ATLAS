from datetime import datetime

from pydantic import BaseModel, Field


class BuildComponentInput(BaseModel):
    component_id: int = Field(gt=0)
    quantity: int = Field(default=1, ge=1)
    price_at_save: float = Field(gt=0)


class BuildCreateRequest(BaseModel):
    build_name: str = Field(min_length=1)
    intended_workload: str | None = None
    is_public: bool = False
    components: list[BuildComponentInput] = Field(min_length=1)


class BuildUpdateRequest(BaseModel):
    build_name: str | None = None
    intended_workload: str | None = None
    is_public: bool | None = None
    components: list[BuildComponentInput] | None = None


class BuildComponentOut(BaseModel):
    build_component_id: int
    build_id: int
    component_id: int
    quantity: int
    price_at_save: float


class BuildOut(BaseModel):
    build_id: int
    user_id: int
    build_name: str
    intended_workload: str | None
    total_price: float | None
    is_public: bool
    created_at: datetime
    updated_at: datetime
    components: list[BuildComponentOut] = []
