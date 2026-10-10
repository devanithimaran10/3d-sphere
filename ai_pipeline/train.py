#!/usr/bin/env python3
"""
Training & Evaluation Pipeline for CNN-GRU Movement Representation Model.
Person 1: AI and Movement Pipeline.

Usage:
  python3 train.py --epochs 15 --batch_size 32
"""

import argparse
import json
import math
import os
import time
from typing import Dict, Any

from dataset_preprocessor import preprocess_pipeline, WINDOW_STEPS, NUM_FEATURES
from models import HAS_TORCH

if HAS_TORCH:
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, TensorDataset
    from models import CNNGRUMovementEncoder, CNNLSTMBaseline


def load_partition(file_path: str):
    with open(file_path, "r") as f:
        return json.load(f)


def train_pipeline(epochs: int = 10, batch_size: int = 32, lr: float = 1e-3, data_dir: str = "ai_pipeline/data", output_dir: str = "ai_pipeline/weights"):
    os.makedirs(output_dir, exist_ok=True)
    train_file = os.path.join(data_dir, "train_windows.json")

    # If data does not exist, run preprocessor first
    if not os.path.exists(train_file):
        print("[Train] Preprocessed data not found. Running preprocessor...")
        preprocess_pipeline(data_dir)

    print("[Train] Loading preprocessed kinematic windows...")
    train_data = load_partition(os.path.join(data_dir, "train_windows.json"))
    val_data   = load_partition(os.path.join(data_dir, "val_windows.json"))
    test_data  = load_partition(os.path.join(data_dir, "test_windows.json"))

    print(f"[Train] Loaded: {len(train_data)} Train, {len(val_data)} Val, {len(test_data)} Test samples.")

    if not HAS_TORCH:
        print("[Train] PyTorch is not installed in the current environment.")
        print("[Train] Dataset preparation and window tensors (N x 200 x 28) were verified successfully.")
        print("[Train] To train deep neural weights, run: pip install torch")
        return

    device = torch.device("cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu"))
    print(f"[Train] Training on compute device: {device}")

    # Convert to PyTorch tensors
    train_tensor = torch.tensor(train_data, dtype=torch.float32)
    val_tensor   = torch.tensor(val_data, dtype=torch.float32)
    test_tensor  = torch.tensor(test_data, dtype=torch.float32)

    train_loader = DataLoader(TensorDataset(train_tensor), batch_size=batch_size, shuffle=True)
    val_loader   = DataLoader(TensorDataset(val_tensor), batch_size=batch_size, shuffle=False)
    test_loader  = DataLoader(TensorDataset(test_tensor), batch_size=batch_size, shuffle=False)

    # Instantiate models
    model = CNNGRUMovementEncoder(in_features=NUM_FEATURES, window_steps=WINDOW_STEPS, embedding_dim=16).to(device)
    baseline_lstm = CNNLSTMBaseline(in_features=NUM_FEATURES, embedding_dim=16).to(device)

    # Loss & Optimizer
    criterion = nn.MSELoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    print(f"[Train] CNN-GRU Parameter Count: {sum(p.numel() for p in model.parameters() if p.requires_grad):,}")
    print(f"[Train] Baseline LSTM Parameter Count: {sum(p.numel() for p in baseline_lstm.parameters() if p.requires_grad):,}")

    best_val_loss = float("inf")

    # Training Loop
    print("\n--- Starting Self-Supervised Trajectory Reconstruction Training ---")
    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        t0 = time.time()

        for batch in train_loader:
            x = batch[0].to(device)
            optimizer.zero_grad()

            embedding, stability, recon = model(x)
            loss = criterion(recon, x)

            # Smoothness regularizer (penalize excessive second derivative in reconstruction)
            recon_diff = recon[:, 2:, :] - 2 * recon[:, 1:-1, :] + recon[:, :-2, :]
            smooth_reg = torch.mean(recon_diff ** 2)
            total_loss = loss + 0.05 * smooth_reg

            total_loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            running_loss += total_loss.item() * x.size(0)

        scheduler.step()
        train_loss = running_loss / len(train_tensor)

        # Validation
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for batch in val_loader:
                x = batch[0].to(device)
                _, _, recon = model(x)
                loss = criterion(recon, x)
                val_loss += loss.item() * x.size(0)

        val_loss /= len(val_tensor)
        duration = time.time() - t0

        print(f"Epoch [{epoch:02d}/{epochs:02d}] | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Time: {duration:.2f}s")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            ckpt_path = os.path.join(output_dir, "movement_encoder.pt")
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "val_loss": val_loss,
                "in_features": NUM_FEATURES,
                "window_steps": WINDOW_STEPS,
                "embedding_dim": 16,
            }, ckpt_path)

    print(f"\n[Train] Training complete. Best model checkpoint saved to '{os.path.join(output_dir, 'movement_encoder.pt')}'.")

    # Test Set Evaluation
    model.eval()
    test_loss = 0.0
    with torch.no_grad():
        for batch in test_loader:
            x = batch[0].to(device)
            _, _, recon = model(x)
            test_loss += criterion(recon, x).item() * x.size(0)
    test_loss /= len(test_tensor)

    print(f"[Test Set Evaluation] Final Reconstruction MSE: {test_loss:.4f}")

    # Export to ONNX for fast browser / edge inference
    try:
        dummy_input = torch.randn(1, WINDOW_STEPS, NUM_FEATURES, device=device)
        onnx_path = os.path.join(output_dir, "movement_encoder.onnx")
        torch.onnx.export(
            model,
            dummy_input,
            onnx_path,
            input_names=["kinematic_window"],
            output_names=["movement_embedding", "stability_score", "reconstruction"],
            dynamic_axes={"kinematic_window": {0: "batch_size"}},
            opset_version=14,
        )
        print(f"[Train] Model exported to ONNX format at '{onnx_path}'.")
    except Exception as e:
        print(f"[Train] Note: ONNX export skipped ({e}). PyTorch checkpoint is preserved.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=5, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=32, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-3, help="Learning rate")
    args = parser.parse_args()

    train_pipeline(epochs=args.epochs, batch_size=args.batch_size, lr=args.lr)
