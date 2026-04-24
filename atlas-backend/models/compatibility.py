from pydantic import BaseModel, Field


class CompatibilityRequest(BaseModel):
    component_ids: list[int] = Field(min_length=2)


class CompatibilityConflict(BaseModel):
    component_a_id: int
    component_b_id: int
    reason: str | None = None


class CompatibilityResult(BaseModel):
    compatible: bool
    conflicts: list[CompatibilityConflict]
