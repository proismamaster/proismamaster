# Demo video di NutriApp

Sorgenti per rigenerare `assets/demo/nutriapp-demo.mp4`: uno **screencast scriptato
da telefono** dell'app vera. NutriApp è scritta in Flutter, e quello che viene
registrato è il suo **build Flutter Web** (lo stesso che il portfolio serve su
`/nutriapp/`), caricato in un `<iframe>` largo 390px dentro una cornice di device.

## ⚠️ I dati sono finti, e si vede

Il backend vero (`progetti.galileicrema.org`) non è raggiungibile dall'ambiente di
registrazione, quindi `mock_api.py` riproduce in locale i contratti JSON che il
bundle Flutter si aspetta e serve **28 giorni di storico inventato** — servono a
dare ai grafici un andamento coerente. Il video porta un badge **"Dati
dimostrativi"** a schermo per tutta la durata: non toglierlo.

I contratti sono stati ricavati leggendo `main.dart.js`. I principali:

| Endpoint | Forma |
| --- | --- |
| `POST login.php` | `{status, is_new, user_data:{…}}` |
| `GET get_user_data.php?email=` | `{status, data:{…}}` |
| `GET get_daily_summary.php?user_mail=&date=` | `{status, totals:{tot_cal, tot_carbs, …}}` |
| `GET get_entry.php?user_mail=` | array di voci `{food_name, meal_type, entry_date, weight_g, calories, …}` |

I `meal_type` sono in italiano e con l'iniziale maiuscola: `Colazione`, `Pranzo`,
`Cena`, `Snack`.

## Tre cose che l'ambiente di registrazione deve aggirare

Tutte e tre stanno in `lib_boot.mjs`:

1. **CanvasKit** viene scaricato da `gstatic.com` → servito dalla copia locale che
   il build Flutter contiene già in `canvaskit/`.
2. **Il font Roboto** viene da `fonts.gstatic.com` → sostituito con un font di
   sistema. Senza, l'app rende una schermata bianca: il motore disegna, ma il testo
   non ha glifi.
3. **Il backend** → dirottato su `mock_api.py`.

Serve anche `locale: 'it-IT'` sul contesto: con un locale che Dart non riconosce
l'app muore all'avvio con `Incorrect locale information provided`.

## Scroll: Flutter ignora il mouse

Un trascinamento col mouse **non** scrolla una lista Flutter, e la rotellina non
passa in un contesto mobile. Lo swipe va mandato come evento touch vero via CDP
(`Input.dispatchTouchEvent`) — vedi la funzione `swipe()` in `record.mjs`.

## Come rigenerarlo

```bash
# 1. il build Flutter web di NutriApp servito su :8903 (la cartella che lo contiene,
#    non la cartella stessa: l'index.html ha <base href="/nutriapp/">)
python3 -m http.server 8903 --bind 127.0.0.1   # da .../portfolio/public
python3 -m http.server 8904 --bind 127.0.0.1   # da questa cartella (la scena)

# 2. finto backend
python3 mock_api.py

# 3. registra e monta
NUTRIAPP_BUILD=/percorso/a/portfolio/public/nutriapp node record.mjs
bash edit.sh
```

### Attenzione ai tempi di taglio

I confini in `edit.sh` **non** sono i valori di `marks.json`: Playwright scrive il
webm con una base tempi più lunga del tempo reale (qui circa +4%). Verifica sempre
sul file prima di fidarti:

```bash
ffmpeg -ss 111.3 -i raw/*.webm -frames:v 1 check.png
```
