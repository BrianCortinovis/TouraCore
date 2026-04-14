/**
 * Data Processing Agreement (DPA) Management
 *
 * Implements DPA generation and validation per GDPR Art. 28 (Responsabile
 * del trattamento) for the Italian accommodation market. Covers the mandatory
 * contractual clauses between the data controller (the property) and
 * processors (Gest platform and sub-processors).
 *
 * Key regulations:
 * - GDPR Art. 28 (Responsabile del trattamento)
 * - GDPR Art. 28(3) (Contenuto obbligatorio del contratto)
 * - GDPR Art. 28(2) (Autorizzazione sub-responsabili)
 * - D.Lgs. 196/2003 (Codice Privacy) as amended by D.Lgs. 101/2018
 * - Linee guida EDPB 07/2020 sui concetti di titolare e responsabile
 */

import { format } from 'date-fns'
import type { DataProcessingAgreement } from '../types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubProcessor {
  name: string
  purpose: string
  data_categories: string[]
  location: string
}

export interface DPAValidationResult {
  valid: boolean
  missing: string[]
}

// ---------------------------------------------------------------------------
// Sub-processors
// ---------------------------------------------------------------------------

/**
 * List of Gest's sub-processors as required by GDPR Art. 28(2).
 *
 * The data controller must be informed of any sub-processors and must
 * have the opportunity to object. This list must be kept up to date and
 * communicated to all controllers upon any change.
 */
export const GEST_SUB_PROCESSORS: SubProcessor[] = [
  {
    name: 'Supabase Inc.',
    purpose: 'Hosting dell\'applicazione, database relazionale, autenticazione utenti e storage dei file',
    data_categories: [
      'Dati identificativi degli ospiti',
      'Dati di prenotazione e soggiorno',
      'Dati fiscali e di fatturazione',
      'Credenziali di accesso del personale',
      'Log di audit',
    ],
    location: 'Germania (UE)',
  },
  {
    name: 'Stripe Inc.',
    purpose: 'Elaborazione dei pagamenti elettronici, gestione degli abbonamenti e fatturazione ricorrente',
    data_categories: [
      'Dati di pagamento (token carta, IBAN)',
      'Dati identificativi del pagante',
      'Importi delle transazioni',
      'Dati di fatturazione dell\'abbonamento',
    ],
    location: 'Irlanda (UE)',
  },
  {
    name: 'Resend Inc.',
    purpose: 'Invio di comunicazioni email transazionali e di servizio agli ospiti e al personale',
    data_categories: [
      'Indirizzi email dei destinatari',
      'Nome e cognome dei destinatari',
      'Contenuto delle comunicazioni',
      'Metadati di consegna (aperture, bounce)',
    ],
    location: 'Stati Uniti',
  },
]

// ---------------------------------------------------------------------------
// DPA template generation
// ---------------------------------------------------------------------------

/**
 * Generate a standard Data Processing Agreement (DPA) template in Italian
 * per GDPR Art. 28(3).
 *
 * The generated text includes all mandatory clauses required by Art. 28(3):
 * (a) Processing only on documented instructions from the controller
 * (b) Confidentiality obligations for processing personnel
 * (c) Security measures per Art. 32
 * (d) Sub-processor authorization conditions
 * (e) Assistance with data subject rights
 * (f) Assistance with Arts. 32-36 obligations
 * (g) Deletion or return of data after end of processing
 * (h) Audit and inspection rights
 *
 * The returned HTML is suitable for rendering in the application or
 * exporting to PDF. Legal review is recommended before execution.
 */
export function generateDPATemplate(
  controllerName: string,
  processorName: string,
  purposes: string,
): string {
  const today = format(new Date(), 'dd/MM/yyyy')

  const subProcessorRows = GEST_SUB_PROCESSORS.map(sp =>
    `<tr>
      <td>${sp.name}</td>
      <td>${sp.purpose}</td>
      <td>${sp.data_categories.join(', ')}</td>
      <td>${sp.location}</td>
    </tr>`,
  ).join('\n')

  return `<div class="dpa-document">

<h1>ACCORDO PER IL TRATTAMENTO DEI DATI PERSONALI</h1>
<h2>ai sensi dell'Art. 28 del Regolamento UE 2016/679 (GDPR)</h2>

<p><strong>Data:</strong> ${today}</p>

<h3>TRA</h3>

<p>
  <strong>${controllerName}</strong> (di seguito "<strong>Titolare del trattamento</strong>"
  o "<strong>Titolare</strong>")
</p>

<p>E</p>

<p>
  <strong>${processorName}</strong> (di seguito "<strong>Responsabile del trattamento</strong>"
  o "<strong>Responsabile</strong>")
</p>

<p>(congiuntamente le "<strong>Parti</strong>")</p>

<hr />

<h3>PREMESSE</h3>

<ol type="A">
  <li>Il Titolare, nell'ambito della propria attivita' ricettiva, si avvale dei servizi
  del Responsabile per la gestione informatizzata della struttura.</li>
  <li>L'erogazione di tali servizi comporta il trattamento di dati personali per conto
  del Titolare, rendendo necessaria la stipula del presente accordo ai sensi dell'Art. 28
  del Regolamento UE 2016/679 (GDPR) e del D.Lgs. 196/2003 come modificato dal D.Lgs.
  101/2018.</li>
  <li>Le Parti intendono regolare con il presente accordo i rispettivi obblighi in materia
  di protezione dei dati personali.</li>
</ol>

<hr />

<h3>Art. 1 — OGGETTO E FINALITA' DEL TRATTAMENTO</h3>

<p>1.1 Il Responsabile tratta i dati personali per conto del Titolare esclusivamente
per le seguenti finalita':</p>

<p><em>${purposes}</em></p>

<p>1.2 Il trattamento e' limitato alle operazioni strettamente necessarie all'erogazione
dei servizi concordati e non puo' essere effettuato per finalita' diverse da quelle
indicate, salvo diversa istruzione documentata del Titolare.</p>

<h3>Art. 2 — CATEGORIE DI DATI PERSONALI</h3>

<p>2.1 Le categorie di dati personali oggetto del trattamento includono:</p>

<ul>
  <li><strong>Dati identificativi:</strong> nome, cognome, data e luogo di nascita,
  codice fiscale, indirizzo, recapiti telefonici, indirizzo email</li>
  <li><strong>Dati del documento di identita':</strong> tipo, numero, autorita' di
  rilascio, date di emissione e scadenza</li>
  <li><strong>Dati di soggiorno:</strong> date di arrivo e partenza, tipologia di camera,
  numero di ospiti, richieste speciali, preferenze</li>
  <li><strong>Dati fiscali e di fatturazione:</strong> partita IVA, codice SDI, PEC,
  ragione sociale, dati per la fatturazione elettronica</li>
  <li><strong>Dati di pagamento:</strong> token di carte di pagamento, riferimenti
  di transazione, importi</li>
  <li><strong>Dati di comunicazione:</strong> contenuto delle email, preferenze di
  contatto, consensi marketing</li>
</ul>

<h3>Art. 3 — CATEGORIE DI INTERESSATI</h3>

<p>3.1 Le categorie di interessati i cui dati sono oggetto del trattamento sono:</p>

<ul>
  <li>Ospiti e clienti della struttura ricettiva</li>
  <li>Accompagnatori e componenti del gruppo</li>
  <li>Personale e collaboratori della struttura</li>
  <li>Referenti aziendali per prenotazioni business</li>
  <li>Fornitori e partner commerciali</li>
</ul>

<h3>Art. 4 — OBBLIGHI DEL RESPONSABILE (Art. 28(3) GDPR)</h3>

<p>4.1 <strong>Istruzioni documentate (Art. 28(3)(a)):</strong> Il Responsabile tratta
i dati personali soltanto su istruzione documentata del Titolare, anche in caso di
trasferimento di dati personali verso un paese terzo o un'organizzazione internazionale,
salvo che lo richieda il diritto dell'Unione o dello Stato membro cui e' soggetto il
Responsabile. In tal caso, il Responsabile informa il Titolare circa tale obbligo
giuridico prima del trattamento, a meno che il diritto lo vieti per rilevanti motivi
di interesse pubblico.</p>

<p>4.2 <strong>Riservatezza (Art. 28(3)(b)):</strong> Il Responsabile garantisce che le
persone autorizzate al trattamento dei dati personali si siano impegnate alla riservatezza
o abbiano un adeguato obbligo legale di riservatezza.</p>

<p>4.3 <strong>Misure di sicurezza (Art. 28(3)(c) e Art. 32 GDPR):</strong> Il Responsabile
adotta tutte le misure tecniche e organizzative adeguate richieste ai sensi dell'Art. 32 GDPR,
tra cui, a seconda dei casi:</p>

<ul>
  <li>La cifratura dei dati personali in transito e a riposo (AES-256, TLS 1.2+)</li>
  <li>La capacita' di assicurare su base permanente la riservatezza, l'integrita',
  la disponibilita' e la resilienza dei sistemi e dei servizi di trattamento</li>
  <li>La capacita' di ripristinare tempestivamente la disponibilita' e l'accesso dei
  dati personali in caso di incidente fisico o tecnico (backup giornalieri, RTO &lt; 4 ore)</li>
  <li>Una procedura per testare, verificare e valutare regolarmente l'efficacia delle
  misure tecniche e organizzative (audit di sicurezza periodici)</li>
  <li>Controllo degli accessi basato sui ruoli (RBAC) con principio del minimo privilegio</li>
  <li>Autenticazione a due fattori per l'accesso ai sistemi di trattamento</li>
  <li>Logging e monitoraggio degli accessi ai dati personali</li>
  <li>Procedure di gestione delle vulnerabilita' e aggiornamento dei sistemi</li>
</ul>

<p>4.4 <strong>Sub-responsabili (Art. 28(3)(d) e Art. 28(2)):</strong> Il Responsabile
non ricorre ad un altro responsabile del trattamento senza previa autorizzazione scritta,
specifica o generale, del Titolare. Nel caso di autorizzazione scritta generale, il
Responsabile informa il Titolare di eventuali modifiche previste riguardanti l'aggiunta o
la sostituzione di altri responsabili del trattamento, dando cosi' al Titolare l'opportunita'
di opporsi a tali modifiche.</p>

<p>4.4.1 Il Titolare autorizza i seguenti sub-responsabili:</p>

<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
  <thead>
    <tr>
      <th>Sub-responsabile</th>
      <th>Finalita'</th>
      <th>Categorie di dati</th>
      <th>Sede</th>
    </tr>
  </thead>
  <tbody>
    ${subProcessorRows}
  </tbody>
</table>

<p>4.4.2 Qualora il sub-responsabile si trovi in un paese terzo al di fuori dello Spazio
Economico Europeo (SEE), il Responsabile garantisce che il trasferimento sia effettuato nel
rispetto degli artt. 44-49 del GDPR, ricorrendo a Clausole Contrattuali Standard (SCC)
approvate dalla Commissione Europea o ad altre garanzie adeguate.</p>

<p>4.5 <strong>Assistenza al Titolare per i diritti degli interessati (Art. 28(3)(e)):</strong>
Il Responsabile assiste il Titolare, nella misura in cui cio' sia possibile, mediante
misure tecniche e organizzative adeguate, al fine di soddisfare l'obbligo del Titolare di
dare seguito alle richieste per l'esercizio dei diritti degli interessati di cui al Capo III
del GDPR (accesso, rettifica, cancellazione, portabilita', limitazione, opposizione).</p>

<p>4.6 <strong>Assistenza per la sicurezza e le valutazioni d'impatto (Art. 28(3)(f)):</strong>
Il Responsabile assiste il Titolare nel garantire il rispetto degli obblighi di cui agli
artt. 32 (sicurezza del trattamento), 33 (notifica di violazione dei dati all'autorita' di
controllo), 34 (comunicazione di una violazione all'interessato), 35 (valutazione d'impatto
sulla protezione dei dati) e 36 (consultazione preventiva), tenendo conto della natura del
trattamento e delle informazioni a disposizione del Responsabile.</p>

<p>4.7 <strong>Notifica delle violazioni dei dati (Art. 33):</strong> Il Responsabile
notifica al Titolare, senza ingiustificato ritardo e comunque entro <strong>24 ore</strong>
dal momento in cui ne viene a conoscenza, qualsiasi violazione dei dati personali. La
notifica contiene almeno:</p>

<ul>
  <li>La natura della violazione, comprese le categorie e il numero approssimativo di
  interessati e di registrazioni coinvolti</li>
  <li>Il nome e i dati di contatto del referente per la violazione</li>
  <li>Le probabili conseguenze della violazione</li>
  <li>Le misure adottate o di cui si propone l'adozione per porre rimedio alla violazione
  e per attenuarne i possibili effetti negativi</li>
</ul>

<p>4.8 <strong>Cancellazione o restituzione dei dati (Art. 28(3)(g)):</strong> Al termine
della prestazione dei servizi relativi al trattamento, il Responsabile, su scelta del
Titolare, cancella o restituisce tutti i dati personali e cancella le copie esistenti, salvo
che il diritto dell'Unione o dello Stato membro preveda la conservazione dei dati personali.
Il Responsabile garantisce la cancellazione entro <strong>30 giorni</strong> dalla cessazione
del contratto, salvo diverso accordo scritto.</p>

<p>4.9 <strong>Audit e ispezioni (Art. 28(3)(h)):</strong> Il Responsabile mette a
disposizione del Titolare tutte le informazioni necessarie per dimostrare il rispetto degli
obblighi di cui al presente articolo e consente e contribuisce alle attivita' di revisione,
comprese le ispezioni, realizzate dal Titolare o da un altro soggetto da questi incaricato.
Il Titolare puo' esercitare il diritto di audit con un preavviso di almeno
<strong>15 giorni lavorativi</strong>.</p>

<h3>Art. 5 — OBBLIGHI DEL TITOLARE</h3>

<p>5.1 Il Titolare si impegna a:</p>

<ul>
  <li>Fornire al Responsabile istruzioni documentate in merito al trattamento dei dati
  personali</li>
  <li>Garantire la liceita' del trattamento e la base giuridica per il conferimento dei
  dati al Responsabile</li>
  <li>Informare gli interessati in conformita' agli artt. 13 e 14 del GDPR, inclusa
  l'indicazione del Responsabile del trattamento</li>
  <li>Notificare tempestivamente al Responsabile eventuali richieste di esercizio dei diritti
  da parte degli interessati</li>
</ul>

<h3>Art. 6 — DURATA E RISOLUZIONE</h3>

<p>6.1 Il presente accordo ha efficacia dalla data di sottoscrizione e rimane in vigore per
tutta la durata del rapporto contrattuale tra le Parti relativo ai servizi che comportano
il trattamento dei dati personali.</p>

<p>6.2 Gli obblighi di riservatezza e le disposizioni relative alla cancellazione/restituzione
dei dati sopravvivono alla cessazione del presente accordo.</p>

<h3>Art. 7 — LEGGE APPLICABILE E FORO COMPETENTE</h3>

<p>7.1 Il presente accordo e' regolato dalla legge italiana e dal Regolamento UE 2016/679.</p>

<p>7.2 Per qualsiasi controversia derivante dal presente accordo sara' competente in via
esclusiva il Foro del luogo in cui ha sede il Titolare del trattamento.</p>

<hr />

<p><strong>PER IL TITOLARE DEL TRATTAMENTO</strong></p>
<p>Nome: ${controllerName}</p>
<p>Firma: ___________________________</p>
<p>Data: ___________________________</p>

<br />

<p><strong>PER IL RESPONSABILE DEL TRATTAMENTO</strong></p>
<p>Nome: ${processorName}</p>
<p>Firma: ___________________________</p>
<p>Data: ___________________________</p>

</div>`
}

// ---------------------------------------------------------------------------
// DPA validation
// ---------------------------------------------------------------------------

/**
 * Validate that a Data Processing Agreement contains all required fields
 * per GDPR Art. 28(3).
 *
 * Returns an object indicating whether the DPA is valid and, if not, which
 * mandatory fields are missing.
 */
export function validateDPA(dpa: DataProcessingAgreement): DPAValidationResult {
  const missing: string[] = []

  if (!dpa.controller_name?.trim()) {
    missing.push('controller_name — Nome del Titolare del trattamento')
  }

  if (!dpa.processor_name?.trim()) {
    missing.push('processor_name — Nome del Responsabile del trattamento')
  }

  if (!dpa.processor_role?.trim()) {
    missing.push('processor_role — Ruolo del Responsabile')
  }

  if (!dpa.processing_purposes?.trim()) {
    missing.push('processing_purposes — Finalita\' del trattamento (Art. 28(3))')
  }

  if (!dpa.data_categories || dpa.data_categories.length === 0) {
    missing.push('data_categories — Categorie di dati personali trattati')
  }

  if (!dpa.data_subjects || dpa.data_subjects.length === 0) {
    missing.push('data_subjects — Categorie di interessati')
  }

  if (!dpa.security_measures?.trim()) {
    missing.push('security_measures — Misure di sicurezza ai sensi dell\'Art. 32 GDPR')
  }

  if (!dpa.effective_date) {
    missing.push('effective_date — Data di decorrenza dell\'accordo')
  }

  if (!dpa.signed_by_controller?.trim()) {
    missing.push('signed_by_controller — Firma del Titolare')
  }

  if (!dpa.signed_by_processor?.trim()) {
    missing.push('signed_by_processor — Firma del Responsabile')
  }

  if (!dpa.signed_at) {
    missing.push('signed_at — Data di sottoscrizione')
  }

  return {
    valid: missing.length === 0,
    missing,
  }
}
