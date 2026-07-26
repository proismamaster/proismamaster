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
2. Catalogo, con la ricerca che interroga il database.
3. Scheda prodotto: carosello di immagini, giacenza, aggiunta al carrello.
4. Carrello con il **timer da 30 minuti** che riserva la merce.
5. Checkout: dati precompilati, tre metodi di pagamento, **OTP** sulla carta,
   ordine confermato con il suo numero.
6. Pannello di gestione: magazzino, ordini (in cima quello appena fatto), vendite.
7. Coda dentro il telefono, per far vedere che il layout regge.
8. Cartello di chiusura.

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

### Attenzione ai tempi di taglio

I confini in `edit.sh` **non** sono i valori di `marks.json`: Playwright scrive
il webm con una base tempi diversa dal tempo reale, e la deriva cambia da una
registrazione all'altra — in questa il file e' venuto piu' **corto** del copione
di circa il 2%, in altre e' venuto piu' lungo. Verifica sempre sul file:

```bash
ffmpeg -ss 106.2 -i raw/*.webm -frames:v 1 check.png
```
