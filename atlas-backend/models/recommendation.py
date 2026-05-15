from pydantic import BaseModel, Field

from models.component import DeviceType, WorkloadType


class RecommendationRequest(BaseModel):
    budget_php: int = Field(gt=0)
    workload: WorkloadType = Field(min_length=1)
    device_type: DeviceType


class PartSelection(BaseModel):
    category: str
    name: str


class Listing(BaseModel):
    store: str
    price: float | None
    link: str | None
    status: str | None = None


class RecommendedPart(BaseModel):
    category: str
    name: str
    listings: list[Listing]


class RecommendationData(BaseModel):
    workload: str
    budget_php: int
    estimated_total_php: float
    parts: list[RecommendedPart]
