from datetime import datetime

from pydantic import BaseModel


class PricingHistoryItem(BaseModel):
    price_id: int
    component_id: int
    price: float
    currency: str
    source: str | None
    recorded_at: datetime
