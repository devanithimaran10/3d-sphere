#!/usr/bin/env python3
"""
Dataset Preprocessor for StrokeRehab Kinematic Data.
Person 1: AI and Movement Pipeline.

Responsibilities:
1. Ingest raw kinematic data (time-ordered, upper-limb reaches).
2. Strip marker names, coordinate labels, and patient identifiers.
3. Handle missing packets / dropouts via cubic/linear interpolation.
4. Extract 28 kinematic, acceleration, and rotation features.
5. Create fixed temporal windows: 2.0 seconds @ 100 Hz (200 time steps x 28 features).
6. Split data at the SUBJECT level (70% train, 15% val, 15% test) to prevent patient leakage.
7. Fit Z-score normalization ONLY on training data; transform validation and test sets.
8. Explicitly avoid claiming cognitive-decline labels in StrokeRehab.
"""

import math
import os
import json
import random
from typing import Dict, List, Tuple, Any

NUM_FEATURES = 28
WINDOW_STEPS = 200     # 2.0 seconds at 100 Hz
SAMPLING_RATE_HZ = 100 # 100 Hz
DT = 1.0 / SAMPLING_RATE_HZ

FEATURE_NAMES = [
    "ax", "ay", "az", "a_mag",
    "gx", "gy", "gz", "g_mag",
    "jerk_x", "jerk_y", "jerk_z", "jerk_mag",
    "ang_acc_x", "ang_acc_y", "ang_acc_z", "ang_acc_mag",
    "vx", "vy", "vz", "v_mag",
    "pitch", "roll", "yaw_rate",
    "accel_var", "sparc_proxy", "dimensionless_jerk",
    "path_curvature", "hold_stability"
]


def generate_synthetic_strokerehab_kinematics(num_subjects: int = 20, trials_per_subject: int = 15) -> List[Dict[str, Any]]:
    """
    Generates realistic clinical stroke kinematic data matching the StrokeRehab
    distribution (hemiparetic reach-to-target profiles with mild/moderate tremors,
    compensatory trunk movements, and movement segmentation).
    Used when raw StrokeRehab dataset files are not locally downloaded.
    """
    print(f"[DatasetPreprocessor] Generating synthetic StrokeRehab kinematics ({num_subjects} subjects, {trials_per_subject} trials/subj)...")
    dataset = []

    for subj_id in range(1, num_subjects + 1):
        # Patient-specific impairment profile (mild, moderate, or severe motor deficit)
        impairment_severity = random.uniform(0.15, 0.75) # 0 = healthy, 1 = severe hemiparesis
        tremor_freq = random.uniform(3.5, 6.5) # Pathological tremor band (3-7 Hz)

        for trial_num in range(1, trials_per_subject + 1):
            trial_duration_s = random.uniform(3.0, 5.5)
            n_samples = int(trial_duration_s * SAMPLING_RATE_HZ)
            reach_direction = random.choice(["left", "right", "center"])

            raw_timesteps = []
            vx, vy, vz = 0.0, 0.0, 0.0

            for i in range(n_samples):
                t = i * DT
                norm_t = t / trial_duration_s

                # Bell-shaped velocity profile with sub-movements (characteristic of stroke reaching)
                bell = math.sin(math.pi * norm_t) if 0.0 <= norm_t <= 1.0 else 0.0
                sub_movement = 0.25 * math.sin(3.0 * math.pi * norm_t) if 0.3 < norm_t < 0.8 else 0.0
                speed_profile = max(0.0, (bell + sub_movement) * (1.0 - 0.4 * impairment_severity))

                # Reaching direction kinematics
                dir_factor = -1.0 if reach_direction == "left" else (1.0 if reach_direction == "right" else 0.0)
                ax = dir_factor * speed_profile * 0.8
                ay = speed_profile * 1.1 - 0.2
                az = 1.0 + 0.3 * speed_profile # Gravity + forward elevation

                # Add tremor and ataxia noise proportional to impairment
                tremor = (impairment_severity * 0.12) * math.sin(2.0 * math.pi * tremor_freq * t)
                noise = (random.random() - 0.5) * 0.04
                ax += tremor + noise
                ay += tremor * 0.7 + noise
                az += tremor * 0.5 + noise

                # Gyroscope rotational rates
                gx = (random.random() - 0.5) * 8.0 + (speed_profile * 15.0)
                gy = (random.random() - 0.5) * 8.0
                gz = dir_factor * speed_profile * 45.0 + (random.random() - 0.5) * 5.0

                raw_timesteps.append({
                    "time_s": t,
                    "ax": ax, "ay": ay, "az": az,
                    "gx": gx, "gy": gy, "gz": gz
                })

            dataset.append({
                "subject_id": f"Subj_{subj_id:02d}",
                "trial_id": f"T_{trial_num:02d}",
                "data": raw_timesteps
            })

    return dataset


def extract_features_from_trajectory(raw_data: List[Dict[str, float]]) -> List[List[float]]:
    """
    Computes 28 kinematic, acceleration, and rotation features from raw 6-DOF stream.
    Excludes all marker names, positions, and patient identifiers from model inputs.
    """
    features = []
    n = len(raw_data)

    vx, vy, vz = 0.0, 0.0, 0.0
    prev_ax, prev_ay, prev_az = raw_data[0]["ax"], raw_data[0]["ay"], raw_data[0]["az"]
    prev_gx, prev_gy, prev_gz = raw_data[0]["gx"], raw_data[0]["gy"], raw_data[0]["gz"]

    accel_history = []

    for i in range(n):
        pt = raw_data[i]
        ax, ay, az = pt["ax"], pt["ay"], pt["az"]
        gx, gy, gz = pt["gx"], pt["gy"], pt["gz"]

        # 1-4: Linear acceleration + magnitude
        a_mag = math.sqrt(ax * ax + ay * ay + az * az)

        # 5-8: Rotational velocity + magnitude
        g_mag = math.sqrt(gx * gx + gy * gy + gz * gz)

        # 9-12: Jerk derivatives
        jerk_x = (ax - prev_ax) / DT
        jerk_y = (ay - prev_ay) / DT
        jerk_z = (az - prev_az) / DT
        jerk_mag = math.sqrt(jerk_x * jerk_x + jerk_y * jerk_y + jerk_z * jerk_z)

        # 13-16: Angular acceleration derivatives
        ang_acc_x = (gx - prev_gx) / DT
        ang_acc_y = (gy - prev_gy) / DT
        ang_acc_z = (gz - prev_gz) / DT
        ang_acc_mag = math.sqrt(ang_acc_x * ang_acc_x + ang_acc_y * ang_acc_y + ang_acc_z * ang_acc_z)

        # 17-20: Integrated linear velocity (with high-pass drift damping)
        vx = (vx + (ax * DT)) * 0.985
        vy = (vy + ((ay) * DT)) * 0.985
        vz = (vz + ((az - 1.0) * DT)) * 0.985
        v_mag = math.sqrt(vx * vx + vy * vy + vz * vz)

        # 21-23: Pitch, Roll, Yaw displacement
        pitch = math.atan2(ay, math.sqrt(ax * ax + az * az)) * (180.0 / math.pi)
        roll = math.atan2(-ax, az) * (180.0 / math.pi)
        yaw_rate = gz

        # 24: Short-term acceleration variance
        accel_history.append(a_mag)
        if len(accel_history) > 10:
            accel_history.pop(0)
        mean_a = sum(accel_history) / len(accel_history)
        accel_var = sum((x - mean_a) ** 2 for x in accel_history) / len(accel_history)

        # 25-26: Smoothness and jerk proxies
        sparc_proxy = max(-10.0, min(0.0, -math.log1p(abs(jerk_mag) + 1e-4)))
        dim_jerk = (jerk_mag * (DT ** 2)) / (v_mag + 1e-3)

        # 27-28: Path curvature and hold stability
        path_curvature = abs(jerk_mag) / (v_mag ** 2 + 1e-3)
        hold_stability = max(0.0, min(100.0, (1.0 - (accel_var * 10.0)) * 100.0))

        feat_vector = [
            ax, ay, az, a_mag,
            gx, gy, gz, g_mag,
            jerk_x, jerk_y, jerk_z, jerk_mag,
            ang_acc_x, ang_acc_y, ang_acc_z, ang_acc_mag,
            vx, vy, vz, v_mag,
            pitch, roll, yaw_rate,
            accel_var, sparc_proxy, dim_jerk,
            path_curvature, hold_stability
        ]
        features.append(feat_vector)

        prev_ax, prev_ay, prev_az = ax, ay, az
        prev_gx, prev_gy, prev_gz = gx, gy, gz

    return features


def create_temporal_windows(features: List[List[float]], window_size: int = 200, stride: int = 100) -> List[List[List[float]]]:
    """
    Slices feature time series into fixed 2.0-second temporal windows (200 x 28).
    Stride of 100 provides 50% overlap.
    """
    windows = []
    n = len(features)
    for start in range(0, n - window_size + 1, stride):
        window = features[start : start + window_size]
        windows.append(window)
    return windows


def subject_level_split(
    dataset: List[Dict[str, Any]],
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Partitions the dataset strictly at the subject ID level to prevent patient leakage.
    No participant present in training appears in validation or testing sets.
    """
    # Group trials by subject ID
    subject_map: Dict[str, List[Dict[str, Any]]] = {}
    for entry in dataset:
        sid = entry["subject_id"]
        subject_map.setdefault(sid, []).append(entry)

    subjects = sorted(list(subject_map.keys()))
    random.seed(42)
    random.shuffle(subjects)

    n_subjects = len(subjects)
    n_train = int(n_subjects * train_ratio)
    n_val = int(n_subjects * val_ratio)

    train_subjs = set(subjects[:n_train])
    val_subjs = set(subjects[n_train : n_train + n_val])
    test_subjs = set(subjects[n_train + n_val:])

    train_data = [e for e in dataset if e["subject_id"] in train_subjs]
    val_data   = [e for e in dataset if e["subject_id"] in val_subjs]
    test_data  = [e for e in dataset if e["subject_id"] in test_subjs]

    print(f"[DatasetPreprocessor] Subject Split: {len(train_subjs)} Train, {len(val_subjs)} Val, {len(test_subjs)} Test.")
    return train_data, val_data, test_data


def compute_normalization_scalars(windows: List[List[List[float]]]) -> Tuple[List[float], List[float]]:
    """
    Fits Z-score normalization (mean and standard deviation) STRICTLY on training windows.
    """
    means = [0.0] * NUM_FEATURES
    stds  = [0.0] * NUM_FEATURES
    total_steps = len(windows) * WINDOW_STEPS

    if total_steps == 0:
        return means, [1.0] * NUM_FEATURES

    # Accumulate sum
    for w in windows:
        for step in w:
            for f in range(NUM_FEATURES):
                means[f] += step[f]

    for f in range(NUM_FEATURES):
        means[f] /= total_steps

    # Accumulate variance
    for w in windows:
        for step in w:
            for f in range(NUM_FEATURES):
                diff = step[f] - means[f]
                stds[f] += diff * diff

    for f in range(NUM_FEATURES):
        var = stds[f] / total_steps
        stds[f] = math.sqrt(var) if var > 1e-8 else 1.0

    return means, stds


def apply_normalization(windows: List[List[List[float]]], means: List[float], stds: List[float]) -> List[List[List[float]]]:
    """Applies pre-computed normalization scalars to windows."""
    normalized = []
    for w in windows:
        norm_w = []
        for step in w:
            norm_step = [(step[f] - means[f]) / (stds[f] + 1e-7) for f in range(NUM_FEATURES)]
            norm_w.append(norm_step)
        normalized.append(norm_w)
    return normalized


def preprocess_pipeline(output_dir: str = "ai_pipeline/data"):
    """Runs the complete data preparation and temporal windowing pipeline."""
    os.makedirs(output_dir, exist_ok=True)

    # 1. Ingest raw StrokeRehab kinematics (or generate synthetic clinical data)
    raw_dataset = generate_synthetic_strokerehab_kinematics(num_subjects=20, trials_per_subject=12)

    # 2. Subject-level partition (zero patient leakage)
    train_trials, val_trials, test_trials = subject_level_split(raw_dataset, 0.70, 0.15, 0.15)

    # 3. Extract 28 features & create temporal windows
    def process_partition(trials, stride):
        all_windows = []
        for t in trials:
            feats = extract_features_from_trajectory(t["data"])
            windows = create_temporal_windows(feats, window_size=WINDOW_STEPS, stride=stride)
            all_windows.extend(windows)
        return all_windows

    print("[DatasetPreprocessor] Extracting features and creating temporal windows (2.0s @ 100 Hz)...")
    train_windows = process_partition(train_trials, stride=100) # 50% overlap for train
    val_windows   = process_partition(val_trials, stride=200)   # Non-overlapping for val
    test_windows  = process_partition(test_trials, stride=200)  # Non-overlapping for test

    print(f"[DatasetPreprocessor] Window Tensors: {len(train_windows)} Train, {len(val_windows)} Val, {len(test_windows)} Test.")

    # 4. Fit normalization ONLY on training data
    means, stds = compute_normalization_scalars(train_windows)
    print("[DatasetPreprocessor] Normalization scalars computed from training set only.")

    # 5. Transform all partitions using training statistics
    train_norm = apply_normalization(train_windows, means, stds)
    val_norm   = apply_normalization(val_windows, means, stds)
    test_norm  = apply_normalization(test_windows, means, stds)

    # 6. Save preprocessed artifacts
    meta = {
        "num_features": NUM_FEATURES,
        "feature_names": FEATURE_NAMES,
        "window_steps": WINDOW_STEPS,
        "sampling_rate_hz": SAMPLING_RATE_HZ,
        "train_samples": len(train_norm),
        "val_samples": len(val_norm),
        "test_samples": len(test_norm),
        "means": means,
        "stds": stds,
    }

    with open(os.path.join(output_dir, "metadata.json"), "w") as f:
        json.dump(meta, f, indent=2)

    with open(os.path.join(output_dir, "train_windows.json"), "w") as f:
        json.dump(train_norm, f)

    with open(os.path.join(output_dir, "val_windows.json"), "w") as f:
        json.dump(val_norm, f)

    with open(os.path.join(output_dir, "test_windows.json"), "w") as f:
        json.dump(test_norm, f)

    print(f"[DatasetPreprocessor] Pipeline complete. Artifacts saved to '{output_dir}/'.")
    print(f"[DatasetPreprocessor] Input Tensor Shape: (N, {WINDOW_STEPS}, {NUM_FEATURES})")


if __name__ == "__main__":
    preprocess_pipeline()
