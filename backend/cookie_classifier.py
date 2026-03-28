import pickle
import numpy as np

def load_model(model_path="models/knn_model.pkl"):
    with open(model_path, "rb") as f:
        return pickle.load(f)

def predict_category(platform: str, cookie_name: str, retention_period: str, model_path="models/knn_model.pkl"):
    bundle = load_model(model_path)
    model = bundle["model"]
    feature_encoders = bundle["feature_encoders"]
    target_encoder = bundle["target_encoder"]

    features = {"Platform": platform, "Cookie / Data Key name": cookie_name, "Retention period": retention_period}
    encoded = []

    for col, val in features.items():
        le = feature_encoders[col]
        # Handle unseen labels gracefully
        if val in le.classes_:
            encoded.append(le.transform([val])[0])
        else:
            encoded.append(-1)

    prediction = model.predict([encoded])
    return target_encoder.inverse_transform(prediction)[0]


if __name__ == "__main__":
    category = predict_category(
        platform="Google Tag Manager",
        cookie_name="cookiePreferences",
        retention_period="2 years"
    )
    print(f"Predicted category: {category}")
