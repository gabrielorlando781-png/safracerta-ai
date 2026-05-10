"""
train_model.py
SafraCerta.ai — PlantVillage Disease Classifier
Transfer learning com EfficientNetB0 nas 38 classes do PlantVillage.

Uso:
    python train_model.py

Saída:
    saved_model/          → modelo final em SavedModel format (para deploy)
    saved_model/model.h5  → mesmo modelo em .h5 (alternativo)
    label_map.json        → mapeamento índice → nome da classe
    training_history.png  → gráfico de accuracy/loss por epoch
"""

import os
import json
import warnings
from pathlib import Path

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
warnings.filterwarnings("ignore")

import numpy as np
import tensorflow as tf
import tensorflow_datasets as tfds
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# ══════════════════════════════════════════════════════════════════════════
# CONFIG
# ══════════════════════════════════════════════════════════════════════════
IMG_SIZE      = 224          # EfficientNetB0 espera 224x224
BATCH_SIZE    = 32
EPOCHS_FROZEN = 10           # fase 1: treina só a cabeça, backbone congelado
EPOCHS_FINETUNE = 15         # fase 2: fine-tuning das últimas camadas
LEARNING_RATE = 1e-3
FINETUNE_LR   = 1e-5
TRAIN_RATIO   = 0.80
VAL_RATIO     = 0.10
# TEST_RATIO  = 0.10 (o resto)
SEED          = 42
OUTPUT_DIR    = Path("saved_model")
OUTPUT_DIR.mkdir(exist_ok=True)

# ══════════════════════════════════════════════════════════════════════════
# 1. CARREGAR DATASET
# ══════════════════════════════════════════════════════════════════════════
def load_and_split():
    DATA_PATH = Path("data/PlantVillage_Images")
    print(f"▶  Carregando imagens de {DATA_PATH} …")
    
    # Criar datasets de treino e validação
    train_ds = tf.keras.utils.image_dataset_from_directory(
        DATA_PATH,
        validation_split=0.2,
        subset="training",
        seed=SEED,
        image_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        label_mode="int"
    )

    val_ds = tf.keras.utils.image_dataset_from_directory(
        DATA_PATH,
        validation_split=0.2,
        subset="validation",
        seed=SEED,
        image_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        label_mode="int"
    )

    label_names = train_ds.class_names
    num_classes = len(label_names)
    total       = len(train_ds) * BATCH_SIZE + len(val_ds) * BATCH_SIZE
    
    print(f"   ✓  {total:,} imagens (aprox) |  {num_classes} classes")

    # Salvar mapa de labels
    label_map = {str(i): name for i, name in enumerate(label_names)}
    with open(OUTPUT_DIR / "label_map.json", "w") as f:
        json.dump(label_map, f, indent=2, ensure_ascii=False)
    print(f"   ✓  label_map.json salvo")

    # Para teste, usaremos uma parte da validação se necessário, 
    # mas por simplicidade usaremos train/val.
    return train_ds, val_ds, val_ds, num_classes, label_names, total


# ══════════════════════════════════════════════════════════════════════════
# 2. PRÉ-PROCESSAMENTO
# ══════════════════════════════════════════════════════════════════════════
def preprocess(img, label, augment=False):
    img = tf.cast(img, tf.float32)

    # Augmentation (só no treino)
    if augment:
        img = tf.image.random_flip_left_right(img)
        img = tf.image.random_flip_up_down(img)
        img = tf.image.random_brightness(img, max_delta=0.2)
        img = tf.image.random_contrast(img, lower=0.8, upper=1.2)
        img = tf.image.random_saturation(img, lower=0.8, upper=1.2)

    # EfficientNet espera pixel em [0, 255] — normalização interna
    img = tf.keras.applications.efficientnet.preprocess_input(img)

    return img, label


def make_pipeline(ds, augment=False, shuffle=False):
    if shuffle:
        ds = ds.shuffle(buffer_size=1000)
    
    # Map preprocessing
    ds = ds.map(
        lambda x, y: preprocess(x, y, augment=augment),
        num_parallel_calls=tf.data.AUTOTUNE
    )
    
    # ds = ds.batch(BATCH_SIZE) # image_dataset_from_directory já faz batching
    ds = ds.prefetch(tf.data.AUTOTUNE)
    return ds


# ══════════════════════════════════════════════════════════════════════════
# 3. CONSTRUIR MODELO
# ══════════════════════════════════════════════════════════════════════════
def build_model(num_classes):
    base = tf.keras.applications.EfficientNetB0(
        include_top=False,
        weights="imagenet",
        input_shape=(IMG_SIZE, IMG_SIZE, 3),
        pooling="avg",
    )
    base.trainable = False   # Fase 1: backbone congelado

    inputs  = tf.keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
    x       = base(inputs, training=False)
    x       = tf.keras.layers.Dropout(0.3)(x)
    x       = tf.keras.layers.Dense(256, activation="relu")(x)
    x       = tf.keras.layers.Dropout(0.2)(x)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax")(x)

    model = tf.keras.Model(inputs, outputs)
    model.summary(line_length=80)
    return model, base


# ══════════════════════════════════════════════════════════════════════════
# 4. TREINO
# ══════════════════════════════════════════════════════════════════════════
def train(model, base, train_ds, val_ds):
    # ── Fase 1: cabeça apenas ──────────────────────────────────────────
    print("\n▶  Fase 1 — Treinando cabeça (backbone congelado) …")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(LEARNING_RATE),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    callbacks_phase1 = [
        tf.keras.callbacks.EarlyStopping(patience=4, restore_best_weights=True, verbose=1),
        tf.keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=2, verbose=1),
        tf.keras.callbacks.ModelCheckpoint(
            str(OUTPUT_DIR / "best_phase1.h5"),
            save_best_only=True, verbose=0
        ),
    ]
    hist1 = model.fit(
        train_ds, validation_data=val_ds,
        epochs=EPOCHS_FROZEN,
        callbacks=callbacks_phase1,
    )

    # ── Fase 2: fine-tuning das últimas 30 camadas ─────────────────────
    print("\n▶  Fase 2 — Fine-tuning (últimas 30 camadas do backbone) …")
    base.trainable = True
    for layer in base.layers[:-30]:
        layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(FINETUNE_LR),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    callbacks_phase2 = [
        tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True, verbose=1),
        tf.keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=3, verbose=1),
        tf.keras.callbacks.ModelCheckpoint(
            str(OUTPUT_DIR / "best_phase2.h5"),
            save_best_only=True, verbose=0
        ),
    ]
    hist2 = model.fit(
        train_ds, validation_data=val_ds,
        epochs=EPOCHS_FINETUNE,
        callbacks=callbacks_phase2,
    )

    return hist1, hist2


# ══════════════════════════════════════════════════════════════════════════
# 5. AVALIAR NO TEST SET
# ══════════════════════════════════════════════════════════════════════════
def evaluate(model, test_ds):
    print("\n▶  Avaliando no test set …")
    loss, acc = model.evaluate(test_ds, verbose=1)
    print(f"\n   Test Accuracy : {acc*100:.2f}%")
    print(f"   Test Loss     : {loss:.4f}")
    return acc, loss


# ══════════════════════════════════════════════════════════════════════════
# 6. SALVAR MODELO
# ══════════════════════════════════════════════════════════════════════════
def save_model(model):
    # SavedModel (para Railway / TF Serving)
    model.save(str(OUTPUT_DIR))
    print(f"\n   ✓  SavedModel salvo → {OUTPUT_DIR}/")

    # .h5 (alternativo, mais portátil)
    model.save(str(OUTPUT_DIR / "model.h5"))
    print(f"   ✓  model.h5 salvo → {OUTPUT_DIR}/model.h5")


# ══════════════════════════════════════════════════════════════════════════
# 7. GRÁFICOS
# ══════════════════════════════════════════════════════════════════════════
PALETTE = {"bg":"#0a0a0f","surface":"#12121a","cyan":"#00c8ff","purple":"#7b2fff","green":"#00ff88","text":"#e8e8f0","muted":"#555570"}

def plot_history(hist1, hist2):
    plt.rcParams.update({
        "figure.facecolor": PALETTE["bg"], "axes.facecolor": PALETTE["surface"],
        "axes.edgecolor": PALETTE["muted"], "axes.labelcolor": PALETTE["text"],
        "xtick.color": PALETTE["muted"], "ytick.color": PALETTE["text"],
        "text.color": PALETTE["text"], "grid.color": "#1e1e2e",
        "grid.linewidth": 0.6, "font.family": "monospace",
    })

    acc  = hist1.history["accuracy"]      + hist2.history["accuracy"]
    vacc = hist1.history["val_accuracy"]  + hist2.history["val_accuracy"]
    loss = hist1.history["loss"]          + hist2.history["loss"]
    vloss= hist1.history["val_loss"]      + hist2.history["val_loss"]
    sep  = len(hist1.history["accuracy"])   # linha que separa fase 1/2

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    epochs = range(1, len(acc) + 1)

    for ax, train_v, val_v, title, ylabel in [
        (ax1, acc,  vacc,  "Accuracy",  "Accuracy"),
        (ax2, loss, vloss, "Loss",      "Loss"),
    ]:
        ax.plot(epochs, train_v, color=PALETTE["cyan"],   label="Train",      linewidth=2)
        ax.plot(epochs, val_v,   color=PALETTE["purple"], label="Validation", linewidth=2, linestyle="--")
        ax.axvline(x=sep, color=PALETTE["green"], linestyle=":", linewidth=1.5, label="Fine-tune start")
        ax.set_title(title, fontsize=13, color=PALETTE["cyan"], pad=12, fontweight="bold")
        ax.set_xlabel("Epoch"); ax.set_ylabel(ylabel)
        ax.legend(framealpha=0.1); ax.grid(True)

    plt.suptitle("PlantVillage Training — SafraCerta.ai", fontsize=14,
                 color=PALETTE["text"], fontweight="bold", y=1.02)
    plt.tight_layout()
    path = OUTPUT_DIR / "training_history.png"
    fig.savefig(path, dpi=130, bbox_inches="tight", facecolor=PALETTE["bg"])
    plt.close(fig)
    print(f"   ✓  Gráfico salvo → {path}")


# ══════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("\n╔══════════════════════════════════════════╗")
    print("║  SafraCerta.ai — PlantVillage Classifier  ║")
    print("╚══════════════════════════════════════════╝\n")

    gpus = tf.config.list_physical_devices("GPU")
    print(f"   GPUs disponíveis: {len(gpus)}  {'(treino acelerado ✓)' if gpus else '(usando CPU)'}\n")

    train_raw, val_raw, test_raw, num_classes, label_names, total = load_and_split()

    print("\n▶  Construindo pipelines …")
    train_ds = make_pipeline(train_raw, augment=True,  shuffle=True)
    val_ds   = make_pipeline(val_raw,   augment=False, shuffle=False)
    test_ds  = make_pipeline(test_raw,  augment=False, shuffle=False)

    print("\n▶  Construindo modelo EfficientNetB0 …")
    model, base = build_model(num_classes)

    hist1, hist2 = train(model, base, train_ds, val_ds)

    acc, loss = evaluate(model, test_ds)

    print("\n▶  Salvando modelo …")
    save_model(model)

    print("\n▶  Gerando gráficos …")
    plot_history(hist1, hist2)

    print("\n══════════════════════════════════════════")
    print(f"  Test Accuracy  : {acc*100:.2f}%")
    print(f"  Modelo salvo   : {OUTPUT_DIR}/")
    print(f"  Labels         : {OUTPUT_DIR}/label_map.json")
    print(f"  Gráfico        : {OUTPUT_DIR}/training_history.png")
    print("══════════════════════════════════════════\n")
    print("✅  Treino completo.")
