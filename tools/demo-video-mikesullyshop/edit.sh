#!/bin/bash
# Montaggio della demo di MikeSullyShop: unisce la registrazione desktop e la
# coda dentro la cornice del telefono, accelera i tratti lunghi, mette le
# dissolvenze ed esporta in H.264 a 1920x1080.
#
# ATTENZIONE ai confini qui sotto: NON sono i valori di marks.json. Playwright
# scrive il webm con una base tempi diversa dal tempo reale (qui il file e'
# risultato piu' CORTO del copione, circa -2%, ma la deriva cambia da una
# registrazione all'altra e puo' andare in entrambe le direzioni). I valori
# sono stati verificati estraendo fotogrammi:
#   ffmpeg -ss <t> -i raw/*.webm -frames:v 1 check.png
# Se rigeneri le registrazioni, rifai questa verifica prima di fidarti.
set -uo pipefail

D=/tmp/claude-0/-home-user-proismamaster/665b245a-a4c7-5022-9652-b85d6823b19c/scratchpad/shop
FF=/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2
SRC=$(ls "$D"/raw/*.webm | head -1)        # desktop   1920x1080 (durata 108.96)
MOB=$(ls "$D"/rawmob/*.webm | head -1)     # telefono  1920x1080 (durata  21.84)

# inizio     fine       velocita'
A_IN=6.40;   A_OUT=25.63;  A_SPD=1.35   # cartello di apertura + catalogo + ricerca
B_IN=25.63;  B_OUT=46.33;  B_SPD=1.30   # scheda prodotto + carrello col timer
C_IN=46.33;  C_OUT=74.22;  C_SPD=1.55   # checkout, OTP, ordine confermato
E_IN=74.22;  E_OUT=104.91; E_SPD=1.75   # pannello di gestione: magazzino, ordini, vendite
M_IN=3.60;   M_OUT=21.50;  M_SPD=1.15   # la stessa vetrina dentro il telefono
Q_IN=106.20; Q_OUT=108.90; Q_SPD=0.45   # cartello di chiusura (fermo: rallentarlo non si vede)

read -r TOTAL E_DUR <<<"$(python3 -c "
segs=[($A_OUT-$A_IN)/$A_SPD, ($B_OUT-$B_IN)/$B_SPD, ($C_OUT-$C_IN)/$C_SPD,
      ($E_OUT-$E_IN)/$E_SPD, ($M_OUT-$M_IN)/$M_SPD, ($Q_OUT-$Q_IN)/$Q_SPD]
print(round(sum(segs),2), round(segs[3],2))")"
E_FADE=$(python3 -c "print(round($E_DUR-0.35, 2))")   # stacco a nero desktop -> telefono
FADE_OUT=$(python3 -c "print(round($TOTAL-0.9, 2))")
echo "durata finale attesa: ${TOTAL}s  (fade out a ${FADE_OUT}s)"

# Le due sorgenti sono gia' 1920x1080 native: lo scale qui non riduce nulla,
# serve solo a garantire misura e SAR identici prima del concat.
SC="scale=1920:1080:flags=lanczos,setsar=1"

filter="
[0:v]trim=${A_IN}:${A_OUT},setpts=(PTS-STARTPTS)/${A_SPD},$SC[a];
[0:v]trim=${B_IN}:${B_OUT},setpts=(PTS-STARTPTS)/${B_SPD},$SC[b];
[0:v]trim=${C_IN}:${C_OUT},setpts=(PTS-STARTPTS)/${C_SPD},$SC[c];
[0:v]trim=${E_IN}:${E_OUT},setpts=(PTS-STARTPTS)/${E_SPD},$SC,fade=t=out:st=${E_FADE}:d=0.35[e];
[1:v]trim=${M_IN}:${M_OUT},setpts=(PTS-STARTPTS)/${M_SPD},$SC,fade=t=in:st=0:d=0.35[m];
[0:v]trim=${Q_IN}:${Q_OUT},setpts=(PTS-STARTPTS)/${Q_SPD},$SC[q];
[a][b][c][e][m][q]concat=n=6:v=1:a=0,
 fps=30,
 fade=t=in:st=0:d=0.6,
 fade=t=out:st=${FADE_OUT}:d=0.9,
 format=yuv420p[v]"

# 1) MP4 H.264 -- sorgente principale per il sito
"$FF" -y -hide_banner -loglevel error -i "$SRC" -i "$MOB" \
  -filter_complex "$filter" -map "[v]" \
  -c:v libx264 -profile:v high -level 4.2 -crf 20 -preset slow \
  -movflags +faststart -an "$D/mikesullyshop-demo.mp4" || exit 1

# 2) Poster: la scheda prodotto con il peluche di fronte, prezzo e giacenza.
#    A 17s il carosello sta mostrando la vista posteriore: come anteprima rende meno.
"$FF" -y -hide_banner -loglevel error -i "$D/mikesullyshop-demo.mp4" \
  -ss 19.5 -frames:v 1 -q:v 2 "$D/mikesullyshop-demo-poster.jpg" || exit 1

ls -la "$D"/mikesullyshop-demo.mp4 "$D"/mikesullyshop-demo-poster.jpg
"$FF" -hide_banner -i "$D/mikesullyshop-demo.mp4" 2>&1 | grep -E "Duration|Stream"
exit 0
