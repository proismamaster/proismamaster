-- Catalogo di MikeSullyShop per la registrazione della demo.
--
-- I nomi, i prezzi e le categorie ricalcano il catalogo dimostrativo che il
-- progetto porta con se' (`mock_db.php`, la modalita' senza database usata dal
-- portfolio), ma i percorsi delle immagini sono corretti: il mock punta a
-- `assets/img/products/`, dove pero' stanno solo quattro foto di prova, mentre
-- le foto vere dei prodotti sono in `assets/img/prodotti/`. Qui puntiamo a
-- quelle, e dove ci sono piu' scatti dello stesso articolo le mettiamo tutte,
-- cosi' la galleria al passaggio del mouse e il carosello della scheda hanno
-- davvero qualcosa da mostrare.

SET NAMES utf8mb4;

INSERT INTO categories (id, nome) VALUES
  (1,'Peluche'), (2,'Abbigliamento'), (3,'Accessori'), (4,'Casa'), (5,'Gadget')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

INSERT INTO products (id, nome, descrizione, prezzo, sconto_percentuale, giacenza, categoria_id, immagine_path, deleted_at) VALUES
-- ATTENZIONE ai nomi dei file: nel repo i due set sono INVERTITI. Le tre foto
-- che si chiamano `peluche-sulley-*` ritraggono Boo nel suo costume, e quelle
-- che si chiamano `peluche-boo-in-costume-*` ritraggono Sulley. Qui l'articolo
-- e' abbinato a quello che la foto mostra davvero, non a come si chiama il file.
 (1,'Peluche Sulley','Morbidissimo peluche di James P. Sullivan, perfetto per le notti senza paura. Pelo lungo, altezza 40 cm, imbottitura anallergica.',34.99,0,15,1,
  '["assets/img/prodotti/peluche-boo-in-costume-monsters-co--1778233287-0.jpg","assets/img/prodotti/peluche-boo-in-costume-monsters-co--1778233287-1.jpg","assets/img/prodotti/peluche-boo-in-costume-monsters-co--1778233287-2.jpg"]',NULL),
 (2,'Funko Pop Sulley','Funko Pop di Sulley con il coperchio della porta di Boo. Edizione da collezione, scatola con finestra trasparente.',29.99,10,8,5,
  '["assets/img/prodotti/funko-pop-sulley-con-coperchio-monsters-co--1778233058-0.jpg","assets/img/prodotti/funko-pop-sulley-con-coperchio-monsters-co--1778233058-1.jpg"]',NULL),
 (3,'T-Shirt Sulley & Mike Retro','T-shirt vintage Monsters & Co. con Sulley e Mike, stampa in stile anni 90. Cotone pettinato 180 g.',24.99,0,25,2,
  '["assets/img/prodotti/t-shirt-monsters-co-sulley-mike-retro-90s-1778232992-0.png"]',NULL),
 (4,'Peluche Boo in costume','Adorabile peluche di Boo nel suo costume da mostro, con il cappuccio a punte come nel film.',32.99,5,10,1,
  '["assets/img/prodotti/peluche-sulley-monsters-co--1778233251-0.jpg","assets/img/prodotti/peluche-sulley-monsters-co--1778233251-1.jpg","assets/img/prodotti/peluche-sulley-monsters-co--1778233251-2.jpg"]',NULL),
 (5,'Zaino Monstropolis','Zaino bicolore con la porta di Boo ricamata sul davanti. Comparto imbottito per laptop fino a 15 pollici.',39.99,0,12,3,
  '["assets/img/prodotti/zaino.png"]',NULL),
 (6,'Tazza Mike & Sulley','Tazza in ceramica da 350 ml con Mike e Sulley. Adatta a lavastoviglie e microonde.',14.99,0,30,4,
  '["assets/img/prodotti/tazza.png"]',NULL),
 (7,'Astuccio Mike Wazowski','Astuccio porta-penne con la faccia di Mike, un occhio solo e cerniera verde. Due scomparti interni.',12.99,0,18,3,
  '["assets/img/prodotti/astuccio-porta-penne-mike-wazowski-1778233175-0.jpg","assets/img/prodotti/astuccio-porta-penne-mike-wazowski-1778233175-1.jpg","assets/img/prodotti/astuccio-porta-penne-mike-wazowski-1778233175-2.jpg"]',NULL),
 (8,'T-Shirt Mike Wazowski Face','T-shirt con la faccia di Mike stampata a tutto petto. Vestibilita regolare, girocollo a costine.',22.99,15,20,2,
  '["assets/img/prodotti/t-shirt-monsters-co-mike-wazowski-face-1778233104-0.png"]',NULL),
 (9,'Calzini Monsters & Co.','Set di tre paia di calzini a tema Monstropolis: Mike, Sulley e la porta. Taglia unica 39-43.',9.99,0,40,2,
  '["assets/img/prodotti/calzini.png"]',NULL),
 (10,'Peluche Mike Wazowski','Peluche di Mike Wazowski alto 30 cm, con braccia e gambe snodabili e l occhio ricamato.',27.99,0,14,1,
  '["assets/img/prodotti/pupazzoMike.png"]',NULL)
ON DUPLICATE KEY UPDATE nome = VALUES(nome), immagine_path = VALUES(immagine_path);

-- Utenti: uno admin per il pannello, uno cliente per il giro d'acquisto.
-- Le password sono passate dallo script di seed con password_hash() vero, non
-- scritte a mano qui: l'app fa password_verify() e deve funzionare davvero.
