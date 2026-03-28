import pickle
from pathlib import Path
from typing import Any, Dict, List, Optional

def load_model(model_path="models/knn_model.pkl"):
    with open(model_path, "rb") as f:
        return pickle.load(f)

def parse_retention(val: str) -> float:
    val = val.strip().lower()
    return -1 if val == "session" else float(val)

def predict_category(cookie_name: str, retention_period: str, model_path="models/knn_model.pkl"):
    bundle = load_model(model_path)
    model = bundle["model"]
    feature_encoders = bundle["feature_encoders"]
    target_encoder = bundle["target_encoder"]

    le = feature_encoders["Cookie / Data Key name"]
    encoded_name = le.transform([cookie_name])[0] if cookie_name in le.classes_ else -1
    encoded_retention = parse_retention(retention_period)

    prediction = model.predict([[encoded_name, encoded_retention]])
    return target_encoder.inverse_transform(prediction)[0]


def default_model_path() -> str:
    return str(Path(__file__).resolve().parent / "models" / "knn_model.pkl")


def predict_categories_batch(
    items: List[Dict[str, Any]],
    model_path: Optional[str] = None,
) -> List[str]:
    """
    Batch classification for FastAPI /classify_batch.
    items: list of {"cookie_name": str, "retention_period": str}
    """
    if not items:
        return []
    path = model_path or default_model_path()
    bundle = load_model(path)
    model = bundle["model"]
    feature_encoders = bundle["feature_encoders"]
    target_encoder = bundle["target_encoder"]
    le = feature_encoders["Cookie / Data Key name"]

    rows = []
    for item in items:
        name = str(item["cookie_name"])
        retention = str(item["retention_period"])
        encoded_name = le.transform([name])[0] if name in le.classes_ else -1
        encoded_retention = parse_retention(retention)
        rows.append([encoded_name, encoded_retention])

    preds = model.predict(rows)
    return list(target_encoder.inverse_transform(preds))


if __name__ == "__main__":
    category = predict_category(
        cookie_name="cookiePreferences",
        retention_period="63072000"
    )
    print(f"Predicted category: {category}")
