#!/bin/bash
# Montaggio finale della demo NutriApp, da DUE sorgenti che devono sembrare
# un video unico e lo stesso dispositivo:
#
#   rawtel/  registrazione fatta su un telefono vero (ricerca, apertura del
#            prodotto Barilla CON le foto, porzione, salvataggio), riprodotta
#            dentro la cornice della scena. La barra di stato e la barra gesti
#            di Android sono gia' state ritagliate a monte, cosi' lo schermo
#            combacia con quello della parte 2.
#   raw2/    ricette e grafici dal build web, con l'app lasciata in inglese.
#
# Le due parti non sono separate da uno stacco a nero: si passa con uno
# scorrimento laterale, come un cambio di pagina.
#
# Si lavora in DUE passate: xfade pretende un frame rate costante, che non si
# riesce a garantire dentro una sola catena di filtri partendo dai webm di
# Playwright (frame rate variabile). Quindi prima si rendono le due parti in
# file intermedi CFR, poi si uniscono.
set -uo pipefail

D="$(cd "$(dirname "$0")" && pwd)"
FF="${FF:-ffmpeg}"
TEL=$(ls "$D"/rawtel/*.webm | head -1)     # durata 50.52
WEB=$(ls "$D"/raw2/*.webm   | head -1)     # durata 70.16

#     inizio   fine     velocita'
A_IN=1.60;  A_OUT=5.40;   A_SPD=1.00   # [tel] cartello di apertura
B_IN=5.70;  B_OUT=20.20;  B_SPD=1.35   # [tel] ricerca e risultati con le foto
C_IN=20.20; C_OUT=34.20;  C_SPD=1.35   # [tel] scheda: foto, NOVA, allergeni, macro, micro
E_IN=34.20; E_OUT=42.00;  E_SPD=1.30   # [tel] pasto, porzione, salvataggio
F_IN=42.00; F_OUT=45.60;  F_SPD=1.00   # [tel] diario aggiornato a 787 kcal
G_IN=28.60; G_OUT=45.00;  G_SPD=1.40   # [web] ricette e dettaglio ricetta
H_IN=45.00; H_OUT=63.50;  H_SPD=2.00   # [web] grafici
I_IN=67.00; I_OUT=70.00;  I_SPD=0.85   # [web] cartello finale

XF=0.70                                 # durata dello scorrimento fra le due parti

read -r P1 P2 TOT XOFF A_FADE <<<"$(python3 -c "
p1=[($A_OUT-$A_IN)/$A_SPD, ($B_OUT-$B_IN)/$B_SPD, ($C_OUT-$C_IN)/$C_SPD,
    ($E_OUT-$E_IN)/$E_SPD, ($F_OUT-$F_IN)/$F_SPD]
p2=[($G_OUT-$G_IN)/$G_SPD, ($H_OUT-$H_IN)/$H_SPD, ($I_OUT-$I_IN)/$I_SPD]
a,b=sum(p1),sum(p2)
print(round(a,2), round(b,2), round(a+b-$XF,2), round(a-$XF,2), round(p1[0]-0.35,2))")"
FADE_OUT=$(python3 -c "print(round($TOT-0.9, 2))")
echo "parte1 ${P1}s + parte2 ${P2}s  ->  ${TOT}s  (scorrimento a ${XOFF}s, fade out a ${FADE_OUT}s)"

SC="scale=1920:1080:flags=lanczos,setsar=1,format=yuv420p"
INTER="-c:v libx264 -crf 16 -preset veryfast -r 30 -vsync cfr -pix_fmt yuv420p"

# --- passata 1: la parte girata sul telefono -------------------------------
"$FF" -y -hide_banner -loglevel error -i "$TEL" -filter_complex "
[0:v]trim=${A_IN}:${A_OUT},setpts=(PTS-STARTPTS)/${A_SPD},$SC,fade=t=out:st=${A_FADE}:d=0.35[a];
[0:v]trim=${B_IN}:${B_OUT},setpts=(PTS-STARTPTS)/${B_SPD},$SC,fade=t=in:st=0:d=0.35[b];
[0:v]trim=${C_IN}:${C_OUT},setpts=(PTS-STARTPTS)/${C_SPD},$SC[c];
[0:v]trim=${E_IN}:${E_OUT},setpts=(PTS-STARTPTS)/${E_SPD},$SC[e];
[0:v]trim=${F_IN}:${F_OUT},setpts=(PTS-STARTPTS)/${F_SPD},$SC[f];
[a][b][c][e][f]concat=n=5:v=1:a=0[v]" -map "[v]" $INTER -an "$D/parte1.mp4" || exit 1

# --- passata 2: ricette e grafici ------------------------------------------
"$FF" -y -hide_banner -loglevel error -i "$WEB" -filter_complex "
[0:v]trim=${G_IN}:${G_OUT},setpts=(PTS-STARTPTS)/${G_SPD},$SC[g];
[0:v]trim=${H_IN}:${H_OUT},setpts=(PTS-STARTPTS)/${H_SPD},$SC[h];
[0:v]trim=${I_IN}:${I_OUT},setpts=(PTS-STARTPTS)/${I_SPD},$SC[i];
[g][h][i]concat=n=3:v=1:a=0[v]" -map "[v]" $INTER -an "$D/parte2.mp4" || exit 1

# --- passata 3: scorrimento fra le due e resa finale -----------------------
"$FF" -y -hide_banner -loglevel error -i "$D/parte1.mp4" -i "$D/parte2.mp4" -filter_complex "
[0:v][1:v]xfade=transition=slideleft:duration=${XF}:offset=${XOFF},
 fade=t=in:st=0:d=0.6,
 fade=t=out:st=${FADE_OUT}:d=0.9,
 format=yuv420p[v]" -map "[v]" \
  -c:v libx264 -profile:v high -level 4.0 -crf 21 -preset slow \
  -movflags +faststart -an "$D/nutriapp-demo.mp4" || exit 1

rm -f "$D/parte1.mp4" "$D/parte2.mp4"

# Poster: la scheda del prodotto con la foto vera, la marca, il punteggio NOVA e
# gli allergeni. A 17s la scheda e' gia' scrollata sui macronutrienti e la foto
# non si vede piu': come anteprima diceva molto meno.
"$FF" -y -hide_banner -loglevel error -i "$D/nutriapp-demo.mp4" \
  -ss 12.8 -frames:v 1 -q:v 2 "$D/nutriapp-demo-poster.jpg" || exit 1

ls -la "$D"/nutriapp-demo.mp4 "$D"/nutriapp-demo-poster.jpg
"$FF" -hide_banner -i "$D/nutriapp-demo.mp4" 2>&1 | grep -E "Duration|Stream"
exit 0
