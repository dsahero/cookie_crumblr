"""
Local FastAPI server for batch cookie classification.

Run (from repo root):
  uvicorn backend.server:app --host 127.0.0.1 --port 8000

Or from backend/:
  uvicorn server:app --host 127.0.0.1 --port 8000
"""

import sys
from pathlib import Path
from typing import List

_BACKEND_ROOT = Path(__file__).resolve().parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from cookie_classifier import predict_categories_batch

app = FastAPI(title="CookieCrumblr Classifier", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ClassifyItem(BaseModel):
    cookie_name: str
    retention_period: str = Field(
        ...,
        description='"session" or seconds until expiry as a string (e.g. "86400")',
    )


class ClassifyBatchRequest(BaseModel):
    items: List[ClassifyItem]


class ClassifyResult(BaseModel):
    category: str


class ClassifyBatchResponse(BaseModel):
    results: List[ClassifyResult]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/classify_batch", response_model=ClassifyBatchResponse)
def classify_batch(body: ClassifyBatchRequest):
    if not body.items:
        return ClassifyBatchResponse(results=[])
    raw = [item.model_dump() for item in body.items]
    categories = predict_categories_batch(raw)
    return ClassifyBatchResponse(
        results=[ClassifyResult(category=c) for c in categories]
    )
