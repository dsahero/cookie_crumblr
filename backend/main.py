from cookie_classifier import predict_category

def main():
    print("=== Cookie Category Classifier ===")
    platform = input("Enter Platform: ").strip()
    cookie_name = input("Enter Cookie / Key Name: ").strip()
    retention_period = input("Enter Retention Period (e.g. session, 1 year, 2 years): ").strip()

    category = predict_category(platform, cookie_name, retention_period)
    print(f"\nPredicted Category: {category}")

if __name__ == "__main__":
    main()
