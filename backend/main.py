import argparse
from cookie_classifier import predict_category

def main(cookie_name: str, retention_period: str):
    category = predict_category(cookie_name, retention_period)
    print(f"Predicted Category: {category}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Cookie Category Classifier")
    parser.add_argument("cookie_name", type=str, help="Cookie / key name (e.g. 'cookiePreferences')")
    parser.add_argument("retention_period", type=str, help="Retention period (e.g. 'session', '1 year')")
    args = parser.parse_args()

    main(args.cookie_name, args.retention_period)
