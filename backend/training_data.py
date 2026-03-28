import pandas as pd
import pickle
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import cross_val_score
import numpy as np

# Load data
df = pd.read_csv("open-cookie-database.csv")

# Select features and target
feature_cols = ["Platform", "Cookie / Data Key name", "Retention period"]
target_col = "Category"

df = df[feature_cols + [target_col]].dropna()

# Encode each feature column separately
encoders = {}
X = pd.DataFrame()

for col in feature_cols:
    le = LabelEncoder()
    X[col] = le.fit_transform(df[col].astype(str))
    encoders[col] = le

# Encode target
target_encoder = LabelEncoder()
y = target_encoder.fit_transform(df[target_col].astype(str))

# Find best n_neighbors via 10-fold cross-validation
best_k, best_score = 2, 0

for k in range(2, 48):
    knn = KNeighborsClassifier(n_neighbors=k)
    scores = cross_val_score(knn, X, y, cv=10, scoring="accuracy")
    mean_score = np.mean(scores)
    print(f"k={k:2d} | Mean Accuracy: {mean_score:.4f} | Std: {np.std(scores):.4f}")
    if mean_score > best_score:
        best_score, best_k = mean_score, k

print(f"\nBest k: {best_k} with mean accuracy {best_score:.4f}")

# Train final model on all data with best k
knn = KNeighborsClassifier(n_neighbors=best_k)
knn.fit(X, y)

# Save model + encoders
with open("models/knn_model.pkl", "wb") as f:
    pickle.dump({
        "model": knn,
        "feature_encoders": encoders,
        "target_encoder": target_encoder
    }, f)

print("Model saved to models/knn_model.pkl")
