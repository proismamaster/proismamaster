# Demo ereditate: FlappyBird 2 e Raspberry Car

Due video che **non ho girato io**: sono le registrazioni di Ismail, prese dai
repo dei rispettivi progetti (`FlappyBird-2/demo.mp4`, `Rasberry-Car/demo.mp4`).
Qui vengono solo vestite nello stile degli screencast scriptati.

⚠️ Non stavano nel repo del portfolio. Il suo `.gitignore` esclude `*.mp4` e la
storia non ne ha mai contenuto nessuno — verificato su tutti i ref con
`git rev-list --all --objects | grep -i mp4`. Sul sito si vedono perché il
deploy parte dalla copia locale.

## Perché il filmato sta in una cornice invece che a tutto schermo

Sono **verticali** (1080x1920), il resto del portfolio è 1920x1080. Riempire il
16:9 vorrebbe dire buttare via metà fotogramma. Si usa l'impaginazione delle
code "da telefono" degli altri video: filmato a sinistra, testo di fianco.

La cornice cambia in base a cosa si sta guardando:

- **FlappyBird**: cornice da telefono — è una registrazione dello schermo.
- **Raspberry Car**: cornice neutra — lì si filma il mondo vero (la scheda, il
  cablaggio, la macchina che gira per casa), non uno schermo.

## Gli angoli tondi: si arrotonda il video, non lo sfondo

L'idea naturale — bucare la scena e far passare il video da sotto — **non
funziona**: `clip-path` in Chromium non lascia canale alpha nello screenshot, il
buco non si forma e il filmato resta nascosto sotto una scena opaca. Provato.

Si fa al contrario: la scena sta sotto, il video ci va **sopra**, arrotondato da
una maschera (bianco dentro, nero fuori) applicata con `alphamerge`.

⚠️ Alle immagini in ingresso serve `-loop 1 -t <durata>`. Con `-loop 1` e basta
sono sorgenti infinite, e `alphamerge` — che non ha un `shortest` — resta ad
aspettare la maschera per sempre: ffmpeg non finisce più.

## Le bande nere

Le registrazioni da telefono hanno bande nere sopra e sotto, e vanno tolte
**prima** di scalare, altrimenti si porta il nero dentro la cornice:

```bash
ffmpeg -ss 8 -i demo.mp4 -vf cropdetect -frames:v 60 -f null -
# flappybird -> crop=1080:1578:0:158     raspberry -> crop=1080:1796:0:62
```

## Le scene non seguono l'ordine della registrazione

E va bene così. In FlappyBird il menu delle difficoltà all'inizio dura un
secondo scarso, mentre al 33° secondo torna e ci si può stare: la scena è presa
lì. Ogni pezzo è scelto dove si vede meglio, e la didascalia sopra ci combacia —
che è il punto. Allargare un intervallo per comodità significa leggere "quattro
livelli di difficoltà" mentre a schermo si sta già giocando.

```bash
node veste.mjs                                    # cartelli, scene, maschere
bash monta.sh flappy /percorso/FlappyBird-2/demo.mp4
bash monta.sh car    /percorso/Rasberry-Car/demo.mp4
```
