# Sistema de Semáforo — Simulador

Projeto completo com **backend em Python (FastAPI)** e **frontend em HTML/CSS/JS**,
implementando a modelagem lógica e conjuntos numéricos do documento A3.

---

## Estrutura do projeto

```
semaforo/
├── backend/
│   ├── main.py           # API FastAPI com todas as regras lógicas
│   └── requirements.txt  # Dependências Python
└── frontend/
    └── index.html        # Interface completa (abre direto no navegador)
```

---

## Como rodar

### 1. Backend (FastAPI)

```bash
cd backend

# Instalar dependências
pip install -r requirements.txt

# Iniciar servidor
uvicorn main:app --reload --port 8000
```

A API estará disponível em: `http://localhost:8000`

Documentação automática (Swagger): `http://localhost:8000/docs`

---

### 2. Frontend

Abra o arquivo `frontend/index.html` direto no navegador.

> O frontend tenta chamar a API em `localhost:8000`. Se o backend estiver offline,
> ele roda as regras lógicas localmente (modo fallback) e avisa no log.

---

## Endpoints da API

| Método | Rota                | Descrição                             |
| ------- | ------------------- | --------------------------------------- |
| POST    | `/avaliar`        | Avalia as entradas e retorna o estado   |
| GET     | `/tabela-verdade` | Retorna a tabela verdade completa       |
| GET     | `/conjuntos`      | Retorna os conjuntos numéricos (S,F…) |
| GET     | `/docs`           | Swagger UI (documentação interativa)  |

### Exemplo de chamada

```bash
curl -X POST http://localhost:8000/avaliar \
  -H "Content-Type: application/json" \
  -d '{"VH": true, "VV": false, "P": false}'
```

Resposta:

```json
{
  "estado_ativo": "EVH",
  "descricao": "Horizontal livre. Via vertical bloqueada.",
  "expressao_logica": "VH ∧ ¬VV  →  evh",
  "bits": {"evh":1,"eah":0,"emh":0,"evv":0,"eav":0,"emv":1,"epv":0,"epm":1},
  "conflito": false,
  "semaforo_h": "green",
  "semaforo_v": "red",
  "semaforo_p": "red"
}
```

---

## Regras lógicas implementadas

| Condição           | Expressão         | Estado ativado |
| -------------------- | ------------------ | -------------- |
| Libera horizontal    | VH ∧ ¬VV         | EVH            |
| Libera vertical      | VV ∧ ¬VH         | EVV            |
| Travessia pedestre   | P ∧ ¬VH ∧ ¬VV  | EPV            |
| Conflito entre vias  | VH ∧ VV           | EAH + EAV      |
| Pedestre c/ veículo | P ∧ VH ou P ∧ VV | Aguarda → EPV |
| Segurança           | ¬(evh ∧ evv)     | (invariante)   |

---

## Conjuntos numéricos

```
V  = {v1, v2, ...}        Veículos
FH = {fh1, fh2, ...}      Faixas horizontais
FV = {fv1, fv2, ...}      Faixas verticais
P  = {p1, p2, ...}        Pedestres
E  = {evh, eah, emh, evv, eav, emv, epv, epm}

S = V ∪ FH ∪ FV ∪ P ∪ E  (conjunto geral)
F = FH ∪ FV               (união de faixas)
V ∩ P = ∅                 (independência)
FH ∩ FV                   (região de conflito)
```
