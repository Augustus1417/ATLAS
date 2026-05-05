from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1)


class PartListing(BaseModel):
    store: str
    price: float | None
    link: str | None


class RecommendedPartInChat(BaseModel):
    category: str
    name: str
    listings: list[PartListing] | None = None


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    conversation_history: list[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    message: str
    recommended_parts: list[RecommendedPartInChat] | None = None
    sources: list[str] | None = None
