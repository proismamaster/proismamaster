-- Schema principale di MikeSullyShop.
--
-- Il repo NON contiene un dump: `php/site_bootstrap.php` crea da solo le tabelle
-- accessorie (product_categories, user_otps, emails_outbox, homepage_collections,
-- order_shipping) ma da' per scontato che quelle centrali ci siano gia'. Queste
-- sono ricostruite dal diagramma ER del progetto ("DB Strttura.png") e verificate
-- contro le query del codice: nomi di colonna, tipi e enum sono quelli che l'app
-- si aspetta, non un'invenzione.

CREATE TABLE IF NOT EXISTS categories (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  descrizione TEXT,
  prezzo DECIMAL(10,2) NOT NULL,
  sconto_percentuale INT(11) NOT NULL DEFAULT 0,
  giacenza INT(11) NOT NULL DEFAULT 0,
  categoria_id INT(11) NULL,
  immagine_path TEXT,
  deleted_at DATETIME NULL,
  FOREIGN KEY (categoria_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(50) NOT NULL,
  cognome VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  ruolo ENUM('admin','cliente') NOT NULL DEFAULT 'cliente',
  data_creazione TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  utente_id INT(11) NOT NULL,
  data_ordine TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  totale DECIMAL(10,2) NOT NULL,
  stato ENUM('preparazione','spedito','annullato','consegnato','in attesa','completato')
        NOT NULL DEFAULT 'preparazione',
  FOREIGN KEY (utente_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- `id` non compare nel diagramma ER, ma il codice ci conta sopra davvero:
-- adminOrdini.php fa COUNT(d.id) e order_functions.php fa ORDER BY d.id.
-- Senza, il pannello Ordini muore con "Unknown column 'd.id'".
CREATE TABLE IF NOT EXISTS order_details (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  ordine_id INT(11) NOT NULL,
  prodotto_id INT(11) NOT NULL,
  quantita INT(11) NOT NULL,
  prezzo_unitario DECIMAL(10,2) NOT NULL,
  UNIQUE KEY uq_ordine_prodotto (ordine_id, prodotto_id),
  FOREIGN KEY (ordine_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (prodotto_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wishlist (
  utente_id INT(11) NOT NULL,
  prodotto_id INT(11) NOT NULL,
  data_aggiunta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (utente_id, prodotto_id),
  FOREIGN KEY (utente_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (prodotto_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
