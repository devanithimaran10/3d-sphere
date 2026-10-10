# AI and Movement Pipeline (Person 1)

This module implements the complete movement representation pipeline for **Adaptive Cognitive Therapy Using VR**. It processes raw upper-limb kinematics from the StrokeRehab dataset (or simulated clinical movement profiles), structures them into leakage-free temporal windows, and trains a 1D CNN-GRU architecture to learn low-dimensional movement embeddings.

---

## 1. Pipeline Overview

```
StrokeRehab Kinematics (Time-ordered 6-DOF)
    │
    ▼
dataset_preprocessor.py
    ├── Strip optical marker names & patient IDs
    ├── Interpolate missing packets (< 50 ms)
    ├── Extract 28 Kinematic, Jerk, & Smoothness Features
    ├── Segment into 2.0s Windows @ 100 Hz (N x 200 x 28)
    ├── Subject-Level Split (70% Train, 15% Val, 15% Test) [Zero Patient Leakage]
    └── Fit Z-score Normalization on Train Split ONLY
    │
    ▼
train.py
    ├── 1D CNN Front-End (Conv1D 64 -> Conv1D 128)
    ├── Bidirectional GRU Core (Hidden 64)
    ├── Dense Bottleneck -> 16-d Movement Embedding (z)
    ├── Motor Stability Head (0 - 100)
    ├── Self-Supervised Transposed-Conv Reconstruction Loss + Smoothness Regularizer
    └── Benchmark against CNN-LSTM Baseline
    │
    ▼
inference.py
    └── Real-time single-window forward pass (< 5 ms per 200x28 window)
```

---

## 2. Feature Specification (28 Features)

| Index | Feature Symbol | Description |
| :--- | :--- | :--- |
| **0 - 3** | $a_x, a_y, a_z, \|a\|$ | Linear acceleration components and resultant magnitude ($g$). |
| **4 - 7** | $\omega_x, \omega_y, \omega_z, \|\omega\|$ | Angular velocities and resultant magnitude ($^\circ/\text{s}$). |
| **8 - 11** | $\dot{a}_x, \dot{a}_y, \dot{a}_z, \|\dot{a}\|$ | Linear jerk derivatives ($g/\text{s}$). |
| **12 - 15** | $\dot{\omega}_x, \dot{\omega}_y, \dot{\omega}_z, \|\dot{\omega}\|$ | Angular acceleration derivatives ($^\circ/\text{s}^2$). |
| **16 - 19** | $v_x, v_y, v_z, \|v\|$ | Drift-damped integrated linear velocity components. |
| **20 - 22** | $\text{pitch}, \text{roll}, \text{yaw\_rate}$ | Upper-limb orientation angles and yaw displacement rate. |
| **23** | $\sigma^2_{a, \text{window}}$ | Short-term acceleration variance (pathological tremor index). |
| **24** | $\text{SPARC}_{\text{proxy}}$ | Spectral Arc Length trajectory smoothness proxy. |
| **25** | $\text{Jerk}_{\text{norm}}$ | Dimensionless normalized jerk index. |
| **26** | $\text{Curvature}$ | 3D trajectory path curvature. |
| **27** | $\text{Stability}$ | Motor hold stability score ($0 - 100$). |

---

## 3. Quick Start

### Step 1: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Run Dataset Preprocessing & Windowing
```bash
python3 dataset_preprocessor.py
```
Outputs saved to `ai_pipeline/data/`:
- `train_windows.json` ($N_{\text{train}} \times 200 \times 28$)
- `val_windows.json` ($N_{\text{val}} \times 200 \times 28$)
- `test_windows.json` ($N_{\text{test}} \times 200 \times 28$)
- `metadata.json` (normalization scalars $\mu_{\text{train}}, \sigma_{\text{train}}$)

### Step 3: Train the 1D CNN-GRU Model
```bash
python3 train.py --epochs 10 --batch_size 32
```
Outputs:
- Saved checkpoint: `ai_pipeline/weights/movement_encoder.pt`
- ONNX export: `ai_pipeline/weights/movement_encoder.onnx`

### Step 4: Run Single-Window Inference Benchmark
```bash
python3 inference.py
```
Validates runtime throughput ($< 5\text{ ms}$ latency), outputting the 16-d movement embedding vector $\mathbf{z}$ and the motor stability score.

---

## 4. Methodological Safeguards
- **Non-Clinical Dataset Boundary:** StrokeRehab kinematic data is strictly used for movement trajectory modeling. No cognitive decline labels or clinical diagnosis claims are made.
- **Leakage Prevention:** Normalization statistics ($\mu, \sigma$) are computed strictly on the training partition. All windows from any individual subject are confined entirely to either Train, Val, or Test.
- **Real-Time Feasibility:** Single-window inference executes within $< 5\text{ ms}$ on CPU, well within the $16.6\text{ ms}$ VR rendering frame budget.
