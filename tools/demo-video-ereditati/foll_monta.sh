#!/bin/bash
# Vestizione della demo di Instagram Followers.
#
# Registrazione di Ismail (dal repo del progetto), 2426x1440. Qui viene solo
# ritagliata a 16:9, rimontata, e vestita come le altre: cartelli, didascalie,
# niente audio.
#
# ⚠️ DUE COSE COPERTE, e non sono estetica:
#
# 1. La lista finale sono username Instagram VERI di persone che non ricambiano
#    il follow. Sono dati di terzi: restano nel video (sono il risultato dello
#    script, il senso del progetto) ma SFOCATI. Si legge "Total: 14 accounts",
#    non chi sono.
# 2. La schermata di esportazione dati mostra l'indirizzo email a cui Instagram
#    manda la notifica. Quel tratto e' saltato a monte, scegliendo gli
#    intervalli: non si passa mai di li'.
set -uo pipefail

D=/tmp/claude-0/-home-user-proismamaster/665b245a-a4c7-5022-9652-b85d6823b19c/scratchpad/altri
FF=/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2
SRC=/workspace/ig-unfollow-audit/demo.mp4      # 2426x1440, 79.25s

# 2426x1440 e' 1.685:1, piu' stretto del 16:9. Per arrivare a 1.778 si toglie
# altezza, non larghezza: 2426/1.7778 = 1365.
CROP="crop=2426:1365:0:40,scale=1920:1080:flags=lanczos,setsar=1"

#   inizio  fine    velocita'
S1_IN=2.0;   S1_OUT=11.0;  S1_SPD=1.20   # il profilo
S2_IN=20.5;  S2_OUT=25.2;  S2_SPD=1.00   # esportazione dati (prima della mail)
S3_IN=45.0;  S3_OUT=53.0;  S3_SPD=1.25   # scarico e scompatto l'archivio
S4_IN=66.0;  S4_OUT=73.5;  S4_SPD=1.10   # lo script gira nel terminale
S5_IN=74.5;  S5_OUT=78.8;  S5_SPD=1.00   # il risultato (con i nomi sfocati)

CARD_IN=4.20; CARD_OUT=5.00

read -r D1 D2 D3 D4 D5 CORPO <<<"$(python3 -c "
a=($S1_OUT-$S1_IN)/$S1_SPD; b=($S2_OUT-$S2_IN)/$S2_SPD; c=($S3_OUT-$S3_IN)/$S3_SPD
d=($S4_OUT-$S4_IN)/$S4_SPD; e=($S5_OUT-$S5_IN)/$S5_SPD
print(round(a,2),round(b,2),round(c,2),round(d,2),round(e,2),round(a+b+c+d+e,2))")"
TOT=$(python3 -c "print(round($CARD_IN+$CORPO+$CARD_OUT,2))")
echo "corpo ${CORPO}s + cartelli -> ${TOT}s"

# --- passata 1: corpo. L'ultimo segmento passa dallo sfocatore -----------------
# Riquadro dei nomi, misurato sul fotogramma originale a 2426x1440 e riportato
# sul 1920x1080 dopo il ritaglio: x 245..510, y 405..700.
# ⚠️ Le etichette interne devono essere UNICHE in tutto il filter_complex. Con
# [a]/[b] collidevano con quelle dei segmenti qui sotto e ffmpeg ricablava il
# grafo in silenzio: al posto del terminale usciva la pagina del profilo.
BLUR="split[bz1][bz2];[bz2]crop=320:375:235:392,avgblur=24[bz3];[bz1][bz3]overlay=235:392"

"$FF" -y -hide_banner -loglevel error -i "$SRC" -filter_complex "
[0:v]trim=${S1_IN}:${S1_OUT},setpts=(PTS-STARTPTS)/${S1_SPD},$CROP[a];
[0:v]trim=${S2_IN}:${S2_OUT},setpts=(PTS-STARTPTS)/${S2_SPD},$CROP[b];
[0:v]trim=${S3_IN}:${S3_OUT},setpts=(PTS-STARTPTS)/${S3_SPD},$CROP[c];
[0:v]trim=${S4_IN}:${S4_OUT},setpts=(PTS-STARTPTS)/${S4_SPD},$CROP[d];
[0:v]trim=${S5_IN}:${S5_OUT},setpts=(PTS-STARTPTS)/${S5_SPD},$CROP,${BLUR}[e];
[a][b][c][d][e]concat=n=5:v=1:a=0,fps=30[v]" \
  -map "[v]" -an -c:v libx264 -crf 16 -preset veryfast -pix_fmt yuv420p "$D/foll_corpo.mp4" || exit 1

# --- passata 2: didascalie, ognuna dentro la propria scena --------------------
read -r C1 C2 C3 C4 C5 C6 C7 C8 C9 CA <<<"$(python3 -c "
d=[$D1,$D2,$D3,$D4,$D5]
t=0; out=[]
for x in d:
    out += [round(t+0.5,2), round(t+x-0.45,2)]; t += x
print(*out)")"

"$FF" -y -hide_banner -loglevel error -i "$D/foll_corpo.mp4" \
  -i "$D/foll_cap1.png" -i "$D/foll_cap2.png" -i "$D/foll_cap3.png" \
  -i "$D/foll_cap4.png" -i "$D/foll_cap5.png" -filter_complex "
[0:v][1:v]overlay=0:0:enable='between(t,$C1,$C2)'[o1];
[o1][2:v]overlay=0:0:enable='between(t,$C3,$C4)'[o2];
[o2][3:v]overlay=0:0:enable='between(t,$C5,$C6)'[o3];
[o3][4:v]overlay=0:0:enable='between(t,$C7,$C8)'[o4];
[o4][5:v]overlay=0:0:enable='between(t,$C9,$CA)'[v]" \
  -map "[v]" -an -c:v libx264 -crf 16 -preset veryfast -pix_fmt yuv420p "$D/foll_capd.mp4" || exit 1

# --- passata 3: cartelli e resa finale ---------------------------------------
FADE_OUT=$(python3 -c "print(round($TOT-0.9, 2))")
"$FF" -y -hide_banner -loglevel error \
  -loop 1 -t $CARD_IN  -i "$D/foll_intro.png" \
  -i "$D/foll_capd.mp4" \
  -loop 1 -t $CARD_OUT -i "$D/foll_outro.png" -filter_complex "
[0:v]scale=1920:1080,setsar=1,fps=30,format=yuv420p[i];
[1:v]setsar=1,fps=30,format=yuv420p[m];
[2:v]scale=1920:1080,setsar=1,fps=30,format=yuv420p[o];
[i][m][o]concat=n=3:v=1:a=0,
 fade=t=in:st=0:d=0.6, fade=t=out:st=${FADE_OUT}:d=0.9, format=yuv420p[v]" -map "[v]" \
  -c:v libx264 -profile:v high -level 4.2 -crf 20 -preset slow \
  -movflags +faststart -an "$D/followers-demo.mp4" || exit 1

rm -f "$D/foll_corpo.mp4" "$D/foll_capd.mp4"
"$FF" -y -hide_banner -loglevel error -i "$D/followers-demo.mp4" \
  -ss 6 -frames:v 1 -q:v 2 "$D/followers-demo-poster.jpg" || exit 1

ls -la "$D/followers-demo.mp4"
"$FF" -hide_banner -i "$D/followers-demo.mp4" 2>&1 | grep -E "Duration|Stream"
