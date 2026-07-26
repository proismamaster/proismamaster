#!/usr/bin/env python3
"""Finto backend di NutriApp per la registrazione della demo.

Il backend vero (progetti.galileicrema.org) non e' raggiungibile dalla sandbox,
quindi questi endpoint riproducono i contratti JSON che il bundle Flutter si
aspetta -- ricavati leggendo main.dart.js. I DATI SONO INVENTATI: servono solo a
far vedere l'interfaccia reale con uno storico coerente sui grafici.

Contratti implementati:
  POST login.php              {email,password}      -> {status, is_new, user_data}
  GET  get_user_data.php      ?email=               -> {status, data}
  GET  get_daily_summary.php  ?user_mail=&date=     -> {status, totals:{tot_*}}
  GET  get_entry.php          ?user_mail=           -> [ {entry}, ... ]
  GET  get_recipes.php / get_custom_foods.php       -> {status, ...}
"""
import json
import random
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

PORT = 8910
GIORNI_STORICO = 28

PROFILO = {
    "id": 1,
    "email": "demo@nutriapp.local",
    "first_name": "Ismail",
    "last_name": "Barakat",
    "weight": 72.0,
    "height": 178.0,
    "gender": "M",
    "language": "it",
    "profile_image": "",
    "created_at": "2026-01-12 09:20:00",
    # obiettivi giornalieri (nomi presi da update_goals.php)
    "current_weight": 72.0, "target_weight": 68.0,
    "calorie_goal": 2400.0, "protein_goal": 150.0, "carb_goal": 270.0,
    "fat_goal": 80.0, "water_goal": 2500.0, "fiber_goal": 30.0, "sugar_max": 60.0,
    "saturated_fats_goal": 22.0, "monounsaturated_fats_goal": 35.0,
    "polyunsaturated_fats_goal": 17.0, "trans_fats_max": 2.0,
    "cholesterol_max": 300.0, "sodium_max": 2300.0,
    "calcium_goal": 1000.0, "iron_goal": 14.0, "magnesium_goal": 375.0,
    "potassium_goal": 3500.0, "zinc_goal": 10.0, "phosphorus_goal": 700.0,
    "vit_a_goal": 800.0, "vit_c_goal": 80.0, "vit_d_goal": 15.0,
    "vit_e_goal": 12.0, "vit_k_goal": 75.0, "vit_b1_goal": 1.1,
    "vit_b2_goal": 1.4, "vit_b3_goal": 16.0, "vit_b5_goal": 6.0,
    "vit_b6_goal": 1.4, "vit_b9_goal": 200.0, "vit_b12_goal": 2.5,
}

# Alimenti per 100 g: kcal, carboidrati, proteine, grassi, fibre, zuccheri, acqua
ALIMENTI = {
    "Colazione": [
        ("Yogurt greco 0%",            59,  3.6, 10.0, 0.4, 0.0,  3.6, 85),
        ("Fiocchi d'avena",           389, 66.3, 16.9, 6.9, 10.6, 0.0,  8),
        ("Banana",                     89, 22.8,  1.1, 0.3, 2.6, 12.2, 75),
        ("Latte parz. scremato",       46,  4.9,  3.3, 1.6, 0.0,  4.9, 89),
        ("Fette biscottate integrali",374, 70.0, 11.0, 6.0, 7.0,  4.0,  6),
        ("Miele",                     304, 82.4,  0.3, 0.0, 0.2, 82.1, 17),
    ],
    "Pranzo": [
        ("Pasta di semola",           353, 71.2, 12.5, 1.5, 3.0,  3.2, 11),
        ("Petto di pollo",            165,  0.0, 31.0, 3.6, 0.0,  0.0, 65),
        ("Riso basmati",              349, 77.0,  7.5, 0.9, 1.3,  0.1, 12),
        ("Tonno al naturale",         103,  0.0, 23.6, 0.8, 0.0,  0.0, 74),
        ("Pomodori",                   18,  3.9,  0.9, 0.2, 1.2,  2.6, 94),
        ("Olio extravergine d'oliva", 884,  0.0,  0.0,100.0,0.0,  0.0,  0),
        ("Insalata mista",             15,  2.9,  1.4, 0.2, 1.3,  0.8, 95),
    ],
    "Cena": [
        ("Salmone al forno",          208,  0.0, 20.4,13.4, 0.0,  0.0, 64),
        ("Merluzzo",                   82,  0.0, 18.0, 0.7, 0.0,  0.0, 81),
        ("Uova",                      143,  0.7, 12.6, 9.5, 0.0,  0.4, 76),
        ("Patate lesse",               87, 20.1,  1.9, 0.1, 1.8,  0.9, 77),
        ("Zucchine",                   17,  3.1,  1.2, 0.3, 1.0,  2.5, 95),
        ("Broccoli",                   34,  6.6,  2.8, 0.4, 2.6,  1.7, 89),
        ("Pane integrale",            247, 41.0,  9.0, 3.4, 7.0,  4.3, 38),
    ],
    "Snack": [
        ("Mandorle",                  579, 21.6, 21.2,49.9,12.5,  4.4,  4),
        ("Mela",                       52, 13.8,  0.3, 0.2, 2.4, 10.4, 86),
        ("Barretta proteica",         350, 30.0, 33.0,10.0, 6.0,  4.0,  8),
        ("Noci",                      654, 13.7, 15.2,65.2, 6.7,  2.6,  4),
    ],
}

# Catalogo aggiuntivo, cercabile per nome: serve a far vedere una ricerca con
# piu' risultati invece di un solo match.
CATALOGO = [
    # nome,                        kcal, carb, prot, fat, fib, zuc, acqua, marca
    ("Pasta di semola",             353, 71.2, 12.5,  1.5,  3.0,  3.2, 11, ""),
    ("Pasta integrale",             348, 66.0, 13.4,  2.5,  8.0,  3.0, 10, ""),
    ("Pasta all'uovo",              368, 70.0, 13.0,  3.5,  2.9,  2.0,  9, ""),
    ("Penne Rigate",                359, 71.5, 12.0,  1.6,  3.1,  3.0, 11, "Barilla"),
    ("Pane integrale",              247, 41.0,  9.0,  3.4,  7.0,  4.3, 38, ""),
    ("Petto di pollo",              165,  0.0, 31.0,  3.6,  0.0,  0.0, 65, ""),
    ("Pomodori pelati",              32,  6.0,  1.3,  0.3,  1.4,  4.5, 91, ""),
    ("Riso basmati",                349, 77.0,  7.5,  0.9,  1.3,  0.1, 12, ""),
    ("Salmone al forno",            208,  0.0, 20.4, 13.4,  0.0,  0.0, 64, ""),
    ("Yogurt greco 0%",              59,  3.6, 10.0,  0.4,  0.0,  3.6, 85, ""),
    ("Mandorle",                    579, 21.6, 21.2, 49.9, 12.5,  4.4,  4, ""),
    ("Uova",                        143,  0.7, 12.6,  9.5,  0.0,  0.4, 76, ""),
    ("Olio extravergine d'oliva",   884,  0.0,  0.0,100.0,  0.0,  0.0,  0, ""),
    ("Parmigiano Reggiano",         392,  0.0, 33.0, 28.4,  0.0,  0.0, 30, ""),
    ("Zucchine",                     17,  3.1,  1.2,  0.3,  1.0,  2.5, 95, ""),
]

# Prodotto restituito dalla scansione del codice a barre.
BARCODE_DEMO = "8076809513692"

RICETTE = [
    {
        "id": 1, "recipe_name": "Pasta al pesto di zucchine", "portion": "2", "is_favorite": 1,
        "notes": "Zucchine saltate, frullate con parmigiano e olio. Pronta in 15 minuti.",
        "ingredients": [
            {"food_name": "Pasta di semola", "unit": "g", "weight_g": 160,
             "calories": 564.8, "carbs": 113.9, "proteins": 20.0, "fats": 2.4},
            {"food_name": "Zucchine", "unit": "g", "weight_g": 200,
             "calories": 34.0, "carbs": 6.2, "proteins": 2.4, "fats": 0.6},
            {"food_name": "Parmigiano Reggiano", "unit": "g", "weight_g": 30,
             "calories": 117.6, "carbs": 0.0, "proteins": 9.9, "fats": 8.5},
            {"food_name": "Olio extravergine d'oliva", "unit": "g", "weight_g": 15,
             "calories": 132.6, "carbs": 0.0, "proteins": 0.0, "fats": 15.0},
        ],
    },
    {
        "id": 2, "recipe_name": "Pollo e riso basmati", "portion": "1", "is_favorite": 0,
        "notes": "Il pranzo da meal prep: si prepara la domenica e regge tre giorni.",
        "ingredients": [
            {"food_name": "Petto di pollo", "unit": "g", "weight_g": 180,
             "calories": 297.0, "carbs": 0.0, "proteins": 55.8, "fats": 6.5},
            {"food_name": "Riso basmati", "unit": "g", "weight_g": 80,
             "calories": 279.2, "carbs": 61.6, "proteins": 6.0, "fats": 0.7},
            {"food_name": "Olio extravergine d'oliva", "unit": "g", "weight_g": 10,
             "calories": 88.4, "carbs": 0.0, "proteins": 0.0, "fats": 10.0},
        ],
    },
    {
        "id": 3, "recipe_name": "Colazione proteica", "portion": "1", "is_favorite": 1,
        "notes": "Yogurt greco, mandorle e miele.",
        "ingredients": [
            {"food_name": "Yogurt greco 0%", "unit": "g", "weight_g": 200,
             "calories": 118.0, "carbs": 7.2, "proteins": 20.0, "fats": 0.8},
            {"food_name": "Mandorle", "unit": "g", "weight_g": 20,
             "calories": 115.8, "carbs": 4.3, "proteins": 4.2, "fats": 10.0},
        ],
    },
]

MICRO = ["arsenic", "boron", "calcium", "chloride", "choline", "chromium", "cobalt",
         "copper", "fluoride", "fluorine", "iodine", "iron", "magnesium", "manganese",
         "molybdenum", "phosphorus", "potassium", "selenium", "silicon", "sodium",
         "sulfur", "tin", "vanadium", "zinc"]
VITAMINE = ["vit_a", "vit_b1", "vit_b2", "vit_b3", "vit_b5", "vit_b6", "vit_b7",
            "vit_b9", "vit_b11", "vit_b12", "vit_c", "vit_d", "vit_e", "vit_k"]


def costruisci_storico():
    """Genera le voci dei giorni passati. Seed fisso: lo storico non cambia fra run."""
    voci = []
    idv = 1
    oggi = date.today()
    for indietro in range(GIORNI_STORICO, -1, -1):
        giorno = oggi - timedelta(days=indietro)
        rnd = random.Random(giorno.toordinal())
        # nel weekend si mangia un po' di piu': i grafici hanno un ritmo credibile
        fattore = 1.10 if giorno.weekday() >= 5 else 1.0
        # il giorno corrente e' a meta': la dashboard deve mostrare "rimanenti"
        pasti = ["Colazione", "Pranzo", "Cena", "Snack"]
        if indietro == 0:
            pasti = ["Colazione", "Pranzo", "Snack"]
        for pasto in pasti:
            scelti = rnd.sample(ALIMENTI[pasto], k=min(3, len(ALIMENTI[pasto])))
            for nome, kcal, carb, prot, fat, fib, zuc, acq in scelti:
                if kcal > 600:                      # olio, frutta secca: porzioni piccole
                    grammi = rnd.choice([10, 15, 20, 25])
                elif kcal > 300:
                    grammi = rnd.choice([40, 60, 80, 100])
                else:
                    grammi = rnd.choice([100, 120, 150, 180, 200])
                grammi = round(grammi * fattore)
                q = grammi / 100.0
                voce = {
                    "id": idv,
                    "user_mail": PROFILO["email"],
                    "food_name": nome,
                    "meal_type": pasto,
                    "entry_date": giorno.isoformat(),
                    "weight_g": grammi,
                    "calories": round(kcal * q, 1),
                    "carbs": round(carb * q, 1),
                    "proteins": round(prot * q, 1),
                    "fats": round(fat * q, 1),
                    "fibers": round(fib * q, 1),
                    "sugars": round(zuc * q, 1),
                    "water": round(acq * q, 1),
                    "saturated_fats": round(fat * q * 0.28, 1),
                    "monounsaturated_fats": round(fat * q * 0.45, 1),
                    "polyunsaturated_fats": round(fat * q * 0.22, 1),
                    "trans_fats": 0.0,
                    "cholesterol": round(prot * q * 1.4, 1),
                }
                for k in MICRO:
                    voce[k] = round(q * rnd.uniform(1, 40), 2)
                for k in VITAMINE:
                    voce[k] = round(q * rnd.uniform(0.2, 30), 2)
                voce["sodium"] = round(q * rnd.uniform(30, 260), 1)
                voce["calcium"] = round(q * rnd.uniform(8, 120), 1)
                voce["potassium"] = round(q * rnd.uniform(60, 380), 1)
                voci.append(voce)
                idv += 1
    return voci


VOCI = costruisci_storico()


def totali(giorno_iso, meal_type=None):
    sel = [v for v in VOCI if v["entry_date"] == giorno_iso
           and (not meal_type or v["meal_type"] == meal_type)]
    somma = lambda k: round(sum(v.get(k, 0) for v in sel), 1)
    t = {
        "num_pasti": len({v["meal_type"] for v in sel}),
        "tot_cal": somma("calories"),
        "tot_carbs": somma("carbs"),
        "tot_proteins": somma("proteins"),
        "tot_fats": somma("fats"),
        "tot_water": somma("water"),
        "tot_fibers": somma("fibers"),
        "tot_sugars": somma("sugars"),
        "tot_saturated": somma("saturated_fats"),
        "tot_monounsaturated": somma("monounsaturated_fats"),
        "tot_polyunsaturated": somma("polyunsaturated_fats"),
        "tot_trans": somma("trans_fats"),
        "tot_cholesterol": somma("cholesterol"),
        "tot_biotin": somma("vit_b7"),
    }
    for k in MICRO:
        t["tot_" + k] = somma(k)
    for k in VITAMINE:
        t["tot_" + k] = somma(k)
    return t


_seq = [0]


def prodotto(nome, kcal, carb, prot, fat, fib, zuc, acq, brand="", barcode="", source="CREA"):
    """Un alimento nella forma che si aspetta la schermata di ricerca/scansione."""
    _seq[0] += 1
    return {
        "id": _seq[0], "name": nome, "name_en": nome, "food_name": nome,
        "brand": brand, "barcode": barcode, "source": source,
        "base_weight_g": 100, "serving_quantity": 100,
        "calories": kcal, "carbs": carb, "proteins": prot, "fats": fat,
        "fibers": fib, "sugars": zuc, "water": acq,
        "saturated_fats": round(fat * 0.28, 1),
        "monounsaturated_fats": round(fat * 0.45, 1),
        "polyunsaturated_fats": round(fat * 0.22, 1),
        "trans_fats": 0.0, "cholesterol": 0.0,
        **{k: 0.0 for k in MICRO}, **{k: 0.0 for k in VITAMINE},
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _json(self, payload):
        body = json.dumps(payload).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._json({"status": "success"})

    def do_GET(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        name = u.path.rsplit("/", 1)[-1]
        mail = (q.get("user_mail") or q.get("email") or [PROFILO["email"]])[0]

        if name == "get_user_data.php":
            d = dict(PROFILO, email=mail)
            return self._json({"status": "success", "data": d})

        if name == "get_daily_summary.php":
            giorno = (q.get("date") or [date.today().isoformat()])[0]
            mt = (q.get("meal_type") or [None])[0]
            return self._json({"status": "success", "totals": totali(giorno, mt)})

        if name == "get_entry.php":
            return self._json([dict(v, user_mail=mail) for v in VOCI])

        if name == "get_recipes.php":
            return self._json(RICETTE)

        if name == "get_custom_foods.php":
            return self._json({"status": "success", "foods": []})

        if name == "get_product_by_barcode.php":
            code = (q.get("barcode") or [BARCODE_DEMO])[0]
            return self._json({"status": "success", "product": prodotto(
                "Penne Rigate", 359, 71.5, 12.0, 1.6, 3.1, 3.0, 11,
                brand="Barilla", barcode=code, source="OpenFoodFacts")})

        if name == "search_crea_foods.php":
            termine = (q.get("query") or [""])[0].lower()
            trovati = [prodotto(n, kc, cb, pr, ft, fb, zu, ac, brand=mk)
                       for n, kc, cb, pr, ft, fb, zu, ac, mk in CATALOGO
                       if termine in n.lower() or termine in mk.lower()]
            return self._json({"status": "success", "foods": trovati})

        return self._json({"status": "success"})

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(n).decode("utf-8", "replace") if n else ""
        name = urlparse(self.path).path.rsplit("/", 1)[-1]
        try:
            corpo = json.loads(raw)
        except Exception:
            corpo = {}

        if name == "save_entry.php":
            # L'app invia la voce come JSON. Va aggiunta davvero allo storico,
            # altrimenti la dashboard non si aggiorna dopo il salvataggio e la
            # demo perde il suo momento migliore.
            v = dict(corpo)
            v["id"] = max([x["id"] for x in VOCI], default=0) + 1
            data = str(v.get("entry_date") or date.today().isoformat())[:10]
            v["entry_date"] = data
            v["user_mail"] = v.get("user_mail") or PROFILO["email"]
            for k in ("calories", "carbs", "proteins", "fats", "fibers", "sugars", "water", "weight_g"):
                try:
                    v[k] = float(v.get(k) or 0)
                except (TypeError, ValueError):
                    v[k] = 0.0
            VOCI.append(v)
            return self._json({"status": "success", "id": v["id"]})

        if name == "login.php":
            mail = corpo.get("email") or PROFILO["email"]
            return self._json({
                "status": "success",
                "is_new": False,
                "user_data": dict(PROFILO, email=mail),
            })

        return self._json({"status": "success", "message": "ok"})


if __name__ == "__main__":
    print(f"finto backend NutriApp su :{PORT} — {len(VOCI)} voci su {GIORNI_STORICO+1} giorni")
    HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
