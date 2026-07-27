#!/bin/bash
# Montaggio della demo di MikeSullyShop: unisce la registrazione desktop e la
# coda dentro la cornice del telefono, accelera i tratti lunghi, mette le
# dissolvenze ed esporta in H.264 a 1920x1080.
#
# DUE TAGLI VOLUTI, non estetici:
#
# * Fra A e B manca un pezzo di registrazione: e' il checkout. L'ordine viene
#   creato davvero, ma la pagina di spedizione e quella di conferma mostrano
#   indirizzo, telefono e metodo di pagamento, e nel video non ci devono stare.
#   A finisce PRIMA che si apra la scheda prodotto del giro d'acquisto, B
#   riprende quando a schermo c'e' gia' la pagina di accesso. Se rigeneri le
#   registrazioni, ricontrolla questi due confini fotogramma per fotogramma:
#   e' l'unica cosa che tiene i dati personali fuori dal video.
# * Fra C e D mancano quasi due minuti di pagina Ordini ferma: e' tempo morto
#   della registrazione (vedi il README), non c'e' niente da vedere. C finisce
#   dove finisce il GESTO, non dove finisce la didascalia: lasciare una scritta
#   a schermo per venti secondi dopo che l'azione e' finita e' proprio il
#   difetto che si voleva togliere.
#
# ATTENZIONE ai confini: NON sono i valori di marks.json. Playwright scrive il
# webm con una base tempi diversa dal tempo reale. Verifica sempre sul file:
#   ffmpeg -ss 226.5 -i raw/*.webm -frames:v 1 check.png
set -uo pipefail

D=/tmp/claude-0/-home-user-proismamaster/665b245a-a4c7-5022-9652-b85d6823b19c/scratchpad/shop
FF=/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2
SRC=$(ls "$D"/raw/*.webm | head -1)        # desktop   1920x1080 (durata 236.32)
MOB=$(ls "$D"/rawmob/*.webm | head -1)     # telefono  1920x1080 (durata  20.8)

# inizio      fine        velocita'
# Il cartello di apertura va per conto suo e RALLENTATO: dentro il segmento
# della vetrina, alla velocita' di quello, durerebbe un secolo e mezzo di
# niente — un secondo e mezzo, non si fa in tempo a leggerlo.
Z_IN=4.80;    Z_OUT=7.60;    Z_SPD=0.70   # cartello di apertura
A_IN=7.60;    A_OUT=34.00;   A_SPD=1.70   # vetrina, scheda, carrello col timer
B_IN=40.70;   B_OUT=83.00;   B_SPD=1.55   # accesso admin + magazzino (ricerca, modifica, giacenza)
C_IN=83.00;   C_OUT=109.00;  C_SPD=2.00   # ordini: elenco, contenuto, cambio stato riga per riga
D_IN=226.50;  D_OUT=233.00;  D_SPD=1.00   # vendite: fatturato, piu venduto, nuovi clienti
M_IN=3.40;    M_OUT=20.40;   M_SPD=1.35   # la stessa vetrina dentro il telefono
Q_IN=233.80;  Q_OUT=236.20;  Q_SPD=0.45   # cartello di chiusura (fermo: rallentarlo non si vede)

read -r TOTAL D_DUR ADMIN <<<"$(python3 -c "
z=($Z_OUT-$Z_IN)/$Z_SPD; a=($A_OUT-$A_IN)/$A_SPD; b=($B_OUT-$B_IN)/$B_SPD
c=($C_OUT-$C_IN)/$C_SPD; d=($D_OUT-$D_IN)/$D_SPD
m=($M_OUT-$M_IN)/$M_SPD; q=($Q_OUT-$Q_IN)/$Q_SPD
print(round(z+a+b+c+d+m+q,2), round(d,2), round((b+c+d)/(a+b+c+d)*100))")"
D_FADE=$(python3 -c "print(round($D_DUR-0.35, 2))")   # stacco a nero desktop -> telefono
FADE_OUT=$(python3 -c "print(round($TOTAL-0.9, 2))")
echo "durata finale attesa: ${TOTAL}s  (il pannello di gestione e' il ${ADMIN}% della parte desktop)"

SC="scale=1920:1080:flags=lanczos,setsar=1"

filter="
[0:v]trim=${Z_IN}:${Z_OUT},setpts=(PTS-STARTPTS)/${Z_SPD},$SC[z];
[0:v]trim=${A_IN}:${A_OUT},setpts=(PTS-STARTPTS)/${A_SPD},$SC[a];
[0:v]trim=${B_IN}:${B_OUT},setpts=(PTS-STARTPTS)/${B_SPD},$SC[b];
[0:v]trim=${C_IN}:${C_OUT},setpts=(PTS-STARTPTS)/${C_SPD},$SC[c];
[0:v]trim=${D_IN}:${D_OUT},setpts=(PTS-STARTPTS)/${D_SPD},$SC,fade=t=out:st=${D_FADE}:d=0.35[d];
[1:v]trim=${M_IN}:${M_OUT},setpts=(PTS-STARTPTS)/${M_SPD},$SC,fade=t=in:st=0:d=0.35[m];
[0:v]trim=${Q_IN}:${Q_OUT},setpts=(PTS-STARTPTS)/${Q_SPD},$SC[q];
[z][a][b][c][d][m][q]concat=n=7:v=1:a=0,
 fps=30,
 fade=t=in:st=0:d=0.6,
 fade=t=out:st=${FADE_OUT}:d=0.9,
 format=yuv420p[v]"

# 1) MP4 H.264 -- sorgente principale per il sito
"$FF" -y -hide_banner -loglevel error -i "$SRC" -i "$MOB" \
  -filter_complex "$filter" -map "[v]" \
  -c:v libx264 -profile:v high -level 4.2 -crf 20 -preset slow \
  -movflags +faststart -an "$D/mikesullyshop-demo.mp4" || exit 1

# 2) Poster: la vetrina con la griglia dei prodotti — dice "negozio" a colpo
#    d'occhio meglio di qualsiasi altra schermata.
"$FF" -y -hide_banner -loglevel error -i "$D/mikesullyshop-demo.mp4" \
  -ss 6.5 -frames:v 1 -q:v 2 "$D/mikesullyshop-demo-poster.jpg" || exit 1

ls -la "$D"/mikesullyshop-demo.mp4 "$D"/mikesullyshop-demo-poster.jpg
"$FF" -hide_banner -i "$D/mikesullyshop-demo.mp4" 2>&1 | grep -E "Duration|Stream"
exit 0
