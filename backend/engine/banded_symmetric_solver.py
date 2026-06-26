import numpy as np


class BandedSymmetricMatrix:
    """
    Stores a symmetric matrix in banded form.
    Only lower bandwidth is stored for efficiency.
    """

    def __init__(self, n, half_bandwidth):
        self.n = n
        self.hb = half_bandwidth
        self.data = np.zeros((n, half_bandwidth + 1))

    @staticmethod
    def from_full(K, half_bandwidth=1):
        n = K.shape[0]
        band = BandedSymmetricMatrix(n, half_bandwidth)

        for i in range(n):
            for j in range(max(0, i - half_bandwidth), i + 1):
                band.data[i, i - j] = K[i, j]

        return band


def solve_banded_symmetric(band: BandedSymmetricMatrix, F):
    """
    Solves Kx = F using simplified LDLᵀ factorization
    for symmetric banded matrices.
    """

    n = band.n
    hb = band.hb

    K = band.data.copy()

    # -------------------------
    # LDLᵀ decomposition
    # -------------------------
    for i in range(n):
        for k in range(max(0, i - hb), i):
            lik = K[i, i - k] / K[k, 0]

            for j in range(i, min(n, i + hb + 1)):
                if j - k < K.shape[1] and j - i < K.shape[1]:
                    K[i, j - i] -= lik * K[k, j - k]

            K[i, i - k] = lik

    # -------------------------
    # Forward substitution
    # -------------------------
    y = np.zeros(n)
    for i in range(n):
        s = 0
        for k in range(max(0, i - hb), i):
            s += K[i, i - k] * y[k]
        y[i] = F[i] - s

    # -------------------------
    # Back substitution
    # -------------------------
    x = np.zeros(n)
    for i in reversed(range(n)):
        s = 0
        for k in range(i + 1, min(n, i + hb + 1)):
            s += K[k, k - i] * x[k]
        x[i] = (y[i] - s) / K[i, 0]

    return x, 1.0