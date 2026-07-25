#!/bin/bash
# Montaggio della demo BaseFlow: unisce la registrazione desktop e quella
# multipiattaforma (telefono + download), accelera i segmenti lunghi
# dell'esecuzione, aggiunge le dissolvenze ed esporta in H.264.
#
# ATTENZIONE ai confini qui sotto: NON sono i marcatori di marks.json.
# Playwright scrive il webm con una base tempi piu' lunga del tempo reale
# (frame duplicati: sul desktop ~+11%, sul mobile ~+2%), quindi i tempi
# misurati dal copione non corrispondono ai secondi del file. I valori qui
# sono stati verificati estraendo fotogrammi dai .webm:
#   ffmpeg -ss <t> -i raw/*.webm -frames:v 1 check.png
# Se rigeneri le registrazioni, rifai questa verifica prima di fidarti.
set -uo pipefail

D="$(cd "$(dirname "$0")" && pwd)"
FF="${FF:-ffmpeg}"
SRC=$(ls "$D"/raw/*.webm | head -1)        # desktop   (durata 111.80)
MOB=$(ls "$D"/rawmob/*.webm | head -1)     # telefono  (durata  48.68)

# inizio    fine      velocita'
A_IN=2.60;   A_OUT=49.40;   A_SPD=1.40   # cartello di apertura + editing + caricamento
B_IN=49.40;  B_OUT=88.50;   B_SPD=3.00   # esecuzione animata su desktop
C_IN=88.50;  C_OUT=107.60;  C_SPD=1.25   # reveal della spirale + export in codice
M_IN=3.60;   M_OUT=8.60;    M_SPD=1.00   # il telefono entra in scena
N_IN=8.60;   N_OUT=13.60;   N_SPD=1.00   # parte l'esecuzione, compaiono le piattaforme
O_IN=13.60;  O_OUT=46.60;   O_SPD=3.40   # la spirale si completa sul telefono
P_IN=46.60;  P_OUT=48.60;   P_SPD=1.00   # tenuta sul quadro completo
Q_IN=109.40; Q_OUT=111.75;  Q_SPD=0.45   # cartello di chiusura (fermo: rallentarlo non si vede)

read -r TOTAL C_DUR <<<"$(python3 -c "
segs=[($A_OUT-$A_IN)/$A_SPD, ($B_OUT-$B_IN)/$B_SPD, ($C_OUT-$C_IN)/$C_SPD,
      ($M_OUT-$M_IN)/$M_SPD, ($N_OUT-$N_IN)/$N_SPD, ($O_OUT-$O_IN)/$O_SPD,
      ($P_OUT-$P_IN)/$P_SPD, ($Q_OUT-$Q_IN)/$Q_SPD]
print(round(sum(segs),2), round(segs[2],2))")"
C_FADE=$(python3 -c "print(round($C_DUR-0.35, 2))")   # stacco a nero desktop -> mobile
FADE_OUT=$(python3 -c "print(round($TOTAL-0.9, 2))")
echo "durata finale attesa: ${TOTAL}s  (fade out a ${FADE_OUT}s)"

# Le due sorgenti hanno risoluzioni diverse (1440x810 e 1280x720): ogni segmento
# va portato alla stessa misura PRIMA del concat, altrimenti il filtro rifiuta.
SC="scale=1280:720:flags=lanczos,setsar=1"

filter="
[0:v]trim=${A_IN}:${A_OUT},setpts=(PTS-STARTPTS)/${A_SPD},$SC[a];
[0:v]trim=${B_IN}:${B_OUT},setpts=(PTS-STARTPTS)/${B_SPD},$SC[b];
[0:v]trim=${C_IN}:${C_OUT},setpts=(PTS-STARTPTS)/${C_SPD},$SC,fade=t=out:st=${C_FADE}:d=0.35[c];
[1:v]trim=${M_IN}:${M_OUT},setpts=(PTS-STARTPTS)/${M_SPD},$SC,fade=t=in:st=0:d=0.35[m];
[1:v]trim=${N_IN}:${N_OUT},setpts=(PTS-STARTPTS)/${N_SPD},$SC[n];
[1:v]trim=${O_IN}:${O_OUT},setpts=(PTS-STARTPTS)/${O_SPD},$SC[o];
[1:v]trim=${P_IN}:${P_OUT},setpts=(PTS-STARTPTS)/${P_SPD},$SC[p];
[0:v]trim=${Q_IN}:${Q_OUT},setpts=(PTS-STARTPTS)/${Q_SPD},$SC[q];
[a][b][c][m][n][o][p][q]concat=n=8:v=1:a=0,
 fps=30,
 fade=t=in:st=0:d=0.6,
 fade=t=out:st=${FADE_OUT}:d=0.9,
 format=yuv420p[v]"

# 1) MP4 H.264 -- sorgente principale per il sito
"$FF" -y -hide_banner -loglevel error -i "$SRC" -i "$MOB" \
  -filter_complex "$filter" -map "[v]" \
  -c:v libx264 -profile:v high -level 4.0 -crf 21 -preset slow \
  -movflags +faststart -an "$D/baseflow-demo.mp4" || exit 1

# 2) Poster: fotogramma della spirale completa, per l'attributo poster=""
"$FF" -y -hide_banner -loglevel error -i "$D/baseflow-demo.mp4" \
  -ss 48.6 -frames:v 1 -q:v 2 "$D/baseflow-demo-poster.jpg" || exit 1

ls -la "$D"/baseflow-demo.mp4 "$D"/baseflow-demo-poster.jpg
"$FF" -hide_banner -i "$D/baseflow-demo.mp4" 2>&1 | grep -E "Duration|Stream"
exit 0
