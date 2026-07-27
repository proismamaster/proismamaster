#!/bin/bash
# Vestizione della demo di Forno Brace.
#
# Questo video NON e' uno screencast scriptato come gli altri: e' la
# registrazione fatta da Ismail, ripresa dal repo (sta in Git LFS). E' l'unica
# che mostra il sito con le FOTO VERE dei prodotti: arrivano da
# `images.unsplash.com`, che la policy di rete dell'ambiente di registrazione
# rifiuta a monte, quindi rigirandola qui il menu verrebbe pieno di riquadri
# rotti. Non potendola rifare, la si veste come le altre: stessa misura,
# stessi cartelli, stesse didascalie, niente audio.
#
# TAGLIO VOLUTO: il checkout e lo storico ordini restano fuori. Nella
# registrazione mostrano nome, indirizzo di consegna, telefono e metodo di
# pagamento del cliente di prova; sono dati finti, ma la regola tenuta su tutti
# gli altri video di questo portfolio e' che quella roba non si riprende.
# I confini sotto servono a questo: se li tocchi, ricontrolla i fotogrammi.
set -uo pipefail

D=/tmp/claude-0/-home-user-proismamaster/665b245a-a4c7-5022-9652-b85d6823b19c/scratchpad/forno
FF=/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2
SRC="$D/demo_originale.mp4"        # 2664x1440, 79.58s, con audio

# L'originale e' 2664x1440 (37:20), non 16:9: si tolgono 52px per lato invece di
# aggiungere bande nere, cosi' resta pieno schermo come gli altri video.
CROP="crop=2560:1440:52:0,scale=1920:1080:flags=lanczos,setsar=1"

#   inizio  fine    velocita'
S1_IN=1.00;  S1_OUT=8.20;   S1_SPD=1.00   # apertura: pane che sa di ieri e di domani
S2_IN=8.50;  S2_OUT=24.00;  S2_SPD=1.15   # il menu: filtri, ricerca, schede con le foto
S3_IN=24.00; S3_OUT=31.00;  S3_SPD=1.20   # come funziona, contatti, mappa
#        31.0 -> 63.5 TAGLIATO. Dopo l'accesso il video entra nel checkout
#        ("Completa l'ordine", da 35.0 in poi) e poi negli ordini: nome,
#        indirizzo di consegna, telefono e metodo di pagamento restano a
#        schermo per quasi mezzo minuto. Fuori tutto.
S4_IN=63.50; S4_OUT=73.50;  S4_SPD=1.00   # gestione: menu, prezzi, disponibilita, nuovo prodotto
S5_IN=73.50; S5_OUT=79.20;  S5_SPD=1.00   # chiusura sul menu

CARD_IN=4.20     # durata del cartello di apertura
CARD_OUT=5.00    # durata del cartello di chiusura

read -r D1 D2 D3 D4 D5 CORPO <<<"$(python3 -c "
a=($S1_OUT-$S1_IN)/$S1_SPD; b=($S2_OUT-$S2_IN)/$S2_SPD; c=($S3_OUT-$S3_IN)/$S3_SPD
d=($S4_OUT-$S4_IN)/$S4_SPD; e=($S5_OUT-$S5_IN)/$S5_SPD
print(round(a,2),round(b,2),round(c,2),round(d,2),round(e,2),round(a+b+c+d+e,2))")"
TOT=$(python3 -c "print(round($CARD_IN+$CORPO+$CARD_OUT,2))")
echo "corpo ${CORPO}s + cartelli -> ${TOT}s"

# --- passata 1: il corpo, ritagliato, riscalato e rimontato ------------------
"$FF" -y -hide_banner -loglevel error -i "$SRC" -filter_complex "
[0:v]trim=${S1_IN}:${S1_OUT},setpts=(PTS-STARTPTS)/${S1_SPD},$CROP[a];
[0:v]trim=${S2_IN}:${S2_OUT},setpts=(PTS-STARTPTS)/${S2_SPD},$CROP[b];
[0:v]trim=${S3_IN}:${S3_OUT},setpts=(PTS-STARTPTS)/${S3_SPD},$CROP[c];
[0:v]trim=${S4_IN}:${S4_OUT},setpts=(PTS-STARTPTS)/${S4_SPD},$CROP[d];
[0:v]trim=${S5_IN}:${S5_OUT},setpts=(PTS-STARTPTS)/${S5_SPD},$CROP[e];
[a][b][c][d][e]concat=n=5:v=1:a=0,fps=30[v]" \
  -map "[v]" -an -c:v libx264 -crf 16 -preset veryfast -pix_fmt yuv420p "$D/corpo.mp4" || exit 1

# --- passata 2: le didascalie, ognuna dentro il proprio segmento -------------
# Ogni scritta sta tutta dentro la scena che descrive: compare poco dopo il
# taglio e sparisce prima del successivo. Niente scritte a cavallo dei tagli.
read -r C1 C2 C3 C4 C5 C6 C7 C8 C9 CA CB CC <<<"$(python3 -c "
d1,d2,d3,d4,d5=$D1,$D2,$D3,$D4,$D5
t2=d1; t3=t2+d2; t4=t3+d3; t5=t4+d4
print(0.5, d1-0.5,                    # 1 apertura
      t2+0.6, t2+d2*0.42,             # 2 filtri
      t2+d2*0.48, t3-0.5,             # 3 schede prodotto
      t3+0.5, t4-0.45,                # 4 come funziona / contatti
      t4+0.5, t5-0.45,                # 5 gestione
      t5+0.5, t5+d5-0.45)")"          # 6 chiusura

"$FF" -y -hide_banner -loglevel error -i "$D/corpo.mp4" \
  -i "$D/cap_1.png" -i "$D/cap_2.png" -i "$D/cap_3.png" \
  -i "$D/cap_4.png" -i "$D/cap_5.png" -i "$D/cap_6.png" -filter_complex "
[0:v][1:v]overlay=0:0:enable='between(t,$C1,$C2)'[o1];
[o1][2:v]overlay=0:0:enable='between(t,$C3,$C4)'[o2];
[o2][3:v]overlay=0:0:enable='between(t,$C5,$C6)'[o3];
[o3][4:v]overlay=0:0:enable='between(t,$C7,$C8)'[o4];
[o4][5:v]overlay=0:0:enable='between(t,$C9,$CA)'[o5];
[o5][6:v]overlay=0:0:enable='between(t,$CB,$CC)'[v]" \
  -map "[v]" -an -c:v libx264 -crf 16 -preset veryfast -pix_fmt yuv420p "$D/corpo_cap.mp4" || exit 1

# --- passata 3: cartelli, dissolvenze, resa finale --------------------------
FADE_OUT=$(python3 -c "print(round($TOT-0.9, 2))")
"$FF" -y -hide_banner -loglevel error \
  -loop 1 -t $CARD_IN  -i "$D/cartello_intro.png" \
  -i "$D/corpo_cap.mp4" \
  -loop 1 -t $CARD_OUT -i "$D/cartello_outro.png" -filter_complex "
[0:v]scale=1920:1080,setsar=1,fps=30,format=yuv420p[i];
[1:v]setsar=1,fps=30,format=yuv420p[m];
[2:v]scale=1920:1080,setsar=1,fps=30,format=yuv420p[o];
[i][m][o]concat=n=3:v=1:a=0,
 fade=t=in:st=0:d=0.6,
 fade=t=out:st=${FADE_OUT}:d=0.9,
 format=yuv420p[v]" -map "[v]" \
  -c:v libx264 -profile:v high -level 4.2 -crf 20 -preset slow \
  -movflags +faststart -an "$D/fornobrace-demo.mp4" || exit 1

rm -f "$D/corpo.mp4" "$D/corpo_cap.mp4"

# Poster: l apertura col pane. Il menu, come poster, pescava una scheda di
# prova ("Isma / asd") rimasta nel database durante la registrazione.
"$FF" -y -hide_banner -loglevel error -i "$D/fornobrace-demo.mp4" \
  -ss 6.0 -frames:v 1 -q:v 2 "$D/fornobrace-demo-poster.jpg" || exit 1

ls -la "$D"/fornobrace-demo.mp4 "$D"/fornobrace-demo-poster.jpg
"$FF" -hide_banner -i "$D/fornobrace-demo.mp4" 2>&1 | grep -E "Duration|Stream"
exit 0
