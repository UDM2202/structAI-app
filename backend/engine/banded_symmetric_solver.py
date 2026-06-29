from __future__ import annotations

from dataclasses import dataclass
from typing import List, Sequence, Tuple, Optional
import math


Number = float


@dataclass
class BandedSymmetricMatrix:
    n: int
    half_bandwidth: int
    data: List[List[Number]]

    @classmethod
    def zeros(cls, n: int, half_bandwidth: int) -> "BandedSymmetricMatrix":
        if n <= 0:
            raise ValueError("Matrix size n must be positive.")
        if half_bandwidth < 0:
            raise ValueError("Half-bandwidth must be >= 0.")
        data = [[0.0 for _ in range(half_bandwidth + 1)] for _ in range(n)]
        return cls(n=n, half_bandwidth=half_bandwidth, data=data)

    @classmethod
    def from_full(cls, full_matrix: Sequence[Sequence[Number]], half_bandwidth: int) -> "BandedSymmetricMatrix":
        n = len(full_matrix)
        if n == 0:
            raise ValueError("Full matrix must not be empty.")
        for row in full_matrix:
            if len(row) != n:
                raise ValueError("Full matrix must be square.")
        banded = cls.zeros(n=n, half_bandwidth=half_bandwidth)
        for i in range(n):
            for j in range(max(0, i - half_bandwidth), i + 1):
                banded.set(i, j, float(full_matrix[i][j]))
        return banded

    def copy(self) -> "BandedSymmetricMatrix":
        return BandedSymmetricMatrix(n=self.n, half_bandwidth=self.half_bandwidth, data=[row[:] for row in self.data])

    def in_band(self, i: int, j: int) -> bool:
        self._check_indices(i, j)
        return abs(i - j) <= self.half_bandwidth

    def get(self, i: int, j: int) -> Number:
        self._check_indices(i, j)
        if i >= j:
            offset = i - j
            if offset > self.half_bandwidth:
                return 0.0
            return self.data[i][offset]
        else:
            offset = j - i
            if offset > self.half_bandwidth:
                return 0.0
            return self.data[j][offset]

    def set(self, i: int, j: int, value: Number) -> None:
        self._check_indices(i, j)
        if abs(i - j) > self.half_bandwidth:
            if abs(value) > 0.0:
                raise ValueError(f"Cannot set K[{i},{j}] = {value}: outside half-bandwidth {self.half_bandwidth}.")
            return
        if i >= j:
            self.data[i][i - j] = float(value)
        else:
            self.data[j][j - i] = float(value)

    def add(self, i: int, j: int, value: Number) -> None:
        current = self.get(i, j)
        self.set(i, j, current + float(value))

    def to_full(self) -> List[List[Number]]:
        full = [[0.0 for _ in range(self.n)] for _ in range(self.n)]
        for i in range(self.n):
            j_start = max(0, i - self.half_bandwidth)
            for j in range(j_start, i + 1):
                v = self.get(i, j)
                full[i][j] = v
                full[j][i] = v
        return full

    def _check_indices(self, i: int, j: int) -> None:
        if not (0 <= i < self.n and 0 <= j < self.n):
            raise IndexError(f"Indices out of range: ({i}, {j}) for matrix size {self.n}.")


@dataclass
class LDLTFactorization:
    n: int
    half_bandwidth: int
    l_data: List[List[Number]]
    d: List[Number]

    def get_l(self, i: int, j: int) -> Number:
        if i == j:
            return 1.0
        if i < j:
            return 0.0
        offset = i - j
        if offset > self.half_bandwidth:
            return 0.0
        return self.l_data[i][offset]

    def solve(self, rhs: Sequence[Number]) -> List[Number]:
        if len(rhs) != self.n:
            raise ValueError("RHS length must match matrix size.")
        y = [0.0] * self.n
        for i in range(self.n):
            total = float(rhs[i])
            j_start = max(0, i - self.half_bandwidth)
            for j in range(j_start, i):
                total -= self.get_l(i, j) * y[j]
            y[i] = total
        z = [0.0] * self.n
        for i in range(self.n):
            if abs(self.d[i]) < 1e-30:
                raise ZeroDivisionError(f"Zero diagonal encountered in D at index {i}.")
            z[i] = y[i] / self.d[i]
        x = [0.0] * self.n
        for i in reversed(range(self.n)):
            total = z[i]
            j_end = min(self.n - 1, i + self.half_bandwidth)
            for j in range(i + 1, j_end + 1):
                total -= self.get_l(j, i) * x[j]
            x[i] = total
        return x


def ldlt_factor_banded_symmetric(K: BandedSymmetricMatrix, pivot_tolerance: float = 1e-14, require_positive_definite: bool = True) -> LDLTFactorization:
    n = K.n
    hb = K.half_bandwidth
    l_data = [[0.0 for _ in range(hb + 1)] for _ in range(n)]
    d = [0.0 for _ in range(n)]
    for i in range(n):
        diag_sum = K.get(i, i)
        k_start = max(0, i - hb)
        for k in range(k_start, i):
            lik = l_data[i][i - k]
            diag_sum -= lik * lik * d[k]
        d[i] = diag_sum
        if abs(d[i]) < pivot_tolerance:
            raise ValueError(f"Near-zero pivot at index {i}. Matrix may be singular or BCs incomplete.")
        if require_positive_definite and d[i] <= 0.0:
            raise ValueError(f"Non-positive D[{i}] = {d[i]:.6e}. Matrix not positive definite.")
        j_end = min(n - 1, i + hb)
        for j in range(i + 1, j_end + 1):
            total = K.get(j, i)
            k_start_common = max(0, max(i - hb, j - hb))
            for k in range(k_start_common, i):
                ljk = l_data[j][j - k]
                lik = l_data[i][i - k]
                total -= ljk * lik * d[k]
            l_data[j][j - i] = total / d[i]
    for i in range(n):
        l_data[i][0] = 1.0
    return LDLTFactorization(n=n, half_bandwidth=hb, l_data=l_data, d=d)


def matvec_banded_symmetric(K: BandedSymmetricMatrix, x: Sequence[Number]) -> List[Number]:
    if len(x) != K.n:
        raise ValueError("Vector length must match matrix size.")
    y = [0.0] * K.n
    for i in range(K.n):
        j_start = max(0, i - K.half_bandwidth)
        j_end = min(K.n - 1, i + K.half_bandwidth)
        total = 0.0
        for j in range(j_start, j_end + 1):
            total += K.get(i, j) * float(x[j])
        y[i] = total
    return y


def residual_banded_symmetric(K: BandedSymmetricMatrix, x: Sequence[Number], f: Sequence[Number]) -> List[Number]:
    kx = matvec_banded_symmetric(K, x)
    return [kx[i] - float(f[i]) for i in range(K.n)]


def max_abs(values: Sequence[Number]) -> Number:
    return max(abs(v) for v in values) if values else 0.0


def solve_banded_symmetric(K: BandedSymmetricMatrix, f: Sequence[Number], pivot_tolerance: float = 1e-14, require_positive_definite: bool = True) -> Tuple[List[Number], LDLTFactorization]:
    if len(f) != K.n:
        raise ValueError("Load vector length must match matrix size.")
    factor = ldlt_factor_banded_symmetric(K=K, pivot_tolerance=pivot_tolerance, require_positive_definite=require_positive_definite)
    x = factor.solve(f)
    return x, factor


def estimate_half_bandwidth_from_connectivity(element_dof_lists: Sequence[Sequence[int]]) -> int:
    hb = 0
    for dofs in element_dof_lists:
        if not dofs:
            continue
        local_hb = max(dofs) - min(dofs)
        hb = max(hb, local_hb)
    return hb


def assemble_element_to_global(global_K: BandedSymmetricMatrix, element_K: Sequence[Sequence[Number]], dof_map: Sequence[int]) -> None:
    m = len(dof_map)
    if len(element_K) != m or any(len(row) != m for row in element_K):
        raise ValueError("Element stiffness matrix dimensions must match dof_map length.")
    for a in range(m):
        I = dof_map[a]
        for b in range(a + 1):
            J = dof_map[b]
            global_K.add(I, J, float(element_K[a][b]))


def apply_boundary_conditions_by_reduction(full_K: Sequence[Sequence[Number]], full_f: Sequence[Number], restrained_dofs: Sequence[int]) -> Tuple[List[List[Number]], List[Number], List[int]]:
    n = len(full_K)
    restrained = set(restrained_dofs)
    free_dofs = [i for i in range(n) if i not in restrained]
    reduced_K = []
    reduced_f = []
    for i in free_dofs:
        row = []
        for j in free_dofs:
            row.append(float(full_K[i][j]))
        reduced_K.append(row)
        reduced_f.append(float(full_f[i]))
    return reduced_K, reduced_f, free_dofs