# Test di Timeline

```bash
composer test:all
# oppure, senza Composer:
php tests/run.php
node --test tests/JavaScript/*.test.cjs
```

Il runner PHP usa prima `vendor/`, poi il vendor condiviso già presente in
`../.ibtest/vendor`. Per usare le dipendenze di un'applicazione ospite:

```bash
TIMELINE_TEST_VENDOR=/percorso/app/vendor php tests/run.php
```

Servono PHP con SQLite, PHPUnit e Orchestra Testbench. La suite è stata eseguita
con PHP 8.4, PHPUnit 11.5 e Laravel 11/Testbench 9. Richiede le dipendenze reali
IlBronza del package: CRUD, Buttons, Form, Menu, UikitTemplate, AccountManager e
Ukn (con le relative dipendenze). I manifest dei pacchetti IlBronza non dichiarano
ancora tutte queste dipendenze: un'installazione isolata di Timeline non basta.
Con il vendor `.ibtest` il bootstrap registra automaticamente i namespace di
produzione dei pacchetti fratelli. Non carica i loro test e non modifica il vendor.

La suite JavaScript usa il test runner integrato di Node.js (Node 20 o successivo),
senza `npm install`. Esegue l'intero file JavaScript distribuito, con sostituti
in memoria per vis-timeline, DOM, fetch, timer e localStorage. Non effettua
richieste reali. La data è fissa e il fuso è `Europe/Rome`, anche per i test del
passaggio all'ora legale/solare.

## Esecuzioni mirate

```bash
php tests/run.php --testsuite Unit
php tests/run.php --testsuite Feature
php tests/run.php --filter ModalRoutesTest
php tests/run.php --order-by=random --random-order-seed=20261004
node --test tests/JavaScript/groups.test.cjs
```

## Cosa verifica la suite

- Helper: identità, chiavi numeriche/stringa, mapping di ogni getter, propagazione
  del gruppo, stili, azioni Gantt, URL opzionali e serializzazione JSON delle date.
- Trait: fallback delle date, colori, titoli, classi CSS, URL, pulsanti Gantt e
  dispatch delle timeline globali.
- Controller: raccolte vuote e append, gruppi annidati, override Gantt, hook dei
  sottogruppi, placeholder degli aggiornamenti, configurazione e dati della vista.
- Modali: risoluzione morph con SQLite, record assenti, viste dell'applicazione o
  del package, fallback e precedenza dei pulsanti. Le richieste HTTP attraversano
  routing, autenticazione, middleware CRUD e rendering Blade reali.
- Service provider e Blade: configurazione, pubblicazione, route protette,
  escaping HTML/JSON, versionamento asset e punti di montaggio frontend.
- JavaScript: date e orari, intervalli nascosti, arrotondamento delle date di
  creazione, fine settimana e DST, zoom e persistenza, filtri gerarchici, cicli,
  gruppi vuoti, visibilità manuale, refresh, errori HTTP/JSON/rete, aggiornamenti,
  selezione, eventi e contratti dei link.

I test frontend non sono test end-to-end in un browser: layout, hover, rendering
reale di vis-timeline/UIkit e interazione completa con i form delle modali restano
da verificare in un'applicazione ospite. Non viene dichiarata una percentuale di
copertura del codice.

Il database è SQLite `:memory:`, senza `RefreshDatabase`. Cache e viste compilate
sono confinate in `tests/.runtime/` (ignorata da Git). Lo stub `App` rappresenta
solo il controller base e l'utente dell'applicazione ospite.

Su PHP 8.4 alcune esecuzioni isolate possono riportare deprecazioni delle firme
nullable nel package fratello CRUD; non sono errori di Timeline.

## Regressioni corrette

La suite ha riprodotto tre problemi: `group` non inizializzato sugli item senza
gruppo, `updateUrl` non trasferito dal modello e trascinamento ancora abilitato
in modalità di sola lettura. Le correzioni sono limitate a questi comportamenti.
