#!/bin/bash
# Montaggio finale della demo NutriApp, da DUE sorgenti:
#
#   rawtel/  la registrazione fatta da Ismail sul telefono vero (ricerca,
#            ritrovamento e apertura del prodotto Barilla CON le foto), messa
#            dentro la cornice della scena e commentata dalle didascalie;
#   raw2/    ricette e grafici, registrati dal build web contro il backend e il
#            database veri. L'app e' lasciata in inglese per combaciare con la
#            registrazione del telefono.
#
# I confini sono misurati sui .webm, non presi dai marks*.json (Playwright
# scrive una base tempi piu' lunga del tempo reale).
set -uo pipefail

D="$(cd "$(dirname "$0")" && pwd)"
FF="${FF:-ffmpeg}"
TEL=$(ls "$D"/rawtel/*.webm | head -1)     # durata 51.36
WEB=$(ls "$D"/raw2/*.webm   | head -1)     # durata 71.32

#     inizio   fine     velocita'      sorgente
A_IN=1.50;  A_OUT=5.20;   A_SPD=1.00   # [tel] cartello di apertura
B_IN=5.50;  B_OUT=20.00;  B_SPD=1.35   # [tel] ricerca "barilla spaghetti" e risultati con foto
C_IN=20.00; C_OUT=34.00;  C_SPD=1.35   # [tel] scheda prodotto: foto, NOVA, allergeni, macro, micro
E_IN=34.00; E_OUT=41.50;  E_SPD=1.30   # [tel] pasto, porzione, salvataggio
F_IN=41.50; F_OUT=45.40;  F_SPD=1.00   # [tel] diario aggiornato a 787 kcal
G_IN=26.00; G_OUT=46.00;  G_SPD=1.50   # [web] ricette e dettaglio ricetta
H_IN=46.00; H_OUT=63.00;  H_SPD=2.00   # [web] grafici
I_IN=64.50; I_OUT=71.20;  I_SPD=1.20   # [web] cartello finale

read -r TOTAL A_DUR F_DUR <<<"$(python3 -c "
s=[($A_OUT-$A_IN)/$A_SPD, ($B_OUT-$B_IN)/$B_SPD, ($C_OUT-$C_IN)/$C_SPD, ($E_OUT-$E_IN)/$E_SPD,
   ($F_OUT-$F_IN)/$F_SPD, ($G_OUT-$G_IN)/$G_SPD, ($H_OUT-$H_IN)/$H_SPD, ($I_OUT-$I_IN)/$I_SPD]
print(round(sum(s),2), round(s[0],2), round(s[4],2))")"
A_FADE=$(python3 -c "print(round($A_DUR-0.35, 2))")
F_FADE=$(python3 -c "print(round($F_DUR-0.40, 2))")   # stacco fra telefono e web
FADE_OUT=$(python3 -c "print(round($TOTAL-0.9, 2))")
echo "durata finale attesa: ${TOTAL}s  (fade out a ${FADE_OUT}s)"

SC="scale=1920:1080:flags=lanczos,setsar=1"

filter="
[0:v]trim=${A_IN}:${A_OUT},setpts=(PTS-STARTPTS)/${A_SPD},$SC,fade=t=out:st=${A_FADE}:d=0.35[a];
[0:v]trim=${B_IN}:${B_OUT},setpts=(PTS-STARTPTS)/${B_SPD},$SC,fade=t=in:st=0:d=0.35[b];
[0:v]trim=${C_IN}:${C_OUT},setpts=(PTS-STARTPTS)/${C_SPD},$SC[c];
[0:v]trim=${E_IN}:${E_OUT},setpts=(PTS-STARTPTS)/${E_SPD},$SC[e];
[0:v]trim=${F_IN}:${F_OUT},setpts=(PTS-STARTPTS)/${F_SPD},$SC,fade=t=out:st=${F_FADE}:d=0.40[f];
[1:v]trim=${G_IN}:${G_OUT},setpts=(PTS-STARTPTS)/${G_SPD},$SC,fade=t=in:st=0:d=0.40[g];
[1:v]trim=${H_IN}:${H_OUT},setpts=(PTS-STARTPTS)/${H_SPD},$SC[h];
[1:v]trim=${I_IN}:${I_OUT},setpts=(PTS-STARTPTS)/${I_SPD},$SC[i];
[a][b][c][e][f][g][h][i]concat=n=8:v=1:a=0,
 fps=30,
 fade=t=in:st=0:d=0.6,
 fade=t=out:st=${FADE_OUT}:d=0.9,
 format=yuv420p[v]"

"$FF" -y -hide_banner -loglevel error -i "$TEL" -i "$WEB" \
  -filter_complex "$filter" -map "[v]" \
  -c:v libx264 -profile:v high -level 4.0 -crf 21 -preset slow \
  -movflags +faststart -an "$D/nutriapp-demo.mp4" || exit 1

# Poster: la scheda del prodotto con la foto vera
"$FF" -y -hide_banner -loglevel error -i "$D/nutriapp-demo.mp4" \
  -ss 17 -frames:v 1 -q:v 2 "$D/nutriapp-demo-poster.jpg" || exit 1

ls -la "$D"/nutriapp-demo.mp4 "$D"/nutriapp-demo-poster.jpg
"$FF" -hide_banner -i "$D/nutriapp-demo.mp4" 2>&1 | grep -E "Duration|Stream"
exit 0
