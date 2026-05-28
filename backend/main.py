from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from enum import Enum

app = FastAPI(title="Sistema de Semáforo", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Conjuntos numéricos (modelagem do documento)
# ─────────────────────────────────────────────

class EstadoSemaforo(str, Enum):
    EVH = "evh"   # Verde Horizontal
    EAH = "eah"   # Amarelo Horizontal
    EMH = "emh"   # Vermelho Horizontal
    EVV = "evv"   # Verde Vertical
    EAV = "eav"   # Amarelo Vertical
    EMV = "emv"   # Vermelho Vertical
    EPV = "epv"   # Pedestre Verde
    EPM = "epm"   # Pedestre Vermelho


# Tabela verdade conforme documento
TABELA_VERDADE = {
    "EVH": {"evh":1,"eah":0,"emh":0,"evv":0,"eav":0,"emv":1,"epv":0,"epm":1},
    "EAH": {"evh":0,"eah":1,"emh":0,"evv":0,"eav":0,"emv":1,"epv":0,"epm":1},
    "EVV": {"evh":0,"eah":0,"emh":1,"evv":1,"eav":0,"emv":0,"epv":0,"epm":1},
    "EAV": {"evh":0,"eah":0,"emh":1,"evv":0,"eav":1,"emv":0,"epv":0,"epm":1},
    "EPV": {"evh":0,"eah":0,"emh":1,"evv":0,"eav":0,"emv":1,"epv":1,"epm":0},
}


# ─────────────────────────────────────────────
# Modelos de entrada/saída
# ─────────────────────────────────────────────

class Entradas(BaseModel):
    VH: bool = False  # Veículo horizontal
    VV: bool = False  # Veículo vertical
    P:  bool = False  # Pedestre aguardando


class Resultado(BaseModel):
    estado_ativo: str
    descricao: str
    expressao_logica: str
    bits: dict
    conflito: bool
    semaforo_h: str   # red | yellow | green
    semaforo_v: str
    semaforo_p: str   # red | green


# ─────────────────────────────────────────────
# Motor de regras lógicas (conforme documento)
# ─────────────────────────────────────────────

def avaliar(VH: bool, VV: bool, P: bool) -> Resultado:

    # Regra de segurança: ¬(evh ∧ evv) garantida estruturalmente

    # Libera horizontal: VH ∧ ¬VV
    if VH and not VV:
        return Resultado(
            estado_ativo="EVH",
            descricao="Horizontal livre. Via vertical bloqueada.",
            expressao_logica="VH ∧ ¬VV  →  evh",
            bits=TABELA_VERDADE["EVH"],
            conflito=False,
            semaforo_h="green",
            semaforo_v="red",
            semaforo_p="red",
        )

    # Libera vertical: VV ∧ ¬VH
    if VV and not VH:
        return Resultado(
            estado_ativo="EVV",
            descricao="Vertical livre. Via horizontal bloqueada.",
            expressao_logica="VV ∧ ¬VH  →  evv",
            bits=TABELA_VERDADE["EVV"],
            conflito=False,
            semaforo_h="red",
            semaforo_v="green",
            semaforo_p="red",
        )

    # Travessia de pedestre: P ∧ ¬VH ∧ ¬VV
    if P and not VH and not VV:
        return Resultado(
            estado_ativo="EPV",
            descricao="Sem veículos. Pedestre pode atravessar.",
            expressao_logica="P ∧ ¬VH ∧ ¬VV  →  epv",
            bits=TABELA_VERDADE["EPV"],
            conflito=False,
            semaforo_h="red",
            semaforo_v="red",
            semaforo_p="green",
        )

    # Conflito entre vias: VH ∧ VV
    if VH and VV:
        bits_conflito = {"evh":0,"eah":1,"emh":0,"evv":0,"eav":1,"emv":0,"epv":0,"epm":1}
        return Resultado(
            estado_ativo="CONFLITO (EAH + EAV)",
            descricao="Veículos nas duas vias. Fase de transição amarela.",
            expressao_logica="VH ∧ VV  →  eah, eav (transição)",
            bits=bits_conflito,
            conflito=True,
            semaforo_h="yellow",
            semaforo_v="yellow",
            semaforo_p="red",
        )

    # Prioridade pedestre com veículos: P ∧ VH ou P ∧ VV
    if P and (VH or VV):
        estado = "EAH" if VH else "EAV"
        via = "horizontal" if VH else "vertical"
        return Resultado(
            estado_ativo=f"{estado} → aguardando EPV",
            descricao=f"Pedestre aguarda fim do fluxo {via}.",
            expressao_logica=f"P ∧ V{'H' if VH else 'V'}  →  aguarda epv",
            bits=TABELA_VERDADE[estado],
            conflito=False,
            semaforo_h="yellow" if VH else "red",
            semaforo_v="yellow" if VV else "red",
            semaforo_p="red",
        )

    # Nenhuma entrada ativa
    bits_idle = {k: 0 for k in ["evh","eah","emh","evv","eav","emv","epv","epm"]}
    bits_idle["emh"] = 1
    bits_idle["emv"] = 1
    bits_idle["epm"] = 1
    return Resultado(
        estado_ativo="IDLE",
        descricao="Nenhuma entrada ativa. Sistema em espera.",
        expressao_logica="¬VH ∧ ¬VV ∧ ¬P",
        bits=bits_idle,
        conflito=False,
        semaforo_h="red",
        semaforo_v="red",
        semaforo_p="red",
    )


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@app.get("/")
def raiz():
    return {"status": "ok", "sistema": "Semáforo v1.0"}


@app.post("/avaliar", response_model=Resultado)
def avaliar_estado(entradas: Entradas):
    """Recebe as entradas VH, VV, P e retorna o estado do semáforo."""
    return avaliar(entradas.VH, entradas.VV, entradas.P)


@app.get("/tabela-verdade")
def obter_tabela():
    """Retorna a tabela verdade completa do sistema."""
    return TABELA_VERDADE


@app.get("/conjuntos")
def obter_conjuntos():
    """Retorna a definição dos conjuntos numéricos do sistema."""
    return {
        "V":  "Conjunto de veículos: {v1, v2, v3, ...}",
        "FH": "Faixas horizontais: {fh1, fh2, fh3, ...}",
        "FV": "Faixas verticais: {fv1, fv2, fv3, ...}",
        "P":  "Pedestres: {p1, p2, p3, ...}",
        "E":  list(EstadoSemaforo),
        "S":  "S = V ∪ FH ∪ FV ∪ P ∪ E  (conjunto geral do sistema)",
        "uniao_faixas":   "F = FH ∪ FV",
        "uniao_agentes":  "V ∪ P",
        "intersecao_vias":"FH ∩ FV  (região de conflito)",
        "independencia":  "V ∩ P = ∅",
    }
