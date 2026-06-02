from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="Trading Agent Placeholder", version="0.1.0")


class AnalysisRequest(BaseModel):
    symbol: str = Field(pattern=r"^[A-Za-z][A-Za-z0-9.-]{0,9}$")


class AnalysisResponse(BaseModel):
    symbol: str
    recommendation: Literal["hold"]
    summary: str
    source: Literal["mock"]


@app.get("/health")
def get_health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analysis/mock", response_model=AnalysisResponse)
def create_mock_analysis(request: AnalysisRequest) -> AnalysisResponse:
    symbol = request.symbol.upper()
    return AnalysisResponse(
        symbol=symbol,
        recommendation="hold",
        summary=f"Mock analysis for {symbol}. No live market data is connected.",
        source="mock",
    )

