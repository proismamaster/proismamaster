#!/bin/bash
# Montaggio della demo BaseFlow: taglia la testa, accelera il segmento lungo
# dell'esecuzione, rimette tutto in fila, dissolvenze e encode finale.
set -euo pipefail

D="$(cd "$(dirname "$0")" && pwd)"
FF="${FF:-ffmpeg}"
SRC=$(ls "$D"/raw/*.webm | head -1)

# Confini presi da marks.json della registrazione
A_IN=2.30;  A_OUT=44.33; A_SPD=1.15    # intro + editing + caricamento
B_IN=44.33; B_OUT=80.09; B_SPD=2.80    # esecuzione animata (la parte lunga)
C_IN=80.09; C_OUT=103.60               # reveal disegno + export + cartello finale

TOTAL=$(python3 -c "print(round(($A_OUT-$A_IN)/$A_SPD + ($B_OUT-$B_IN)/$B_SPD + ($C_OUT-$C_IN), 2))")
FADE_OUT=$(python3 -c "print(round($TOTAL-0.9, 2))")
echo "durata finale attesa: ${TOTAL}s  (fade out a ${FADE_OUT}s)"

filter="
[0:v]trim=${A_IN}:${A_OUT},setpts=(PTS-STARTPTS)/${A_SPD}[a];
[0:v]trim=${B_IN}:${B_OUT},setpts=(PTS-STARTPTS)/${B_SPD}[b];
[0:v]trim=${C_IN}:${C_OUT},setpts=(PTS-STARTPTS)[c];
[a][b][c]concat=n=3:v=1:a=0,
 fps=30,
 scale=1280:720:flags=lanczos,
 fade=t=in:st=0:d=0.6,
 fade=t=out:st=${FADE_OUT}:d=0.9,
 format=yuv420p[v]"

# 1) MP4 H.264 -- sorgente principale per il sito
"$FF" -y -hide_banner -loglevel error -i "$SRC" \
  -filter_complex "$filter" -map "[v]" \
  -c:v libx264 -profile:v high -level 4.0 -crf 21 -preset slow \
  -movflags +faststart -an "$D/baseflow-demo.mp4"

# 2) Poster: fotogramma dello spirale completo, per l'attributo poster=""
"$FF" -y -hide_banner -loglevel error -i "$D/baseflow-demo.mp4" \
  -ss 62.0 -frames:v 1 -q:v 2 "$D/baseflow-demo-poster.jpg"

ls -la "$D"/baseflow-demo.mp4 "$D"/baseflow-demo-poster.jpg
"$FF" -hide_banner -i "$D/baseflow-demo.mp4" 2>&1 | grep -E "Duration|Stream"
