# Demo di IRIS (BitCtrl)

Come le tre demo ereditate, **questa non l'ho girata io**: il filmato arriva da
Ismail (`IRIS_FRONTEND_1_1.mp4`, 1920x1140, 32.1s, con audio). Qui viene solo
ripulito, rimontato per scene e vestito nello stile degli altri video del
portfolio.

A differenza degli altri progetti, IRIS **non si può ri-registrare**: è roba
aziendale, il frontend gira contro un backend che non c'è qui. Quello che
c'è nel filmato è tutto quello che si ha.

## Le due cose coperte, che non sono estetica

### 1. La barra del browser si TAGLIA, non si sfoca

I primi **142 pixel** del fotogramma sono Brave con le schede e i preferiti di
Ismail aperti: Claude, Google Gemini, WhatsApp Web, "Portfolio e Strategia
Freelance", e un ticket della scuola intitolato `SIS5IB2526: Firewall`. Roba sua
e roba di terzi.

Sfocarla sarebbe stato sbagliato due volte: una sfocatura su testo piccolo e ad
alto contrasto si legge ancora, e comunque la barra non serve a niente. Si
taglia via — `crop=1898:998:0:142` — e il fotogramma ne guadagna: resta solo
l'applicazione. Si tolgono anche 22px a destra, che sono la barra di scorrimento.

### 2. Configuration → Network resta, ma sfocata

Quella pagina mostra hostname e indirizzi di un apparato reale:

| campo | cosa c'è |
|---|---|
| `hostname` | il nome dell'apparato |
| `interface wm0 ip` | l'indirizzo sulla rete interna |
| `interface wm0 subnet` | la maschera |

La pagina **resta nel video** — è metà del senso del progetto, un frontend che
configura dispositivi — ma i tre valori sono sfocati con `avgblur=22`. Restano
leggibili `wm0`, `static` e `ntp.google.com`, che dicono cosa fa la pagina senza
dire di chi è la macchina.

I riquadri sono misurati sul fotogramma **originale** a t=21 e poi riportati
nello spazio del ritaglio togliendo 142 dalla y. Se si cambia il valore del
`crop`, vanno rifatti.

⚠️ La sfocatura si verifica sul **montaggio finito**, non sul fotogramma
sorgente. È la lezione della demo di Instagram Followers: fra sorgente e resa
finale ci sono un ritaglio, una scalatura e una ricompressione, e l'unica prova
che valga è guardare il file che poi finisce online.

⚠️ Le etichette dentro `filter_complex` devono essere **uniche in tutto il
grafo**. Qui lo sfocatore usa `[nz0]…[nzC]` proprio per non collidere con il
resto. Quando collidono, ffmpeg ricabla in silenzio: nessun errore, esce la
scena sbagliata.

### Quello che NON si tocca: System info

La pagina System info sembra la più delicata delle tre — hostname, utente,
indirizzo IP — e invece è l'unica innocua:

```
hostname: my-computer      current_user: johndoe
uptime_seconds: 123456     ip_address: 192.168.1.10
```

Sono dati finti di esempio, ce l'hanno scritto sopra. Nasconderli avrebbe
nascosto la funzione senza proteggere niente.

## Le tecnologie sui cartelli

I cartelli dicono **Vue.js · PHP · cybersecurity**, che è quello che Ismail
dichiara nella scheda del portfolio.

Dal filmato si vede Material Design e un indicatore `connected` in alto a
destra, ma quello non basta a dire quale libreria ci sia sotto — Material lo
fanno sia MUI che Vuetify, e `localhost:5173` è Vite, che serve entrambe. Qui
non si tira a indovinare: si ripete quello che ha scritto lui.

## Impaginazione

Il ritaglio è 1898x998, cioè 1.902:1 — più largo del 16:9. Invece di
deformarlo o di tagliarlo ancora, sta dentro una **finestra 1780x936** in alto,
e sotto resta una fascia di 110px dove vive la didascalia.

La didascalia è **incisa dentro il PNG della scena**, non sovrapposta con un
`enable='between(...)'`. Così compare e sparisce esattamente con la scena a cui
appartiene: mai a cavallo di due, che è il difetto da evitare. Stessa tecnica di
FlappyBird e Raspberry Car.

## Le scene

Il filmato originale è un giro continuo di 32s. Diventa otto scene, ognuna
tagliata dove la cosa si vede meglio e con la propria velocità:

| # | sorgente | vel. | cosa si vede |
|---|---|---|---|
| 1 | 2.60–8.20 | 1.15x | l'editor vuoto e la barra degli strumenti |
| 2 | 8.30–10.30 | 0.80x | "Choose the Test Type" |
| 3 | 10.50–16.60 | 1.00x | il dialogo "New Standard Test" che si riempie |
| 4 | 16.80–19.30 | 0.90x | il passo entra nella sequenza |
| 5 | 19.60–21.90 | 0.95x | Configuration → Network **(sfocata)** |
| 6 | 22.15–25.10 | 0.95x | Driver e Clock and region |
| 7 | 25.30–29.00 | 1.05x | System info |
| 8 | 29.20–32.05 | 0.95x | ritorno alla sequenza |

I due secondi iniziali (lo splash BITCTRL) sono tagliati: il cartello di
apertura fa già quel lavoro, e meglio.

Le scene brevi vanno **rallentate**, non allungate: un dialogo che dura un
secondo e mezzo non si legge, e la didascalia sopra sparirebbe prima di essere
stata letta.

## Come si rifà

```bash
node iris_veste.mjs     # PNG: 8 scene con didascalia, 2 cartelli, 1 maschera
bash  iris_monta.sh     # -> iris-demo.mp4 (37.3s, 1920x1080, muto) + poster
```

L'audio della registrazione si butta, come in tutti gli altri video del
portfolio.

Il poster è preso a **t=18.8** (la sequenza con `Test #1/1`) e non dall'inizio:
i primi secondi sono una pagina bianca vuota, che come anteprima della tile non
dice niente.
