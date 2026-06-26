import math
import numpy as np
import json
from banded_symmetric_solver import BandedSymmetricMatrix, solve_banded_symmetric


# =========================
# LOAD COST DATABASE
# =========================
def load_rates_db():
    with open("rates_db.json", "r") as f:
        return json.load(f)


# =========================
# FEM ELEMENT MATRIX
# =========================
def beam_stiffness(EI, L):
    k = EI / (L ** 3)
    return k * np.array([
        [12, 6*L, -12, 6*L],
        [6*L, 4*L**2, -6*L, 2*L**2],
        [-12, -6*L, 12, -6*L],
        [6*L, 2*L**2, -6*L, 4*L**2]
    ])


def beam_load(w, L):
    return np.array([
        -w*L/2,
        -w*L**2/12,
        -w*L/2,
        w*L**2/12
    ])


# =========================
# GLOBAL ASSEMBLY
# =========================
def assemble(L_list, EI, w):
    n_nodes = len(L_list) + 1
    dof = 2 * n_nodes

    K = np.zeros((dof, dof))
    F = np.zeros(dof)

    for i, L in enumerate(L_list):
        k = beam_stiffness(EI, L)
        f = beam_load(w, L)

        mapd = [2*i, 2*i+1, 2*i+2, 2*i+3]

        for a in range(4):
            for b in range(4):
                K[mapd[a], mapd[b]] += k[a, b]

        for a in range(4):
            F[mapd[a]] += f[a]

    return K, F


# =========================
# SUPPORT CONDITIONS
# =========================
def supports(n_nodes):
    restr = []
    for i in range(1, n_nodes-1):
        restr.append(2*i)
    return restr


# =========================
# CORE SOLVER
# =========================
def solve_system(K, F):
    free = np.setdiff1d(np.arange(len(F)), supports(len(F)//2))

    K_red = K[np.ix_(free, free)]
    F_red = F[free]

    band = BandedSymmetricMatrix.from_full(K_red, 1)
    d, _ = solve_banded_symmetric(band, F_red)

    full = np.zeros(len(F))
    full[free] = d

    return full


# =========================
# MAIN FUNCTION
# =========================
def design_one_way_continuous_slab(inputs):

    L_list = inputs["span_list"]
    w = inputs["w_ed"]

    E = 33000
    I = 1e6
    EI = E * I

    K, F = assemble(L_list, EI, w)

    d = solve_system(K, F)

    return {
        "displacements": d.tolist(),
        "status": "completed"
    }