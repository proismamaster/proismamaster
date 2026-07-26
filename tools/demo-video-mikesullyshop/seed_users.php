<?php
// Crea i due utenti della demo con password_hash() vero, cosi' il login passa
// dal password_verify() dell'app come per un utente qualsiasi.
$c = new mysqli('127.0.0.1', 'mss', 'mss_demo_2026', 'mikesully_shop', 3306);
$c->set_charset('utf8mb4');

$utenti = [
  ['Ismail', 'Barakat', 'admin@mikesully.shop', 'admin123',    'admin'],
  ['Mike',   'Wazowski', 'mike@monsters.com',   'password123', 'cliente'],
];

$q = $c->prepare('INSERT INTO users (nome, cognome, email, password, ruolo) VALUES (?,?,?,?,?)
                  ON DUPLICATE KEY UPDATE password = VALUES(password), ruolo = VALUES(ruolo)');
foreach ($utenti as [$nome, $cognome, $email, $pw, $ruolo]) {
    $hash = password_hash($pw, PASSWORD_DEFAULT);
    $q->bind_param('sssss', $nome, $cognome, $email, $hash, $ruolo);
    $q->execute();
    echo "utente: $email ($ruolo)\n";
}

$r = $c->query('SELECT COUNT(*) n FROM products WHERE deleted_at IS NULL')->fetch_assoc();
echo "prodotti a catalogo: {$r['n']}\n";
