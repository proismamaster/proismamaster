# Demo video di MikeSullyShop

Sorgenti per rigenerare `assets/demo/mikesullyshop-demo.mp4`: uno **screencast
scriptato** dell'e-commerce vero, servito da `php -S` contro MariaDB. Playwright
guida il sito in un Chromium headless mentre un overlay iniettato nella pagina
disegna cursore, sottotitoli e cartelli; ffmpeg taglia e riesporta in H.264.

Il video nasce da **due registrazioni**, unite in montaggio:

| file | cosa registra | risoluzione |
| --- | --- | --- |
| `record_mss.mjs` | il sito su desktop | 1920x1080 |
| `record_mobile.mjs` | `stage.html`: lo stesso sito dentro una cornice di telefono | 1920x1080 |

`stage.html` carica il sito in un `<iframe>` largo 390px, reso **1:1** senza
riduzione: i breakpoint di Bootstrap si attivano davvero, la UI da telefono non
e' simulata.

## Cosa mostra

1. Cartello di apertura.
2. Vetrina, di passaggio: ricerca che interroga il database, scheda prodotto,
   carrello col **timer da 30 minuti**.
3. **Pannello di gestione**, che è il cuore del video (tre quarti della parte
   desktop): magazzino con ricerca, modifica di un articolo e giacenza salvata;
   ordini con il cambio di stato riga per riga; riepilogo vendite.
4. Coda dentro il telefono, per far vedere che il layout regge.
5. Cartello di chiusura.

### Il checkout non si vede, ed è voluto

L'ordine viene creato **davvero** — la funzione `ordineFuoriCampo()` passa dal
carrello, dal form di spedizione e dall'OTP — ma quella parte non viene ripresa:
la pagina di spedizione e quella di conferma mostrano indirizzo, telefono e
metodo di pagamento, che in un video di portfolio non ci devono stare. Serve
solo a far comparire l'ordine, subito dopo, in cima al pannello Ordini.

⚠️ In `edit.sh` i due confini che tengono fuori quel pezzo (fine del segmento A,
inizio del segmento B) vanno ricontrollati **fotogramma per fotogramma** se
rigeneri le registrazioni: sono l'unica cosa che tiene i dati personali fuori.

### Le didascalie: prima la scritta, poi il gesto

Tutto il parlato passa da `beat(testo, azione)`, che mette su la didascalia,
aspetta un attimo, e **solo dopo** esegue il gesto, tenendo la scritta a schermo
finché il gesto non è finito. È l'unico modo per non ritrovarsi a leggere una
cosa mentre a schermo ne succede un'altra.

Due dettagli che sembrano cavilli e non lo sono:

- se il gesto cambia pagina serve `naviga: true`, perché il documento nuovo
  nasce senza didascalia e va rimessa, altrimenti la scritta sparisce a metà;
- il montaggio taglia dove finisce il **gesto**, non dove finisce la scritta.
  Una didascalia che resta su venti secondi dopo l'azione è lo stesso difetto
  visto dall'altra parte.

## Il database: schema ricostruito, dati in parte generati

Il repo **non contiene un dump SQL**, e `php/site_bootstrap.php` crea da solo
soltanto le tabelle accessorie (`product_categories`, `user_otps`,
`emails_outbox`, `homepage_collections`, `order_shipping`): quelle centrali le
da' per esistenti. `schema.sql` le ricostruisce dal diagramma ER del progetto
(`DB Strttura.png`), **verificate contro le query del codice**.

⚠️ Una differenza dal diagramma e' necessaria: `order_details` ha bisogno di una
colonna **`id` auto-incrementale** che il diagramma non riporta. Il codice ci
conta sopra davvero (`COUNT(d.id)` in `adminOrdini.php`, `ORDER BY d.id` in
`order_functions.php`); senza, il pannello Ordini muore con
*Unknown column 'd.id'*.

Cosa e' vero e cosa no, detto chiaro (il badge a schermo lo ripete):

- **veri**: il codice, lo schema, le foto dei prodotti (quelle del repo),
  il login con `password_verify()`, la ricerca, la gestione della giacenza,
  il timer del carrello, l'OTP, i controlli di ruolo sul pannello admin;
- **generati per la demo**: il catalogo (`seed.sql`, ricalcato sul catalogo
  dimostrativo che il progetto porta con se') e lo **storico ordini**
  (`seed_ordini.sql`), che serve solo a dare qualcosa da mostrare ai pannelli
  Ordini e Vendite.

L'ordine che si vede nascere nel video **non** e' finto: lo crea l'app davvero,
passando dal checkout e dall'OTP, mentre si registra. Per questo poi compare in
cima al pannello Ordini.

⚠️ Nel repo i nomi di due set di foto sono **invertiti**: i file
`peluche-sulley-*` ritraggono Boo, i file `peluche-boo-in-costume-*` ritraggono
Sulley. `seed.sql` abbina ogni articolo a quello che la foto mostra davvero.
Occhio anche alla cartella: le foto vere stanno in `assets/img/prodotti/`, non
in `assets/img/products/` (li' ci sono solo quattro scatti di prova).

## Le librerie da CDN: bloccate, quindi servite da disco

Il sito carica Bootstrap, le sue icone e SortableJS da jsdelivr e il font Inter
da Google Fonts. La policy di rete dell'ambiente di registrazione rifiuta
entrambi gli host a monte (403 al gateway sulla CONNECT), e **senza aggancio la
pagina viene fuori completamente senza stile e sembra rotta**, mentre non lo e'.

`lib_boot.mjs` intercetta quelle richieste e risponde da disco con le **stesse
identiche versioni** che il codice chiede (bootstrap 5.3.2, bootstrap-icons
1.11.3), installate da npm. Non e' una sostituzione: e' la stessa libreria.
Il font Inter invece non e' ottenibile e si ricade su un font di sistema:
cambia il disegno delle lettere, non il resto.

```bash
npm install bootstrap@5.3.2 bootstrap-icons@1.11.3 sortablejs   # in vendor/
```

## L'OTP del checkout non si vede a schermo

Con carta o PayPal il sito apre un `prompt()` **nativo del browser** per il
codice a 4 cifre, e poi un `alert()`. Sono finestre del browser, non della
pagina: nel video non compaiono, per questo il passaggio e' raccontato dalla
didascalia. Nel copione serve `p.on('dialog', d => d.accept('1234'))`: senza,
Playwright le scarta, l'ordine viene annullato e non arriva mai nel pannello.

## Come rigenerarlo

```bash
# 1. database
mysql -u root -e "CREATE DATABASE mikesully_shop CHARACTER SET utf8mb4"
mysql -u root -e "CREATE USER 'mss'@'127.0.0.1' IDENTIFIED BY '...'; \
                  GRANT ALL ON mikesully_shop.* TO 'mss'@'127.0.0.1'"
mysql -u root mikesully_shop < schema.sql
mysql -u root mikesully_shop < seed.sql
mysql -u root mikesully_shop < seed_ordini.sql
php seed_users.php                      # password con password_hash() vero

# 2. il sito vero su :8920, questa cartella su :8922
cd <mike-sully-shop> && MSS_DB_HOST=127.0.0.1 MSS_DB_USER=mss MSS_DB_PASS=... \
  MSS_DB_NAME=mikesully_shop php -S 127.0.0.1:8920 -t .
npx http-server -p 8922 -c-1 .

# 3. registra e monta
node record_mss.mjs
node record_mobile.mjs
bash edit.sh
```

⚠️ `db_connection.php` passa al database finto (`mock_db.php`, che esiste solo
nella copia dentro il portfolio) **se `MSS_DB_PASS` non e' impostata**. Se ti
ritrovi un catalogo diverso da quello che hai caricato, e' perche' l'app non si
sta collegando a MySQL.

## `php -S` si impunta: come non perdere una ripresa

Il server di sviluppo di PHP serve **una richiesta per processo** e resta in
ascolto sulla socket finché il client non la chiude. Chromium apre delle
connessioni "di riscaldamento" su cui non manda mai una richiesta, e ognuna si
mangia un processo per sempre: dopo qualche minuto il server smette di
rispondere e la registrazione si pianta su una navigazione, **senza un errore**.
Nel log si riconosce subito: righe `Accepted` senza la richiesta che segue.

Tre accorgimenti, tutti necessari:

```bash
PHP_CLI_SERVER_WORKERS=32 php -S 127.0.0.1:8920 -t .      # non un processo solo
```

```js
chromium.launch({ args: [
  '--disable-background-networking', '--disable-features=NetworkPrediction',
  '--dns-prefetch-disable',                                // niente preconnessioni
]});
```

E `vai()` ritenta: prima con `goto`, poi — se non passa — navigando **da dentro
la pagina** con `location.href`. A ripresa avanzata capita che il `goto`
pilotato da CDP non spedisca mai la richiesta, mentre il cambio di
`location.href` fatto dalla pagina passa sempre. Stessa cosa per l'invio dei
form: `el.form.requestSubmit(el)` al posto del click.

⚠️ Tutto quello che aspetta **dentro** la pagina (le dissolvenze dell'overlay,
lo scorrimento su `requestAnimationFrame`) passa da `conTetto()`, che gli mette
un limite. Senza, una sola di quelle attese può bloccare il copione per minuti.

⚠️ Il pannello Ordini chiede un `confirm()` prima di cambiare stato, e il
checkout un `prompt()` per l'OTP. Il gestore va **atteso**
(`async d => { await d.accept('1234'); }`): se si prosegue senza aspettare,
l'invio del form si perde e lo stato non viene mai salvato.

Se nonostante tutto resta del tempo morto in mezzo alla registrazione, non è un
dramma: si taglia in montaggio, come è stato fatto fra i segmenti C e D.

### Attenzione ai tempi di taglio

I confini in `edit.sh` **non** sono i valori di `marks.json`: Playwright scrive
il webm con una base tempi diversa dal tempo reale, e la deriva cambia da una
registrazione all'altra — in questa il file e' venuto piu' **corto** del copione
di circa il 2%, in altre e' venuto piu' lungo. Verifica sempre sul file:

```bash
ffmpeg -ss 106.2 -i raw/*.webm -frames:v 1 check.png
```

## La registrazione di Ismail: perché non è stata usata

A demo finita Ismail ha consegnato anche una **sua** registrazione di
MikeSullyShop (1:33, 2426x1440, con la barra del browser). L'ho guardata tutta,
e non è entrata nel montaggio. Le ragioni, per non rifare il giro un'altra
volta:

- **Non aggiunge niente.** Vetrina, carrello, magazzino, ordini e reportistica
  vendite ci sono già nel montaggio scriptato, girati a 1920x1080 nativi.
- **Il cambio di stato non si vede nemmeno lì.** Era l'unica cosa che questo
  video non riesce a mostrare (il badge che cambia colore in Gestione Ordini).
  Nella registrazione di Ismail l'ordine #2 compare **già** *Consegnato*: si
  vede lo stato finale, non il passaggio. Stesso limite, non un rimedio.
- **C'è la sua Gmail personale.** Il pezzo davvero nuovo sarebbe la posta
  transazionale — il codice OTP alla registrazione e l'email "Ordine #2 · Stato
  aggiornato a Consegnato" — che dimostra una funzione vera dell'app. Ma vive
  dentro la sua casella: indirizzo personale, `1 di 1.474`, la barra laterale di
  Google. Ritagliare la sola scheda del messaggio lascia ~950x700 px da
  ingrandire più del doppio: viene molle, e basta allargare di poco per
  riprendere la casella.
- **Il suo indirizzo email compare in tutto il pannello admin**, come cliente di
  prova degli ordini e nel Report Cliente.

Se un giorno serve mostrare la posta transazionale, la strada è rifarla con una
casella usa e getta, non ritagliare quella vera.
