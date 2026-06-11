import os
import sys
import json
import numpy as np
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn

sys.path.insert(0, str(Path(__file__).parent))
import model_setup

app = FastAPI(title="Planet Finder API", root_path="/model-api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL = None
SAMPLES = None
SAMPLE_LABELS = None
SAMPLE_RAW = None

def load_model():
    global MODEL
    if MODEL is None:
        import tensorflow as tf
        model_path = model_setup.paths["cnn_exoplanets.keras"]
        MODEL = tf.keras.models.load_model(model_path)
    return MODEL

def load_samples():
    global SAMPLES, SAMPLE_LABELS, SAMPLE_RAW
    if SAMPLES is None:
        npz_path = model_setup.paths["sample_lightcurves.npz"]
        data = np.load(npz_path)
        SAMPLES = data["model_input"]   # already preprocessed — use directly for prediction
        SAMPLE_LABELS = data["labels"].tolist()
        SAMPLE_RAW = data["raw"]        # raw flux values — use for chart display only
    return SAMPLES, SAMPLE_LABELS, SAMPLE_RAW

class PredictRequest(BaseModel):
    values: list[float]
    preprocess: Optional[bool] = True

class SampleInfo(BaseModel):
    index: int
    label: int
    label_name: str
    preview: list[float]

class PredictResponse(BaseModel):
    label: int
    label_name: str
    confidence: float
    is_exoplanet: bool

@app.get("/healthz")
def health():
    return {"status": "ok"}

@app.get("/samples")
def get_samples():
    samples, labels, raw = load_samples()
    exoplanet_indices = [i for i, l in enumerate(labels) if l == 1][:5]
    non_exoplanet_indices = [i for i, l in enumerate(labels) if l == 0][:5]
    selected = exoplanet_indices + non_exoplanet_indices
    result = []
    for i in selected:
        raw_vals = raw[i].tolist()
        step = max(1, len(raw_vals) // 200)
        preview_small = raw_vals[::step][:200]
        result.append({
            "index": i,
            "label": labels[i],
            "label_name": "Exoplanet" if labels[i] == 1 else "Non-Exoplanet",
            "preview": preview_small,
            "raw_values": raw_vals,
            "processed_values": samples[i].flatten().tolist(),  # model_input — correct preprocessing
        })
    return result

@app.post("/predict")
def predict(req: PredictRequest):
    if len(req.values) != 3197:
        raise HTTPException(
            status_code=400,
            detail=f"Expected 3197 values, got {len(req.values)}"
        )
    model = load_model()
    arr = np.array(req.values, dtype=np.float64)
    if req.preprocess:
        # z-score normalize for user-supplied raw flux values
        mean = arr.mean()
        std = arr.std()
        if std > 0:
            arr = (arr - mean) / std
    # else: values are already preprocessed (e.g. from model_input) — use as-is
    arr = arr.reshape(1, 3197, 1)
    prob = float(model.predict(arr, verbose=0)[0][0])
    label = 1 if prob >= 0.5 else 0
    label_name = "Exoplanet" if label == 1 else "Non-Exoplanet"
    confidence = prob if label == 1 else 1.0 - prob
    return {
        "label": label,
        "label_name": label_name,
        "confidence": round(confidence, 4),
        "is_exoplanet": label == 1,
    }

if __name__ == "__main__":
    port = int(os.environ.get("PYTHON_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
