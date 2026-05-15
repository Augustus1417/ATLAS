from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ComponentCreateRequest(BaseModel):
    name: str = Field(min_length=2)
    brand: str = Field(min_length=2)
    category: str = Field(min_length=2)
    form_factor: str | None = None
    release_year: int | None = Field(default=None, ge=1990, le=2100)


class ComponentUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2)
    brand: str | None = Field(default=None, min_length=2)
    category: str | None = Field(default=None, min_length=2)
    form_factor: str | None = None
    release_year: int | None = Field(default=None, ge=1990, le=2100)
    is_active: bool | None = None


class ComponentSpecItem(BaseModel):
    spec_name: str = Field(min_length=1)
    spec_value: str = Field(min_length=1)
    unit: str | None = None


class ComponentSpecCreateRequest(BaseModel):
    specs: list[ComponentSpecItem] = Field(min_length=1)


class ComponentPricingCreateRequest(BaseModel):
    price: float = Field(gt=0)
    currency: str = "PHP"
    source: str | None = None


class ComponentSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    component_id: int
    name: str
    brand: str
    category: str
    form_factor: str | None
    release_year: int | None
    is_active: bool
    added_by: int | None
    created_at: datetime
    updated_at: datetime


class ComponentQueryParams(BaseModel):
    category: str | None = None
    brand: str | None = None
    is_active: bool | None = None


DeviceType = Literal["desktop", "laptop", "mobile"]
WorkloadType = str
