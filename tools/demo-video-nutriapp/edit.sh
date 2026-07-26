#!/bin/bash
# Montaggio della demo NutriApp.
#
# I confini NON sono i marcatori di marks.json: Playwright scrive il webm con una
# base tempi piu' lunga del tempo reale (qui ~+4%). Sono stati verificati estraendo
# fotogrammi dal .webm:  ffmpeg -ss <t> -i raw/*.webm -frames:v 1 check.png
set -uo pipefail

D="$(cd "$(dirname "$0")" && pwd)"
FF="${FF:-ffmpeg}"
SRC=$(ls "$D"/raw/*.webm | head -1)          # durata 145.28, 1920x1080

#      inizio    fine      velocita'
A_IN=4.80;   A_OUT=9.00;    A_SPD=1.00   # cartello di apertura (l'accesso avviene dietro)
B_IN=34.00;  B_OUT=40.00;   B_SPD=1.00   # il diario di partenza
C_IN=40.00;  C_OUT=60.00;   C_SPD=1.50   # Aggiungi + ricerca sul database reale
D_IN=60.00;  D_OUT=83.00;   D_SPD=1.60   # scheda prodotto, pasto, porzione
E_IN=83.00;  E_OUT=92.00;   E_SPD=1.40   # macro in chiaro
F_IN=92.00;  F_OUT=112.00;  F_SPD=1.50   # AGGIUNGI e diario aggiornato
G_IN=112.00; G_OUT=133.00;  G_SPD=1.60   # ricette e dettaglio ricetta
H_IN=133.00; H_OUT=142.00;  H_SPD=1.80   # sguardo ai grafici
I_IN=142.80; I_OUT=145.20;  I_SPD=0.50   # cartello finale (fermo)

read -r TOTAL A_DUR <<<"$(python3 -c "
s=[($A_OUT-$A_IN)/$A_SPD, ($B_OUT-$B_IN)/$B_SPD, ($C_OUT-$C_IN)/$C_SPD,
   ($D_OUT-$D_IN)/$D_SPD, ($E_OUT-$E_IN)/$E_SPD, ($F_OUT-$F_IN)/$F_SPD,
   ($G_OUT-$G_IN)/$G_SPD, ($H_OUT-$H_IN)/$H_SPD, ($I_OUT-$I_IN)/$I_SPD]
print(round(sum(s),2), round(s[0],2))")"
A_FADE=$(python3 -c "print(round($A_DUR-0.35, 2))")
FADE_OUT=$(python3 -c "print(round($TOTAL-0.9, 2))")
echo "durata finale attesa: ${TOTAL}s  (fade out a ${FADE_OUT}s)"

SC="scale=1920:1080:flags=lanczos,setsar=1"

filter="
[0:v]trim=${A_IN}:${A_OUT},setpts=(PTS-STARTPTS)/${A_SPD},$SC,fade=t=out:st=${A_FADE}:d=0.35[a];
[0:v]trim=${B_IN}:${B_OUT},setpts=(PTS-STARTPTS)/${B_SPD},$SC,fade=t=in:st=0:d=0.35[b];
[0:v]trim=${C_IN}:${C_OUT},setpts=(PTS-STARTPTS)/${C_SPD},$SC[c];
[0:v]trim=${D_IN}:${D_OUT},setpts=(PTS-STARTPTS)/${D_SPD},$SC[d];
[0:v]trim=${E_IN}:${E_OUT},setpts=(PTS-STARTPTS)/${E_SPD},$SC[e];
[0:v]trim=${F_IN}:${F_OUT},setpts=(PTS-STARTPTS)/${F_SPD},$SC[f];
[0:v]trim=${G_IN}:${G_OUT},setpts=(PTS-STARTPTS)/${G_SPD},$SC[g];
[0:v]trim=${H_IN}:${H_OUT},setpts=(PTS-STARTPTS)/${H_SPD},$SC[h];
[0:v]trim=${I_IN}:${I_OUT},setpts=(PTS-STARTPTS)/${I_SPD},$SC[i];
[a][b][c][d][e][f][g][h][i]concat=n=9:v=1:a=0,
 fps=30,
 fade=t=in:st=0:d=0.6,
 fade=t=out:st=${FADE_OUT}:d=0.9,
 format=yuv420p[v]"

"$FF" -y -hide_banner -loglevel error -i "$SRC" \
  -filter_complex "$filter" -map "[v]" \
  -c:v libx264 -profile:v high -level 4.0 -crf 21 -preset slow \
  -movflags +faststart -an "$D/nutriapp-demo.mp4" || exit 1

"$FF" -y -hide_banner -loglevel error -i "$D/nutriapp-demo.mp4" \
  -ss 46 -frames:v 1 -q:v 2 "$D/nutriapp-demo-poster.jpg" || exit 1

ls -la "$D"/nutriapp-demo.mp4 "$D"/nutriapp-demo-poster.jpg
"$FF" -hide_banner -i "$D/nutriapp-demo.mp4" 2>&1 | grep -E "Duration|Stream"
exit 0
