# Demo video di BaseFlow

Sorgenti per rigenerare `assets/demo/baseflow-demo.mp4`: uno **screencast scriptato**
dell'app reale, non un montaggio a mano. Playwright guida BaseFlow in un Chromium
headless mentre un overlay iniettato nella pagina disegna cursore, sottotitoli e
cartelli; ffmpeg taglia e riesporta in H.264.

## Cosa fa il video

1. Cartello di apertura.
2. Inserimento di un blocco **Output** dalla palette e sua configurazione.
3. Esecuzione con output nella console integrata.
4. Caricamento di `Spirale.json` — un ciclo `for` che pilota la tartaruga.
5. Esecuzione animata: nodo evidenziato, variabili aggiornate, spirale che si disegna.
6. Export del diagramma in Python / Java / C.
7. Cartello di chiusura.

## Come rigenerarlo

Servono Node con `playwright` (e il suo Chromium) e `ffmpeg`.

```bash
# 1. l'app statica va servita da qualche parte su :8899
npx http-server -p 8899 -c-1 /percorso/a/BaseFlow/app

# 2. genera il flowchart di esempio
python3 make_flow.py

# 3. registra (produce raw/*.webm + marks.json)
node record.mjs

# 4. monta ed esporta (MP4 + poster JPG)
bash edit.sh
```

`record.mjs` stampa i marcatori temporali dei segmenti. Se cambi la sceneggiatura,
riporta i nuovi valori in `edit.sh` (`A_IN`, `B_IN`, `C_IN`, …): è lì che si decide
quanto accelerare la parte lunga dell'esecuzione.

## Come incorporarlo nel sito

```html
<video
  src="/assets/demo/baseflow-demo.mp4"
  poster="/assets/demo/baseflow-demo-poster.jpg"
  width="1280" height="720"
  controls muted playsinline preload="metadata"
  style="width:100%;height:auto;border-radius:12px">
</video>
```

Il video è **senza audio**: per un loop decorativo in una hero section aggiungi
`autoplay loop` e togli `controls`.
