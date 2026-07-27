#!/bin/bash
# Monta una registrazione VERTICALE dentro la scena 1920x1080.
#
#   bash monta.sh flappy   /workspace/flappybird-2/demo.mp4
#   bash monta.sh car      /workspace/rasberry-car/demo.mp4
#
# L'ordine dei livelli e' quello che fa funzionare tutto: prima il filmato,
# sopra il PNG della scena, che e' opaco ovunque tranne la finestra. Il video si
# vede solo li' dentro e ne prende gli angoli arrotondati, senza dover
# mascherare niente in ffmpeg.
#
# Il PNG della scena cambia a ogni momento del racconto: il testo nella colonna
# di destra e' inciso dentro il PNG, quindi cambiare scena vuol dire cambiare
# livello. Ogni testo resta acceso esattamente quanto dura la sua scena — non a
# cavallo di due, che e' il difetto che si vuole evitare.
set -uo pipefail

NOME=${1:?serve il nome del progetto (flappy|car)}
SRC=${2:?serve il file della registrazione}

D=/tmp/claude-0/-home-user-proismamaster/665b245a-a4c7-5022-9652-b85d6823b19c/scratchpad/altri
FF=/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2

# Le bande nere delle registrazioni da telefono vanno tolte PRIMA di scalare,
# altrimenti si porta il nero dentro la finestra. Misurate con:
#   ffmpeg -ss 8 -i <file> -vf cropdetect -frames:v 60 -f null -
case "$NOME" in
  flappy) TAGLIO="crop=1080:1578:0:158"
          # inizio fine  della scena, nel tempo della registrazione
          # Intervalli stretti su quello che la didascalia descrive davvero: la
          # schermata delle difficolta' dura tre secondi, e allargare
          # l'intervallo vuol dire leggere "quattro livelli" mentre a schermo si
          # sta gia' giocando.
          # Le scene NON sono in ordine di registrazione, e va bene cosi': il
          # menu delle difficolta' all'inizio dura un secondo scarso, mentre al
          # 33esimo secondo torna e ci si puo' stare. Ogni scena e' presa dove
          # si vede meglio, e la didascalia sopra ci combacia.
          SCENE=("33.4 35.6" "1.6 8.0" "19.2 21.3" "27.5 33.0" "35.8 45.0" "52.8 55.2")
          VEL=(1.00 1.25 1.00 1.15 1.35 1.00) ;;
  car)    TAGLIO="crop=1080:1796:0:62"
          SCENE=("0.5 9.0" "16.0 22.0" "23.0 35.5")
          VEL=(1.25 1.00 1.15) ;;
  *) echo "progetto sconosciuto: $NOME"; exit 1 ;;
esac

read -r FX FY FW FH < <(python3 -c "
import json;g=json.load(open('$D/${NOME}_geom.json'));print(g['x'],g['y'],g['w'],g['h'])")

CARD_IN=4.20; CARD_OUT=5.00

# --- una passata per scena: il filmato dentro la finestra, la scena sopra -----
PARTI=()
for i in "${!SCENE[@]}"; do
  read -r IN OUT <<<"${SCENE[$i]}"
  SPD=${VEL[$i]}
  OUTF="$D/${NOME}_p$i.mp4"
  DUR=$(python3 -c "print(round(($OUT-$IN)/$SPD, 3))")
  # La scena e' OPACA e sta sotto; il filmato ci va sopra, arrotondato dalla
  # maschera con alphamerge (bianco dentro, nero fuori). Gli angoli tondi non si
  # ottengono bucando lo sfondo: clip-path in Chromium non lascia canale alpha
  # nello screenshot, il buco non si forma e il video resta nascosto. Provato.
  #
  # ⚠️ Alle immagini serve `-loop 1 -t <durata>`. Con `-loop 1` e basta sono
  # sorgenti INFINITE, e alphamerge — che non ha un `shortest` — resta ad
  # aspettare la maschera per sempre: ffmpeg non finisce piu'.
  "$FF" -y -hide_banner -loglevel error \
    -i "$SRC" \
    -loop 1 -t "$DUR" -i "$D/${NOME}_scena$((i+1)).png" \
    -loop 1 -t "$DUR" -i "$D/${NOME}_maschera.png" -filter_complex "
    [0:v]trim=${IN}:${OUT},setpts=(PTS-STARTPTS)/${SPD},${TAGLIO},
         scale=${FW}:${FH}:flags=lanczos,setsar=1,format=yuva420p[clip];
    [2:v]format=gray[mask];
    [clip][mask]alphamerge[tondo];
    [1:v]setsar=1[scena];
    [scena][tondo]overlay=${FX}:${FY},fps=30,format=yuv420p[v]" \
    -map "[v]" -an -t "$DUR" -c:v libx264 -crf 17 -preset veryfast "$OUTF" || exit 1
  PARTI+=("$OUTF")
  echo "  scena $((i+1)): ${IN}-${OUT} a ${SPD}x -> ${DUR}s"
done

# --- cartelli e resa finale --------------------------------------------------
LISTA="$D/${NOME}_lista.txt"
{ echo "file '$D/${NOME}_introv.mp4'"
  for f in "${PARTI[@]}"; do echo "file '$f'"; done
  echo "file '$D/${NOME}_outrov.mp4'"; } > "$LISTA"

for c in intro outro; do
  T=$CARD_IN; [ "$c" = outro ] && T=$CARD_OUT
  "$FF" -y -hide_banner -loglevel error -loop 1 -t $T -i "$D/${NOME}_${c}.png" \
    -vf "scale=1920:1080,setsar=1,fps=30,format=yuv420p" \
    -c:v libx264 -crf 17 -preset veryfast -an "$D/${NOME}_${c}v.mp4" || exit 1
done

"$FF" -y -hide_banner -loglevel error -f concat -safe 0 -i "$LISTA" \
  -c:v libx264 -crf 17 -preset veryfast -an "$D/${NOME}_grezzo.mp4" || exit 1

DUR=$("$FF" -hide_banner -i "$D/${NOME}_grezzo.mp4" 2>&1 | sed -n 's/.*Duration: \([0-9:.]*\).*/\1/p' \
      | awk -F: '{print $1*3600+$2*60+$3}')
FADE_OUT=$(python3 -c "print(round($DUR-0.9,2))")

"$FF" -y -hide_banner -loglevel error -i "$D/${NOME}_grezzo.mp4" \
  -vf "fade=t=in:st=0:d=0.6,fade=t=out:st=${FADE_OUT}:d=0.9,format=yuv420p" \
  -c:v libx264 -profile:v high -level 4.2 -crf 20 -preset slow \
  -movflags +faststart -an "$D/${NOME}-demo.mp4" || exit 1

rm -f "${PARTI[@]}" "$D/${NOME}_introv.mp4" "$D/${NOME}_outrov.mp4" "$D/${NOME}_grezzo.mp4" "$LISTA"

echo "durata finale: ${DUR}s"
ls -la "$D/${NOME}-demo.mp4"
