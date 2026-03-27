from sklearn.ensemble import IsolationForest
import numpy as np
import pickle
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")

# Données simulées
X = np.array([
    [1, 1, 50],
    [0, 0, 40],
    [5, 10, 90],  # anomalie
    [1, 0, 45],
])

model = IsolationForest(contamination=0.2, random_state=42)
model.fit(X)

# Sauvegarde
with open(MODEL_PATH, "wb") as f:
    pickle.dump(model, f)

print("✅ model.pkl créé avec succès !")