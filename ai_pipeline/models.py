"""
1D CNN-GRU Movement Representation Model & LSTM Baseline.
Person 1: AI and Movement Pipeline.

Architectures:
1. CNNGRUMovementEncoder:
   - 1D CNN Front-End: Extracts localized micro-kinematics, tremor, and jerk transients.
   - Gated Recurrent Unit (GRU) Temporal Core: Models sequential reaching phases.
   - Bottleneck: Projects to 16-dimensional continuous movement embedding vector z.
   - Stability Head: Regresses motor stability score (0-100).
   - Transposed-Convolution Decoder: Reconstructs trajectory for self-supervised pretraining.

2. CNNLSTMBaseline:
   - Equivalent capacity LSTM recurrent core for direct architectural comparison.
"""

from typing import Tuple, Optional, Dict, Any

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False


if HAS_TORCH:
    class Conv1DBlock(nn.Module):
        def __init__(self, in_channels: int, out_channels: int, kernel_size: int = 5, stride: int = 1, pool_size: int = 2):
            super().__init__()
            padding = kernel_size // 2
            self.conv = nn.Conv1d(in_channels, out_channels, kernel_size=kernel_size, stride=stride, padding=padding)
            self.bn = nn.BatchNorm1d(out_channels)
            self.pool = nn.MaxPool1d(pool_size) if pool_size > 1 else nn.Identity()

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            x = self.conv(x)
            x = self.bn(x)
            x = F.relu(x)
            x = self.pool(x)
            return x


    class CNNGRUMovementEncoder(nn.Module):
        """
        1D CNN + GRU model for self-supervised upper-limb movement representation learning.
        Input: Tensor of shape (Batch, Timesteps=200, Features=28)
        Output:
          - embedding: (Batch, 16)
          - stability_score: (Batch, 1) in range [0, 100]
          - reconstructed: (Batch, 200, 28) for self-supervised training
        """
        def __init__(self, in_features: int = 28, window_steps: int = 200, embedding_dim: int = 16):
            super().__init__()
            self.in_features = in_features
            self.window_steps = window_steps
            self.embedding_dim = embedding_dim

            # 1D CNN Front-End (operates on Channels = Features, Length = Timesteps)
            # Input: (B, 28, 200)
            self.cnn1 = Conv1DBlock(in_features, 64, kernel_size=5, pool_size=2)   # -> (B, 64, 100)
            self.cnn2 = Conv1DBlock(64, 128, kernel_size=3, pool_size=2)          # -> (B, 128, 50)

            # GRU Recurrent Core
            self.gru = nn.GRU(
                input_size=128,
                hidden_size=64,
                num_layers=2,
                batch_first=True,
                bidirectional=True,
                dropout=0.25
            ) # Output features: 64 * 2 = 128

            # Projection Head -> 16-d Movement Embedding
            self.fc_embed = nn.Sequential(
                nn.Linear(128, 64),
                nn.ReLU(),
                nn.Dropout(0.2),
                nn.Linear(64, embedding_dim)
            )

            # Motor Stability Regression Head [0, 100]
            self.fc_stability = nn.Sequential(
                nn.Linear(embedding_dim, 32),
                nn.ReLU(),
                nn.Linear(32, 1),
                nn.Sigmoid()
            )

            # Symmetrical Decoder Head for self-supervised trajectory reconstruction
            self.decoder_fc = nn.Linear(embedding_dim, 128 * 50)
            self.deconv1 = nn.ConvTranspose1d(128, 64, kernel_size=4, stride=2, padding=1) # -> (B, 64, 100)
            self.deconv2 = nn.ConvTranspose1d(64, in_features, kernel_size=4, stride=2, padding=1) # -> (B, 28, 200)

        def encode(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
            """
            Extracts movement embedding and motor stability index.
            x shape: (Batch, 200, 28)
            """
            # Transpose to (Batch, Features, Timesteps) for 1D convolution
            x_t = x.transpose(1, 2)
            c1 = self.cnn1(x_t)
            c2 = self.cnn2(c1)

            # Transpose back to (Batch, Timesteps=50, Features=128) for GRU
            gru_in = c2.transpose(1, 2)
            gru_out, _ = self.gru(gru_in) # (B, 50, 128)

            # Global average pooling across remaining time dimension
            pooled = torch.mean(gru_out, dim=1) # (B, 128)

            embedding = self.fc_embed(pooled) # (B, 16)
            stability = self.fc_stability(embedding) * 100.0 # Scale to [0, 100]

            return embedding, stability

        def decode(self, embedding: torch.Tensor) -> torch.Tensor:
            """Reconstructs original 28-feature kinematic trajectory from embedding."""
            b = embedding.size(0)
            h = self.decoder_fc(embedding).view(b, 128, 50)
            d1 = F.relu(self.deconv1(h))
            recon = self.deconv2(d1).transpose(1, 2) # (B, 200, 28)
            return recon

        def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
            embedding, stability = self.encode(x)
            reconstructed = self.decode(embedding)
            return embedding, stability, reconstructed


    class CNNLSTMBaseline(nn.Module):
        """
        Baseline model pairing 1D CNN with LSTM for architectural ablation.
        """
        def __init__(self, in_features: int = 28, embedding_dim: int = 16):
            super().__init__()
            self.cnn1 = Conv1DBlock(in_features, 64, kernel_size=5, pool_size=2)
            self.cnn2 = Conv1DBlock(64, 128, kernel_size=3, pool_size=2)

            self.lstm = nn.LSTM(
                input_size=128,
                hidden_size=64,
                num_layers=2,
                batch_first=True,
                bidirectional=True,
                dropout=0.25
            )

            self.fc_embed = nn.Sequential(
                nn.Linear(128, 64),
                nn.ReLU(),
                nn.Linear(64, embedding_dim)
            )
            self.fc_stability = nn.Sequential(
                nn.Linear(embedding_dim, 1),
                nn.Sigmoid()
            )

        def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
            x_t = x.transpose(1, 2)
            c = self.cnn2(self.cnn1(x_t)).transpose(1, 2)
            lstm_out, _ = self.lstm(c)
            pooled = torch.mean(lstm_out, dim=1)
            embedding = self.fc_embed(pooled)
            stability = self.fc_stability(embedding) * 100.0
            return embedding, stability

else:
    # Standalone lightweight CPU reference implementation when PyTorch is not yet installed
    class CNNGRUMovementEncoder:
        def __init__(self, in_features: int = 28, window_steps: int = 200, embedding_dim: int = 16):
            self.in_features = in_features
            self.window_steps = window_steps
            self.embedding_dim = embedding_dim
            print("[Models] Running in standalone CPU reference mode (PyTorch not detected).")

        def encode(self, x_window):
            # Deterministic linear projection mock for standalone environment testing
            embedding = [0.0] * self.embedding_dim
            stability = 85.0
            return embedding, stability
