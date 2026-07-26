-- Storico ordini per la demo.
--
-- Serve solo a dare qualcosa da mostrare al pannello "Ordini" e alla
-- "Reportistica Vendite": senza, quelle due schermate sono vuote e non si
-- capisce cosa facciano. Gli articoli, i prezzi e gli stati sono quelli veri
-- del catalogo; sono gli ordini in se' a essere costruiti. Il badge in
-- sovrimpressione nel video lo dice.
--
-- L'ordine che si vede nascere nel video NON e' qui dentro: quello lo crea
-- l'app davvero, passando dal checkout e dall'OTP, mentre si registra.

SET NAMES utf8mb4;

INSERT INTO orders (id, utente_id, data_ordine, totale, stato) VALUES
  (101, 2, NOW() - INTERVAL 23 DAY, 64.98, 'consegnato'),
  (102, 2, NOW() - INTERVAL 17 DAY, 24.99, 'consegnato'),
  (103, 2, NOW() - INTERVAL 11 DAY, 52.98, 'consegnato'),
  (104, 2, NOW() - INTERVAL  6 DAY, 39.99, 'spedito'),
  (105, 2, NOW() - INTERVAL  3 DAY, 22.98, 'spedito'),
  (106, 2, NOW() - INTERVAL  1 DAY, 47.98, 'preparazione')
ON DUPLICATE KEY UPDATE totale = VALUES(totale), stato = VALUES(stato);

INSERT INTO order_details (ordine_id, prodotto_id, quantita, prezzo_unitario) VALUES
  (101, 1, 1, 34.99), (101, 10, 1, 27.99),
  (102, 3, 1, 24.99),
  (103, 4, 1, 32.99), (103, 10, 1, 19.99),
  (104, 5, 1, 39.99),
  (105, 7, 1, 12.99), (105, 9, 1, 9.99),
  (106, 2, 1, 26.99), (106, 8, 1, 19.54)
ON DUPLICATE KEY UPDATE quantita = VALUES(quantita);

INSERT INTO order_shipping (ordine_id, nome, cognome, email, telefono, indirizzo, citta, cap, provincia, metodo_pagamento, note) VALUES
  (101,'Mike','Wazowski','mike@monsters.com','3451182277','Via delle Urla 1','Crema','26013','CR','Carta di Credito',NULL),
  (102,'Mike','Wazowski','mike@monsters.com','3451182277','Via delle Urla 1','Crema','26013','CR','PayPal',NULL),
  (103,'Mike','Wazowski','mike@monsters.com','3451182277','Via delle Urla 1','Crema','26013','CR','Carta di Credito',NULL),
  (104,'Mike','Wazowski','mike@monsters.com','3451182277','Via delle Urla 1','Crema','26013','CR','Contanti alla ricezione',NULL),
  (105,'Mike','Wazowski','mike@monsters.com','3451182277','Via delle Urla 1','Crema','26013','CR','PayPal',NULL),
  (106,'Mike','Wazowski','mike@monsters.com','3451182277','Via delle Urla 1','Crema','26013','CR','Carta di Credito',NULL)
ON DUPLICATE KEY UPDATE citta = VALUES(citta);
