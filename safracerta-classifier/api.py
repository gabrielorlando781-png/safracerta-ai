"""
api.py
SafraCerta.ai — API de diagnóstico de doenças em folhas
Deploy-ready para Railway.

Endpoints:
    GET  /               → health check
    GET  /classes        → lista todas as 38 classes
    POST /predict        → envia imagem, recebe diagnóstico
    POST /predict/batch  → envia até 10 imagens de uma vez

Uso local:
    pip install fastapi uvicorn python-multipart
    uvicorn api:app --host 0.0.0.0 --port 8000 --reload

Deploy Railway:
    Adicione ao Procfile:  web: uvicorn api:app --host 0.0.0.0 --port $PORT
"""

import os
import io
import json
import warnings
from pathlib import Path
from typing import Optional

warnings.filterwarnings("ignore")
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import numpy as np
import tensorflow as tf
from PIL import Image, UnidentifiedImageError

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# ── Config ─────────────────────────────────────────────────────────────────
MODEL_DIR  = Path(os.getenv("MODEL_DIR", "saved_model"))
IMG_SIZE   = 224
MAX_BATCH  = 10
MAX_FILE_MB = 10

# ══════════════════════════════════════════════════════════════════════════
# CARREGAR MODELO NA INICIALIZAÇÃO
# ══════════════════════════════════════════════════════════════════════════
print("▶  Carregando modelo …")
try:
    _model = tf.keras.models.load_model(str(MODEL_DIR / "model.h5"))
    _infer_fn = lambda x: _model(x, training=False).numpy()
    print("   ✓  Modelo .h5 carregado")
except Exception:
    try:
        _saved = tf.saved_model.load(str(MODEL_DIR))
        _infer_fn_raw = _saved.signatures["serving_default"]
        _input_key    = list(_infer_fn_raw.structured_input_signature[1].keys())[0]
        _output_key   = list(_infer_fn_raw.structured_outputs.keys())[0]
        _infer_fn = lambda x: _infer_fn_raw(**{_input_key: x})[_output_key].numpy()
        print("   ✓  SavedModel carregado")
    except Exception as e:
        print(f"   ✗  Erro ao carregar modelo: {e}")
        _infer_fn = None

with open(MODEL_DIR / "label_map.json") as f:
    _label_map: dict = json.load(f)
print(f"   ✓  {len(_label_map)} classes")


# ══════════════════════════════════════════════════════════════════════════
# FASTAPI
# ══════════════════════════════════════════════════════════════════════════
app = FastAPI(
    title="SafraCerta.ai — Diagnóstico de Doenças em Plantas",
    description="API de classificação de doenças foliares usando PlantVillage + EfficientNetB0",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ────────────────────────────────────────────────────────────────
class Prediction(BaseModel):
    rank:       int
    label:      str
    crop:       str
    condition:  str
    confidence: float

class PredictResponse(BaseModel):
    image:            str
    prediction:       str
    crop:             str
    condition:        str
    confidence:       float
    is_healthy:       bool
    top_predictions:  list[Prediction]

class BatchItem(BaseModel):
    filename:    str
    prediction:  Optional[str]
    crop:        Optional[str]
    condition:   Optional[str]
    confidence:  Optional[float]
    is_healthy:  Optional[bool]
    error:       Optional[str]


# ── Helpers ────────────────────────────────────────────────────────────────
def _preprocess_bytes(data: bytes) -> tf.Tensor:
    img = Image.open(io.BytesIO(data)).convert("RGB")
    img = img.resize((IMG_SIZE, IMG_SIZE))
    arr = np.array(img, dtype=np.float32)
    arr = tf.keras.applications.efficientnet.preprocess_input(arr)
    return tf.expand_dims(arr, axis=0)


def _run_inference(tensor: tf.Tensor, top_k: int = 3) -> list[Prediction]:
    preds       = _infer_fn(tensor)[0]
    top_indices = np.argsort(preds)[::-1][:top_k]
    results     = []
    for rank, idx in enumerate(top_indices, start=1):
        label     = _label_map[str(idx)]
        parts     = label.split("___")
        crop      = parts[0].replace("_", " ") if len(parts) == 2 else label
        condition = parts[1].replace("_", " ") if len(parts) == 2 else "—"
        results.append(Prediction(
            rank=rank, label=label, crop=crop,
            condition=condition, confidence=float(preds[idx])
        ))
    return results


# ══════════════════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════════════════
@app.get("/", tags=["Health"])
def health():
    return {
        "status"     : "ok",
        "model_loaded": _infer_fn is not None,
        "num_classes" : len(_label_map),
        "version"     : "1.0.0",
    }


@app.get("/classes", tags=["Info"])
def list_classes():
    """Retorna todas as 38 classes que o modelo reconhece."""
    classes = []
    for idx, label in _label_map.items():
        parts = label.split("___")
        classes.append({
            "id"       : int(idx),
            "label"    : label,
            "crop"     : parts[0].replace("_", " ") if len(parts) == 2 else label,
            "condition": parts[1].replace("_", " ") if len(parts) == 2 else "—",
            "healthy"  : "healthy" in label.lower(),
        })
    return {"count": len(classes), "classes": classes}


@app.post("/predict", response_model=PredictResponse, tags=["Prediction"])
async def predict_single(
    file:  UploadFile = File(..., description="Foto da folha (JPG ou PNG)"),
    top_k: int        = 3,
):
    """
    Envia uma foto de folha e recebe o diagnóstico com a doença identificada.
    """
    if _infer_fn is None:
        raise HTTPException(503, "Modelo não carregado. Execute train_model.py primeiro.")

    data = await file.read()
    if len(data) > MAX_FILE_MB * 1024 * 1024:
        raise HTTPException(413, f"Arquivo muito grande. Máximo: {MAX_FILE_MB}MB")

    try:
        tensor  = _preprocess_bytes(data)
    except (UnidentifiedImageError, Exception) as e:
        raise HTTPException(400, f"Imagem inválida: {e}")

    preds   = _run_inference(tensor, top_k=min(top_k, len(_label_map)))
    best    = preds[0]

    return PredictResponse(
        image            = file.filename,
        prediction       = best.label,
        crop             = best.crop,
        condition        = best.condition,
        confidence       = best.confidence,
        is_healthy       = "healthy" in best.condition.lower(),
        top_predictions  = preds,
    )


@app.post("/predict/batch", tags=["Prediction"])
async def predict_batch(files: list[UploadFile] = File(...)):
    """
    Envia até 10 imagens de uma vez. Útil para processar lotes de fotos de campo.
    """
    if _infer_fn is None:
        raise HTTPException(503, "Modelo não carregado.")
    if len(files) > MAX_BATCH:
        raise HTTPException(400, f"Máximo de {MAX_BATCH} imagens por requisição.")

    results = []
    for f in files:
        data = await f.read()
        try:
            tensor = _preprocess_bytes(data)
            preds  = _run_inference(tensor, top_k=1)
            best   = preds[0]
            results.append(BatchItem(
                filename   = f.filename,
                prediction = best.label,
                crop       = best.crop,
                condition  = best.condition,
                confidence = best.confidence,
                is_healthy = "healthy" in best.condition.lower(),
            ))
        except Exception as e:
            results.append(BatchItem(filename=f.filename, error=str(e)))

    return {"count": len(results), "results": results}
