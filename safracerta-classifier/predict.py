"""
predict.py
SafraCerta.ai — Inferência de doença em folha

Uso:
    python predict.py caminho/para/foto.jpg
    python predict.py caminho/para/foto.jpg --top 5
    python predict.py caminho/para/foto.jpg --model outro/caminho/saved_model

Exemplo:
    python predict.py minha_planta.jpg
    python predict.py minha_planta.jpg --top 3
"""

import sys
import json
import argparse
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
import os; os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import numpy as np
import tensorflow as tf
from PIL import Image

# ── Config ─────────────────────────────────────────────────────────────────
DEFAULT_MODEL_DIR = Path("saved_model")
IMG_SIZE          = 224


# ══════════════════════════════════════════════════════════════════════════
# CARREGAR MODELO E LABELS
# ══════════════════════════════════════════════════════════════════════════
def load_model_and_labels(model_dir: Path):
    model_path  = model_dir
    labels_path = model_dir / "label_map.json"

    if not model_path.exists():
        raise FileNotFoundError(
            f"Modelo não encontrado em '{model_path}'.\n"
            "Execute train_model.py primeiro para gerar o modelo."
        )
    if not labels_path.exists():
        raise FileNotFoundError(f"label_map.json não encontrado em '{labels_path}'.")

    print(f"▶  Carregando modelo de {model_path} …")
    model = tf.saved_model.load(str(model_path))
    # Se for .h5, use: model = tf.keras.models.load_model(str(model_path / "model.h5"))

    with open(labels_path) as f:
        label_map = json.load(f)  # {"0": "Apple___Apple_scab", ...}

    print(f"   ✓  {len(label_map)} classes carregadas")
    return model, label_map


# ══════════════════════════════════════════════════════════════════════════
# PRÉ-PROCESSAR IMAGEM
# ══════════════════════════════════════════════════════════════════════════
def preprocess_image(image_path: str) -> tf.Tensor:
    img = Image.open(image_path).convert("RGB")
    img = img.resize((IMG_SIZE, IMG_SIZE))
    arr = np.array(img, dtype=np.float32)
    arr = tf.keras.applications.efficientnet.preprocess_input(arr)
    return tf.expand_dims(arr, axis=0)  # (1, 224, 224, 3)


# ══════════════════════════════════════════════════════════════════════════
# PREDIÇÃO
# ══════════════════════════════════════════════════════════════════════════
def predict(model, image_path: str, label_map: dict, top_k: int = 3):
    tensor  = preprocess_image(image_path)

    # Compatível com SavedModel e Keras model
    if hasattr(model, "signatures"):
        infer  = model.signatures["serving_default"]
        # Descobrir o nome do input
        input_key  = list(infer.structured_input_signature[1].keys())[0]
        output_key = list(infer.structured_outputs.keys())[0]
        preds = infer(**{input_key: tensor})[output_key].numpy()[0]
    else:
        preds = model(tensor, training=False).numpy()[0]

    # Top-k
    top_indices = np.argsort(preds)[::-1][:top_k]
    results = []
    for idx in top_indices:
        label     = label_map[str(idx)]
        parts     = label.split("___")
        crop      = parts[0].replace("_", " ") if len(parts) == 2 else label
        condition = parts[1].replace("_", " ") if len(parts) == 2 else "—"
        results.append({
            "rank"      : len(results) + 1,
            "label"     : label,
            "crop"      : crop,
            "condition" : condition,
            "confidence": float(preds[idx]),
        })
    return results


# ══════════════════════════════════════════════════════════════════════════
# OUTPUT FORMATADO
# ══════════════════════════════════════════════════════════════════════════
def print_results(results: list, image_path: str):
    print(f"\n{'═'*52}")
    print(f"  Imagem: {Path(image_path).name}")
    print(f"{'═'*52}")
    for r in results:
        bar_len = int(r["confidence"] * 30)
        bar     = "█" * bar_len + "░" * (30 - bar_len)
        status  = "✅ Saudável" if "healthy" in r["condition"].lower() else "⚠️  Doença detectada"
        print(f"\n  #{r['rank']}  {r['crop']}")
        print(f"      Condição   : {r['condition']}")
        print(f"      Confiança  : {r['confidence']*100:.1f}%  [{bar}]")
        print(f"      Status     : {status}")
    print(f"\n{'═'*52}\n")


def results_to_json(results: list, image_path: str) -> dict:
    """Formato limpo para uso em API."""
    return {
        "image"     : str(image_path),
        "top_predictions": results,
        "prediction": results[0]["label"],
        "crop"      : results[0]["crop"],
        "condition" : results[0]["condition"],
        "confidence": results[0]["confidence"],
        "is_healthy": "healthy" in results[0]["condition"].lower(),
    }


# ══════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SafraCerta — Diagnóstico de doenças em folhas")
    parser.add_argument("image",   type=str,              help="Caminho para a imagem da folha")
    parser.add_argument("--top",   type=int, default=3,   help="Número de predições (default: 3)")
    parser.add_argument("--model", type=str, default=str(DEFAULT_MODEL_DIR), help="Pasta do modelo")
    parser.add_argument("--json",  action="store_true",   help="Saída em JSON (para integração com API)")
    args = parser.parse_args()

    model, label_map = load_model_and_labels(Path(args.model))
    results          = predict(model, args.image, label_map, top_k=args.top)

    if args.json:
        print(json.dumps(results_to_json(results, args.image), indent=2, ensure_ascii=False))
    else:
        print_results(results, args.image)
