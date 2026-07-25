import json, os

OUT = os.path.dirname(os.path.abspath(__file__))

# Spirale quadrata: for i = 1..36 -> avanti(lato), gira 89 gradi, lato += 7
# Convenzione BaseFlow: gli indici in `next` sono stringhe = posizione nell'array.
# Il corpo di un `for` termina puntando di nuovo al nodo `for`.
spiral = {
    "author": "Ismail Barakat",
    "variables": [
        {"name": "lato", "type": "int", "value": 0},
        {"name": "i", "type": "int", "value": 0},
    ],
    "nodes": [
        {"type": "start",   "info": "",                    "next": "1"},   # 0
        {"type": "pen",     "info": "down;#7c3aed;3",      "next": "2"},   # 1
        {"type": "assign",  "info": "lato = 4",             "next": "3"},   # 2
        {"type": "for",     "info": "i = 1; i <= 36; i += 1",
                            "next": {"true": "4", "false": "7"}},           # 3
        {"type": "forward", "info": "lato",                 "next": "5"},   # 4
        {"type": "turn",    "info": "right;89",             "next": "6"},   # 5
        {"type": "assign",  "info": "lato = lato + 7",      "next": "3"},   # 6 -> loop back
        {"type": "end",     "info": "",                     "next": None},  # 7
    ],
}

with open(os.path.join(OUT, "Spirale.json"), "w", encoding="utf-8") as f:
    json.dump(spiral, f, ensure_ascii=False, indent=1)

print("scritto Spirale.json:", len(spiral["nodes"]), "nodi")
