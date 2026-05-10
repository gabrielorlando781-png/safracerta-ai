import os
import json
import tensorflow_datasets as tfds
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path

# Config
DATASET_NAME = 'plant_village'
DATA_DIR = Path('data')
OUTPUT_DIR = Path('analysis_output')
DATA_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

def generate_stats():
    print(f"Loading {DATASET_NAME} via TFDS into {DATA_DIR}...")
    ds, info = tfds.load(DATASET_NAME, split='train', with_info=True, data_dir=str(DATA_DIR))
    
    label_names = info.features['label'].names
    num_classes = len(label_names)
    total_images = info.splits['train'].num_examples
    
    print(f"Total images: {total_images}")
    print(f"Number of classes: {num_classes}")
    
    # Count images per class
    counts = {}
    for name in label_names:
        counts[name] = 0
        
    print("Counting images per class (this may take a minute)...")
    for sample in ds:
        label_idx = sample['label'].numpy()
        label_name = label_names[label_idx]
        counts[label_name] += 1
        
    df = pd.DataFrame(list(counts.items()), columns=['Class', 'Count'])
    df = df.sort_values(by='Count', ascending=False)
    
    # Save CSV
    df.to_csv(OUTPUT_DIR / 'class_distribution.csv', index=False)
    
    # Generate Chart
    plt.figure(figsize=(12, 10))
    plt.barh(df['Class'], df['Count'], color='skyblue')
    plt.xlabel('Number of Images')
    plt.title('PlantVillage Class Distribution')
    plt.gca().invert_yaxis()
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / 'distribution.png')
    plt.close()
    
    # Generate Samples
    print("Generating sample images...")
    samples_dir = OUTPUT_DIR / 'samples'
    samples_dir.mkdir(exist_ok=True)
    
    # Take one sample of each class
    class_samples = {}
    for sample in ds:
        label_idx = sample['label'].numpy()
        label_name = label_names[label_idx]
        if label_name not in class_samples:
            class_samples[label_name] = sample['image'].numpy()
        if len(class_samples) == num_classes:
            break
            
    for name, img in class_samples.items():
        plt.imshow(img)
        plt.title(name)
        plt.axis('off')
        plt.savefig(samples_dir / f"{name.replace(':', '_')}.png")
        plt.close()
        
    # Generate HTML Report
    generate_html_report(df, total_images, num_classes)

def generate_html_report(df, total, classes):
    html = f"""
    <html>
    <head>
        <title>PlantVillage Dataset Analysis - SafraCerta.ai</title>
        <style>
            body {{ font-family: sans-serif; background: #f4f4f9; color: #333; margin: 40px; }}
            .container {{ max-width: 1000px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            h1, h2 {{ color: #2c3e50; }}
            .stats {{ display: flex; gap: 20px; margin-bottom: 30px; }}
            .stat-card {{ background: #ecf0f1; padding: 15px; border-radius: 5px; flex: 1; text-align: center; }}
            .stat-value {{ font-size: 24px; font-weight: bold; color: #2980b9; }}
            img {{ max-width: 100%; border-radius: 5px; }}
            .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; }}
            .sample-card {{ text-align: center; font-size: 10px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>PlantVillage Dataset Analysis</h1>
            <p>Relat&oacute;rio gerado para o m&oacute;dulo de classfica&ccedil;&atilde;o SafraCerta.ai.</p>
            
            <div class="stats">
                <div class="stat-card"><div class="stat-label">Total de Imagens</div><div class="stat-value">{total:,}</div></div>
                <div class="stat-card"><div class="stat-label">Classes</div><div class="stat-value">{classes}</div></div>
            </div>
            
            <h2>Distribui&ccedil;&atilde;o de Classes</h2>
            <img src="distribution.png" alt="Distribuição de Classes">
            
            <h2>Amostras por Categoria</h2>
            <div class="grid">
    """
    
    samples_path = Path('analysis_output/samples')
    for img_file in os.listdir(samples_path):
        name = img_file.replace('.png', '').replace('_', ' ')
        html += f"""
                <div class="sample-card">
                    <img src="samples/{img_file}" alt="{name}">
                    <p>{name}</p>
                </div>
        """
        
    html += """
            </div>
        </div>
    </body>
    </html>
    """
    
    with open(OUTPUT_DIR / 'report_plant_village.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Report generated at {OUTPUT_DIR / 'report_plant_village.html'}")

if __name__ == "__main__":
    generate_stats()
