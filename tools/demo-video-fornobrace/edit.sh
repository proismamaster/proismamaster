#!/bin/bash
# Vestizione della demo di Forno Brace.
#
# Questo video NON e' uno screencast scriptato come gli altri: e' la
# registrazione fatta da Ismail. E' l'unica che mostra il sito con le FOTO VERE
# dei prodotti: arrivano da `images.unsplash.com`, che la policy di rete
# dell'ambiente di registrazione rifiuta a monte, quindi rigirandola qui il menu
# verrebbe pieno di riquadri rotti. Non potendola rifare, la si veste come le
# altre: stessa misura, stessi cartelli, stesse didascalie, niente audio.
#
# ── Il giro dell'ordine, che prima era tagliato ────────────────────────────────
# La prima versione buttava via tutto il tratto 31.0–63.5 perche' dentro c'e' il
# checkout, e nel checkout ci sono nome, indirizzo, telefono e metodo di
# pagamento. Insieme al checkout pero' se ne andava anche la parte migliore del
# progetto: il giro completo di un ordine.
#
#   il titolare entra in gestione → vede l'ordine in attesa → cambia lo stato a
#   Consegnato → il cliente lo vede aggiornato → i numeri del cruscotto si
#   ricalcolano da soli
#
# Ora si tiene quel giro e si butta solo il checkout vero e proprio (33–44), che
# e' l'unico punto dove i dati del cliente sono a schermo per esteso.
#
# ⚠️ RESTA UNA RIGA DA COPRIRE. Nel cruscotto ogni ordine e' intestato
# "#1 · Marta Bianchi · marta@example.com" con sotto data, indirizzo e telefono.
# Sono dati di prova — l'indirizzo e' quello della bottega stessa, il dominio e'
# example.com — ma la regola tenuta su tutti gli altri video e' che i dati di un
# cliente non si riprendono, e non la cambio per comodita'. Quella riga viene
# SFOCATA nelle scene del cruscotto. Restano leggibili il numero d'ordine, gli
# stati (RICEVUTO / CONSEGNATO / CONTANTI / PAGATO) e i totali, che sono il
# punto della scena.
#
# In "I miei ordini" (lato cliente) invece non si sfoca niente: li' c'e' solo
# "Consegna a Via dei Forni 14, Milano", che e' l'indirizzo della bottega, lo
# stesso stampato nel pie' di pagina e nella pagina contatti.
set -uo pipefail

D=/tmp/claude-0/-home-user-proismamaster/665b245a-a4c7-5022-9652-b85d6823b19c/scratchpad/forno
FF=/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2
SRC="$D/demo_originale.mp4"        # 2664x1440, 79.58s, con audio

# L'originale e' 2664x1440 (37:20), non 16:9: si tolgono 52px per lato invece di
# aggiungere bande nere, cosi' resta pieno schermo come gli altri video.
CROP="crop=2560:1440:52:0,scale=1920:1080:flags=lanczos,setsar=1"

# Riquadro dell'intestazione cliente, misurato sul fotogramma ORIGINALE a
# 2664x1440 (t=50). Si applica PRIMA del ritaglio, cosi' le coordinate restano
# quelle della sorgente: se cambi il CROP non devi rifare questo.
# ⚠️ Etichette uniche in tutto il filter_complex: con nomi generici collidono
# con quelle delle scene e ffmpeg ricabla il grafo in silenzio.
SFOCA="split=2[fz0][fz1];[fz1]crop=700:125:430:620,avgblur=20[fzb];[fz0][fzb]overlay=430:620"

#     inizio  fine    velocita'
S1_IN=1.00;   S1_OUT=8.20;   S1_SPD=1.00   # apertura: pane che sa di ieri e di domani
S2_IN=8.50;   S2_OUT=24.00;  S2_SPD=1.15   # il menu: filtri, ricerca, schede con le foto
S3_IN=24.00;  S3_OUT=31.00;  S3_SPD=1.20   # come funziona, contatti, mappa
#        31.0 -> 44.0 TAGLIATO: e' il checkout ("Completa l'ordine"). Nome,
#        indirizzo di consegna, telefono e metodo di pagamento restano a schermo
#        per una decina di secondi. Fuori.
S4_IN=44.00;  S4_OUT=46.60;  S4_SPD=1.00   # accesso all'area di gestione
#        46.6 -> 49.8 TAGLIATO: il browser chiede il permesso per le notifiche e
#        il riquadro di sistema resta aperto sopra la pagina fino a ~49.5.
S5_IN=49.80;  S5_OUT=52.20;  S5_SPD=0.80   # il cruscotto e l'ordine in attesa   [sfocata]
S6_IN=52.20;  S6_OUT=56.00;  S6_SPD=0.90   # il cambio di stato -> Consegnato    [sfocata]
S7_IN=56.20;  S7_OUT=59.30;  S7_SPD=1.10   # lato cliente: l'ordine e' consegnato
S8_IN=59.30;  S8_OUT=61.30;  S8_SPD=0.75   # il cruscotto ricalcolato            [sfocata]
S9_IN=63.50;  S9_OUT=73.50;  S9_SPD=1.00   # gestione menu: prezzi, disponibilita, nuovi prodotti
S10_IN=73.50; S10_OUT=79.20; S10_SPD=1.00  # chiusura sul menu

CARD_IN=4.20     # durata del cartello di apertura
CARD_OUT=5.00    # durata del cartello di chiusura

read -r D1 D2 D3 D4 D5 D6 D7 D8 D9 DA CORPO <<<"$(python3 -c "
v=[($S1_OUT-$S1_IN)/$S1_SPD, ($S2_OUT-$S2_IN)/$S2_SPD, ($S3_OUT-$S3_IN)/$S3_SPD,
   ($S4_OUT-$S4_IN)/$S4_SPD, ($S5_OUT-$S5_IN)/$S5_SPD, ($S6_OUT-$S6_IN)/$S6_SPD,
   ($S7_OUT-$S7_IN)/$S7_SPD, ($S8_OUT-$S8_IN)/$S8_SPD, ($S9_OUT-$S9_IN)/$S9_SPD,
   ($S10_OUT-$S10_IN)/$S10_SPD]
print(*[round(x,2) for x in v], round(sum(v),2))")"
TOT=$(python3 -c "print(round($CARD_IN+$CORPO+$CARD_OUT,2))")
echo "corpo ${CORPO}s + cartelli -> ${TOT}s"

# --- passata 1: il corpo, ritagliato, riscalato e rimontato ------------------
# Le scene 5, 6 e 8 passano dallo sfocatore prima del ritaglio.
"$FF" -y -hide_banner -loglevel error -i "$SRC" -filter_complex "
[0:v]trim=${S1_IN}:${S1_OUT},setpts=(PTS-STARTPTS)/${S1_SPD},$CROP[a];
[0:v]trim=${S2_IN}:${S2_OUT},setpts=(PTS-STARTPTS)/${S2_SPD},$CROP[b];
[0:v]trim=${S3_IN}:${S3_OUT},setpts=(PTS-STARTPTS)/${S3_SPD},$CROP[c];
[0:v]trim=${S4_IN}:${S4_OUT},setpts=(PTS-STARTPTS)/${S4_SPD},$CROP[d];
[0:v]trim=${S5_IN}:${S5_OUT},setpts=(PTS-STARTPTS)/${S5_SPD},${SFOCA},$CROP[e];
[0:v]trim=${S6_IN}:${S6_OUT},setpts=(PTS-STARTPTS)/${S6_SPD},${SFOCA},$CROP[f];
[0:v]trim=${S7_IN}:${S7_OUT},setpts=(PTS-STARTPTS)/${S7_SPD},$CROP[g];
[0:v]trim=${S8_IN}:${S8_OUT},setpts=(PTS-STARTPTS)/${S8_SPD},${SFOCA},$CROP[h];
[0:v]trim=${S9_IN}:${S9_OUT},setpts=(PTS-STARTPTS)/${S9_SPD},$CROP[i];
[0:v]trim=${S10_IN}:${S10_OUT},setpts=(PTS-STARTPTS)/${S10_SPD},$CROP[j];
[a][b][c][d][e][f][g][h][i][j]concat=n=10:v=1:a=0,fps=30[v]" \
  -map "[v]" -an -c:v libx264 -crf 16 -preset veryfast -pix_fmt yuv420p "$D/corpo.mp4" || exit 1

# --- passata 2: le didascalie, ognuna dentro il proprio segmento -------------
# Ogni scritta sta tutta dentro la scena che descrive: compare poco dopo il
# taglio e sparisce prima del successivo. Niente scritte a cavallo dei tagli.
# La scena 2 e' lunga e ne porta due (filtri, poi schede prodotto).
read -r C1 C2 C3 C4 C5 C6 C7 C8 C9 CA CB CC CD CE CF CG CH CI CJ CK CL CM \
  <<<"$(python3 -c "
d=[$D1,$D2,$D3,$D4,$D5,$D6,$D7,$D8,$D9,$DA]
t=[0]
for x in d: t.append(t[-1]+x)
out=[0.5, d[0]-0.5,                       # 1 apertura
     t[1]+0.6, t[1]+d[1]*0.42,            # 2 filtri
     t[1]+d[1]*0.48, t[2]-0.5]            # 3 schede prodotto
for i in range(2, 10):                    # 4..11, una per scena
    out += [round(t[i]+0.45,2), round(t[i+1]-0.4,2)]
print(*[round(x,2) for x in out])")"

"$FF" -y -hide_banner -loglevel error -i "$D/corpo.mp4" \
  -i "$D/cap_1.png"  -i "$D/cap_2.png" -i "$D/cap_3.png" -i "$D/cap_4.png" \
  -i "$D/cap_5.png"  -i "$D/cap_6.png" -i "$D/cap_7.png" -i "$D/cap_8.png" \
  -i "$D/cap_9.png"  -i "$D/cap_10.png" -i "$D/cap_11.png" -filter_complex "
[0:v][1:v]overlay=0:0:enable='between(t,$C1,$C2)'[o1];
[o1][2:v]overlay=0:0:enable='between(t,$C3,$C4)'[o2];
[o2][3:v]overlay=0:0:enable='between(t,$C5,$C6)'[o3];
[o3][4:v]overlay=0:0:enable='between(t,$C7,$C8)'[o4];
[o4][5:v]overlay=0:0:enable='between(t,$C9,$CA)'[o5];
[o5][6:v]overlay=0:0:enable='between(t,$CB,$CC)'[o6];
[o6][7:v]overlay=0:0:enable='between(t,$CD,$CE)'[o7];
[o7][8:v]overlay=0:0:enable='between(t,$CF,$CG)'[o8];
[o8][9:v]overlay=0:0:enable='between(t,$CH,$CI)'[o9];
[o9][10:v]overlay=0:0:enable='between(t,$CJ,$CK)'[o10];
[o10][11:v]overlay=0:0:enable='between(t,$CL,$CM)'[v]" \
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
