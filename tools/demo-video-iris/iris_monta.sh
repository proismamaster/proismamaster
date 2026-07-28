#!/bin/bash
# Montaggio della demo di IRIS (BitCtrl).
#
# Sorgente: registrazione consegnata da Ismail, 1920x1140, 32.1s, con audio.
# Qui l'audio si butta (come tutti gli altri video del portfolio), si toglie il
# browser, si rimonta per scene e si veste come gli altri.
#
# ⚠️ DUE COSE COPERTE, e non sono estetica:
#
# 1. LA BARRA DEL BROWSER SI TAGLIA. Nei primi 142 pixel ci sono le schede e i
#    preferiti di Ismail: Claude, Gemini, WhatsApp Web, "Portfolio e Strategia
#    Freelance", un ticket "SIS5IB2526: Firewall". Roba sua, e roba della
#    scuola. Non si sfoca: si taglia via, e il fotogramma ne guadagna.
# 2. CONFIGURATION > NETWORK. Hostname dell'apparato e indirizzi della rete
#    interna: restano a schermo (sono il senso della pagina) ma SFOCATI. Si
#    legge "static", "wm0", "ntp.google.com" — non chi e' e dove sta.
#    Riquadri misurati sul fotogramma ORIGINALE a t=21 e poi riportati nello
#    spazio del ritaglio togliendo 142 dalla y.
#
# System info invece NON si tocca: e' un esempio finto, ce l'ha scritto sopra
# (johndoe, my-computer, uptime 123456). E' quello che il progetto deve
# mostrare, e nasconderlo sarebbe nascondere la funzione.
set -uo pipefail

D=/tmp/claude-0/-home-user-proismamaster/665b245a-a4c7-5022-9652-b85d6823b19c/scratchpad/iris
FF=/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2
SRC=/root/.claude/uploads/665b245a-a4c7-5022-9652-b85d6823b19c/881a4157-IRIS_FRONTEND_1_1.mp4

# 142 in alto = barra del browser. 22 a destra = barra di scorrimento.
TAGLIO="crop=1898:998:0:142"

#         inizio  fine   velocita'
SCENE=("2.60 8.20" "8.30 10.30" "10.50 16.60" "16.80 19.30" \
       "19.60 21.90" "22.15 25.10" "25.30 29.00" "29.20 32.05")
VEL=(1.15 0.80 1.00 0.90 0.95 0.95 1.05 0.95)

# La scena 5 (indice 4) e' l'unica che passa dallo sfocatore.
# ⚠️ Le etichette del filter_complex devono essere UNICHE: con nomi generici
# collidono con quelle del resto del grafo e ffmpeg ricabla in silenzio — niente
# errore, esce la scena sbagliata.
SFOCA="split=4[nz0][nz1][nz2][nz3];\
[nz1]crop=615:72:655:192,avgblur=22[nzA];\
[nz2]crop=615:64:690:512,avgblur=22[nzB];\
[nz3]crop=615:64:690:595,avgblur=22[nzC];\
[nz0][nzA]overlay=655:192[nzo1];[nzo1][nzB]overlay=690:512[nzo2];[nzo2][nzC]overlay=690:595"

read -r FX FY FW FH < <(python3 -c "
import json;g=json.load(open('$D/iris_geom.json'));print(g['x'],g['y'],g['w'],g['h'])")

CARD_IN=4.20; CARD_OUT=5.00

# --- una passata per scena: il filmato dentro la finestra, la scena sotto -----
PARTI=()
for i in "${!SCENE[@]}"; do
  read -r IN OUT <<<"${SCENE[$i]}"
  SPD=${VEL[$i]}
  OUTF="$D/iris_p$i.mp4"
  DUR=$(python3 -c "print(round(($OUT-$IN)/$SPD, 3))")

  CATENA="$TAGLIO"
  [ "$i" = 4 ] && CATENA="$TAGLIO,$SFOCA"

  # ⚠️ Alle immagini serve `-loop 1 -t <durata>`: con `-loop 1` e basta sono
  # sorgenti infinite e alphamerge — che non ha `shortest` — aspetta la maschera
  # per sempre.
  "$FF" -y -hide_banner -loglevel error \
    -i "$SRC" \
    -loop 1 -t "$DUR" -i "$D/iris_scena$((i+1)).png" \
    -loop 1 -t "$DUR" -i "$D/iris_maschera.png" -filter_complex "
    [0:v]trim=${IN}:${OUT},setpts=(PTS-STARTPTS)/${SPD},${CATENA},
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
for c in intro outro; do
  T=$CARD_IN; [ "$c" = outro ] && T=$CARD_OUT
  "$FF" -y -hide_banner -loglevel error -loop 1 -t $T -i "$D/iris_${c}.png" \
    -vf "scale=1920:1080,setsar=1,fps=30,format=yuv420p" \
    -c:v libx264 -crf 17 -preset veryfast -an "$D/iris_${c}v.mp4" || exit 1
done

LISTA="$D/iris_lista.txt"
{ echo "file '$D/iris_introv.mp4'"
  for f in "${PARTI[@]}"; do echo "file '$f'"; done
  echo "file '$D/iris_outrov.mp4'"; } > "$LISTA"

"$FF" -y -hide_banner -loglevel error -f concat -safe 0 -i "$LISTA" \
  -c:v libx264 -crf 17 -preset veryfast -an "$D/iris_grezzo.mp4" || exit 1

DUR=$("$FF" -hide_banner -i "$D/iris_grezzo.mp4" 2>&1 | sed -n 's/.*Duration: \([0-9:.]*\).*/\1/p' \
      | awk -F: '{print $1*3600+$2*60+$3}')
FADE_OUT=$(python3 -c "print(round($DUR-0.9,2))")

"$FF" -y -hide_banner -loglevel error -i "$D/iris_grezzo.mp4" \
  -vf "fade=t=in:st=0:d=0.6,fade=t=out:st=${FADE_OUT}:d=0.9,format=yuv420p" \
  -c:v libx264 -profile:v high -level 4.2 -crf 20 -preset slow \
  -movflags +faststart -an "$D/iris-demo.mp4" || exit 1

rm -f "${PARTI[@]}" "$D/iris_introv.mp4" "$D/iris_outrov.mp4" "$D/iris_grezzo.mp4" "$LISTA"

"$FF" -y -hide_banner -loglevel error -i "$D/iris-demo.mp4" \
  -ss 7 -frames:v 1 -q:v 2 "$D/iris-demo-poster.jpg" || exit 1

echo "durata finale: ${DUR}s"
ls -la "$D/iris-demo.mp4" "$D/iris-demo-poster.jpg"
"$FF" -hide_banner -i "$D/iris-demo.mp4" 2>&1 | grep -E "Duration|Stream"
