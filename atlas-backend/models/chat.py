from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=50)
    build_id: int | None = Field(default=None, gt=0)


class ChatPartListing(BaseModel):
    store: str
    price: float | None = None
    link: str | None = None
    status: str | None = None


class ChatRecommendedPart(BaseModel):
    component_id: int | None = None
    category: str
    name: str
    brand: str | None = None
    price: float | None = None
    link: str | None = None
    store: str | None = None
    listings: list[ChatPartListing] = Field(default_factory=list)


class ChatResponseData(BaseModel):
    message: str
    parts: list[ChatRecommendedPart] = Field(default_factory=list)
    recommendation: dict | None = None
    is_full_build: bool = False
    show_save_panel: bool = False
    active_build: dict | None = None
