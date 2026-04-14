/**
 * GDPR Art. 30 — Processing Activities Register
 *
 * Implements the register of processing activities (registro dei trattamenti)
 * required by Art. 30 of the GDPR (Regolamento UE 2016/679) for Italian
 * accommodation facilities.
 *
 * Every data controller must maintain a written record of processing
 * activities under its responsibility. This module provides:
 * - Pre-populated processing activities typical for Italian hospitality
 * - Validation of Art. 30 mandatory fields
 * - Export in a format suitable for Garante per la Protezione dei Dati
 *   Personali inspections
 *
 * Key regulations:
 * - GDPR Art. 30 (Registri delle attivita' di trattamento)
 * - Art. 109 TULPS (R.D. 773/1931) — Alloggiati / police registration
 * - D.Lgs. 322/1989 — Sistema statistico nazionale (ISTAT)
 * - D.Lgs. 23/2011 — Imposta di soggiorno
 * - D.P.R. 633/1972 — Fatturazione elettronica
 * - D.Lgs. 231/2007 — Antiriciclaggio
 * - Provvedimento Garante 08/04/2010 — Videosorveglianza
 * - D.Lgs. 196/2003 (Codice Privacy) as amended by D.Lgs. 101/2018
 */

import { format } from 'date-fns'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProcessingActivityTemplate {
  activity_name: string
  purpose: string
  legal_basis: string
  data_categories: string[]
  data_subjects: string[]
  recipients: string[]
  retention_period: string
  retention_period_days: number
  security_measures: string
  dpia_required: boolean
}

// ---------------------------------------------------------------------------
// Default processing activities
// ---------------------------------------------------------------------------

/**
 * Pre-populated processing activities typical for an Italian accommodation
 * facility (hotel, B&B, agriturismo, casa vacanze, etc.).
 *
 * These templates cover the most common processing activities required by
 * law or operationally necessary for running an accommodation business
 * in Italy. Each activity includes the legal basis, data categories,
 * retention periods, and other Art. 30 mandatory fields.
 *
 * Note: This list should be reviewed and customized by the data controller
 * to reflect the actual processing activities of the specific facility.
 */
export const DEFAULT_PROCESSING_ACTIVITIES: ProcessingActivityTemplate[] = [
  // -------------------------------------------------------------------------
  // 1. Guest registration and booking management
  // -------------------------------------------------------------------------
  {
    activity_name: 'Gestione prenotazioni e registrazione ospiti',
    purpose:
      'Gestione delle prenotazioni, check-in, check-out, erogazione dei servizi ' +
      'alberghieri e comunicazioni relative al soggiorno. Esecuzione del contratto ' +
      'di alloggio con l\'ospite.',
    legal_basis: 'Art. 6(1)(b) GDPR — Esecuzione di un contratto',
    data_categories: [
      'Dati identificativi (nome, cognome, data di nascita, luogo di nascita)',
      'Dati di contatto (email, telefono, indirizzo)',
      'Dati del documento di identita\' (tipo, numero, paese di rilascio)',
      'Dati relativi al soggiorno (date, tipologia camera, richieste speciali)',
      'Dati di pagamento (metodo di pagamento, riferimenti transazione)',
    ],
    data_subjects: [
      'Ospiti della struttura ricettiva',
      'Soggetti che effettuano la prenotazione per conto di terzi',
    ],
    recipients: [
      'Personale autorizzato della struttura (addetti al ricevimento, direzione)',
      'Fornitori di servizi informatici (PMS, channel manager, booking engine)',
      'Portali di prenotazione online (OTA) per la gestione della prenotazione',
      'Istituti bancari e circuiti di pagamento',
    ],
    retention_period: 'Durata del rapporto contrattuale + 10 anni per obblighi fiscali',
    retention_period_days: 3650,
    security_measures:
      'Cifratura dei dati in transito (TLS 1.2+) e a riposo (AES-256). ' +
      'Controllo degli accessi basato su ruoli (RBAC). Autenticazione a due fattori ' +
      'per l\'accesso al gestionale. Backup crittografati giornalieri. Log degli accessi.',
    dpia_required: false,
  },

  // -------------------------------------------------------------------------
  // 2. Police registration / Alloggiati Web
  // -------------------------------------------------------------------------
  {
    activity_name: 'Registrazione alloggiati — Comunicazione alla Questura',
    purpose:
      'Comunicazione dei dati degli ospiti alla Questura tramite il portale ' +
      'Alloggiati Web del Ministero dell\'Interno, ai sensi dell\'Art. 109 del ' +
      'TULPS. La comunicazione deve avvenire entro 24 ore dall\'arrivo.',
    legal_basis:
      'Art. 6(1)(c) GDPR — Adempimento di un obbligo di legge + ' +
      'Art. 109 TULPS (R.D. 18 giugno 1931, n. 773)',
    data_categories: [
      'Dati identificativi (nome, cognome, data e luogo di nascita, cittadinanza)',
      'Dati del documento di identita\' (tipo, numero, paese di rilascio)',
      'Date di arrivo e partenza prevista',
    ],
    data_subjects: [
      'Tutti gli ospiti alloggiati nella struttura (inclusi minori accompagnati)',
    ],
    recipients: [
      'Questura competente per territorio tramite portale Alloggiati Web',
      'Ministero dell\'Interno — Dipartimento della Pubblica Sicurezza',
    ],
    retention_period: '5 anni dalla data di registrazione',
    retention_period_days: 1825,
    security_measures:
      'Trasmissione tramite canale cifrato al portale Alloggiati Web. ' +
      'Accesso al portale con credenziali dedicate. Conservazione locale delle ' +
      'ricevute di trasmissione. Accesso ai dati limitato al personale autorizzato.',
    dpia_required: false,
  },

  // -------------------------------------------------------------------------
  // 3. ISTAT statistics
  // -------------------------------------------------------------------------
  {
    activity_name: 'Rilevazione statistica ISTAT — Modello C/59',
    purpose:
      'Raccolta e trasmissione dei dati statistici sul movimento dei clienti ' +
      'nelle strutture ricettive ai fini della rilevazione ISTAT, ai sensi del ' +
      'D.Lgs. 322/1989 e del Piano Statistico Nazionale.',
    legal_basis:
      'Art. 6(1)(c) GDPR — Adempimento di un obbligo di legge + ' +
      'D.Lgs. 322/1989 (Norme sul Sistema statistico nazionale)',
    data_categories: [
      'Dati aggregati sul movimento clienti (arrivi, presenze, partenze)',
      'Nazionalita\' o regione di provenienza degli ospiti (in forma aggregata)',
      'Tipologia della struttura ricettiva e capacita\' ricettiva',
    ],
    data_subjects: [
      'Ospiti della struttura ricettiva (dati trattati in forma aggregata)',
    ],
    recipients: [
      'ISTAT — Istituto Nazionale di Statistica',
      'Ufficio statistico della Regione/Provincia competente',
      'APT o ente di promozione turistica territoriale',
    ],
    retention_period: '5 anni dalla data di trasmissione',
    retention_period_days: 1825,
    security_measures:
      'Dati trasmessi in forma aggregata e anonimizzata. Accesso al portale ' +
      'ISTAT con credenziali dedicate. Conservazione dei report trasmessi e delle ' +
      'ricevute. I dati individuali degli ospiti non vengono trasmessi.',
    dpia_required: false,
  },

  // -------------------------------------------------------------------------
  // 4. Tourist tax collection
  // -------------------------------------------------------------------------
  {
    activity_name: 'Imposta di soggiorno — Riscossione e rendicontazione',
    purpose:
      'Riscossione dell\'imposta di soggiorno dagli ospiti e rendicontazione ' +
      'al Comune competente, ai sensi del D.Lgs. 23/2011. Gestione delle ' +
      'esenzioni e delle dichiarazioni degli ospiti.',
    legal_basis:
      'Art. 6(1)(c) GDPR — Adempimento di un obbligo di legge + ' +
      'D.Lgs. 23/2011 Art. 4 (Imposta di soggiorno)',
    data_categories: [
      'Dati identificativi degli ospiti (nome, cognome)',
      'Date di soggiorno e numero di pernottamenti',
      'Importo dell\'imposta applicata o motivo dell\'esenzione',
      'Dichiarazione di esenzione sottoscritta dall\'ospite (ove applicabile)',
    ],
    data_subjects: [
      'Ospiti della struttura ricettiva soggetti all\'imposta di soggiorno',
      'Ospiti esenti che producono documentazione per l\'esenzione',
    ],
    recipients: [
      'Comune competente per territorio',
      'Agenzia delle Entrate (in caso di accertamento)',
      'Revisore contabile / commercialista della struttura',
    ],
    retention_period: '5 anni dall\'anno di riferimento',
    retention_period_days: 1825,
    security_measures:
      'Registrazione digitale degli importi nel gestionale con accesso protetto. ' +
      'Conservazione delle dichiarazioni di esenzione firmate dagli ospiti. ' +
      'Riconciliazione periodica tra importi riscossi e versati.',
    dpia_required: false,
  },

  // -------------------------------------------------------------------------
  // 5. Electronic invoicing
  // -------------------------------------------------------------------------
  {
    activity_name: 'Fatturazione elettronica tramite Sistema di Interscambio (SDI)',
    purpose:
      'Emissione, trasmissione e conservazione delle fatture elettroniche ' +
      'tramite il Sistema di Interscambio dell\'Agenzia delle Entrate, ai sensi ' +
      'del D.P.R. 633/1972 e della normativa sulla fatturazione elettronica.',
    legal_basis:
      'Art. 6(1)(c) GDPR — Adempimento di un obbligo di legge + ' +
      'D.P.R. 633/1972 (Disciplina IVA) e Legge 205/2017 Art. 1 c. 909-928',
    data_categories: [
      'Dati identificativi del cliente (nome, cognome o ragione sociale)',
      'Codice fiscale e/o partita IVA del cliente',
      'Indirizzo di fatturazione',
      'Codice destinatario SDI o indirizzo PEC',
      'Dettaglio dei beni e servizi prestati con relativi importi',
    ],
    data_subjects: [
      'Ospiti che richiedono fattura',
      'Aziende e professionisti clienti della struttura',
      'Fornitori della struttura',
    ],
    recipients: [
      'Agenzia delle Entrate tramite Sistema di Interscambio (SDI)',
      'Destinatario della fattura (cliente)',
      'Commercialista / studio contabile della struttura',
      'Fornitore del servizio di conservazione sostitutiva',
    ],
    retention_period: '10 anni dalla data di emissione (Art. 2220 Codice Civile)',
    retention_period_days: 3650,
    security_measures:
      'Firma digitale delle fatture in formato XML. Trasmissione cifrata tramite ' +
      'SDI. Conservazione sostitutiva a norma presso fornitore accreditato AgID. ' +
      'Accesso al cassetto fiscale con credenziali Entratel/SPID.',
    dpia_required: false,
  },

  // -------------------------------------------------------------------------
  // 6. Anti-money laundering
  // -------------------------------------------------------------------------
  {
    activity_name: 'Adempimenti antiriciclaggio — Adeguata verifica della clientela',
    purpose:
      'Identificazione e verifica dell\'identita\' della clientela, conservazione ' +
      'dei dati e segnalazione di operazioni sospette ai sensi del D.Lgs. 231/2007, ' +
      'applicabile alle strutture ricettive per transazioni in contanti superiori ' +
      'alla soglia prevista dalla normativa.',
    legal_basis:
      'Art. 6(1)(c) GDPR — Adempimento di un obbligo di legge + ' +
      'D.Lgs. 231/2007 (Normativa antiriciclaggio) Art. 17-19 e Art. 31',
    data_categories: [
      'Dati identificativi del cliente (nome, cognome, data e luogo di nascita)',
      'Dati del documento di identita\' e codice fiscale',
      'Dati relativi ai mezzi di pagamento utilizzati',
      'Importo e natura delle operazioni effettuate',
      'Informazioni sulla finalita\' e natura del rapporto (ove richiesto)',
    ],
    data_subjects: [
      'Ospiti che effettuano pagamenti in contanti sopra la soglia di legge',
      'Titolari effettivi di societa\' che effettuano prenotazioni',
    ],
    recipients: [
      'UIF — Unita\' di Informazione Finanziaria (in caso di segnalazione di operazione sospetta)',
      'Guardia di Finanza (in caso di ispezione o accertamento)',
      'Commercialista / responsabile antiriciclaggio della struttura',
    ],
    retention_period: '10 anni dalla cessazione del rapporto (Art. 31 D.Lgs. 231/2007)',
    retention_period_days: 3650,
    security_measures:
      'Conservazione dei dati in archivio protetto con accesso limitato al ' +
      'responsabile antiriciclaggio. Registro delle operazioni superiori alla soglia. ' +
      'Procedure interne di adeguata verifica documentate. Formazione periodica ' +
      'del personale.',
    dpia_required: false,
  },

  // -------------------------------------------------------------------------
  // 7. Marketing communications
  // -------------------------------------------------------------------------
  {
    activity_name: 'Comunicazioni commerciali e di marketing diretto',
    purpose:
      'Invio di comunicazioni promozionali, newsletter, offerte speciali e ' +
      'informazioni sui servizi della struttura tramite email, SMS o altri canali ' +
      'di comunicazione, previo consenso esplicito dell\'interessato.',
    legal_basis: 'Art. 6(1)(a) GDPR — Consenso dell\'interessato',
    data_categories: [
      'Dati di contatto (email, telefono, indirizzo postale)',
      'Preferenze di comunicazione e interessi dichiarati',
      'Storico dei soggiorni e servizi utilizzati (per personalizzazione)',
      'Dati di interazione (apertura email, click, disiscrizione)',
    ],
    data_subjects: [
      'Ospiti che hanno prestato il consenso al marketing',
      'Utenti del sito web che si sono iscritti alla newsletter',
      'Contatti acquisiti tramite fiere ed eventi (con consenso)',
    ],
    recipients: [
      'Fornitore del servizio di email marketing (responsabile del trattamento)',
      'Fornitore del servizio SMS (responsabile del trattamento)',
      'Agenzie di comunicazione e marketing (ove incaricate)',
    ],
    retention_period:
      'Fino alla revoca del consenso. Raccomandazione Garante: max 24 mesi ' +
      'dall\'ultima interazione per marketing, 12 mesi per profilazione',
    retention_period_days: 730,
    security_measures:
      'Gestione centralizzata dei consensi con tracciamento completo (data, ora, ' +
      'IP, versione del testo). Procedura di disiscrizione (opt-out) in ogni ' +
      'comunicazione. Double opt-in per iscrizione alla newsletter. Separazione ' +
      'logica dei dati di marketing dai dati operativi.',
    dpia_required: false,
  },

  // -------------------------------------------------------------------------
  // 8. Video surveillance
  // -------------------------------------------------------------------------
  {
    activity_name: 'Videosorveglianza delle aree comuni',
    purpose:
      'Tutela del patrimonio aziendale, sicurezza degli ospiti e del personale, ' +
      'prevenzione di atti illeciti nelle aree comuni della struttura ricettiva ' +
      '(ingressi, parcheggi, corridoi, aree esterne). Le telecamere non sono ' +
      'installate in aree private (camere, bagni).',
    legal_basis:
      'Art. 6(1)(f) GDPR — Legittimo interesse del titolare + ' +
      'Provvedimento Garante 08/04/2010 e FAQ Garante 03/12/2020',
    data_categories: [
      'Immagini video degli individui presenti nelle aree videosorvegliate',
      'Data e ora della registrazione',
      'Identificativo della telecamera e posizione',
    ],
    data_subjects: [
      'Ospiti della struttura',
      'Personale dipendente e collaboratori',
      'Visitatori e fornitori',
      'Chiunque transiti nelle aree videosorvegliate',
    ],
    recipients: [
      'Personale autorizzato alla visione delle immagini (direzione, sicurezza)',
      'Autorita\' di Pubblica Sicurezza (su richiesta motivata)',
      'Autorita\' giudiziaria (su ordine)',
      'Fornitore del servizio di manutenzione dell\'impianto (con nomina a responsabile)',
    ],
    retention_period: '72 ore dalla registrazione (max 7 giorni in casi motivati)',
    retention_period_days: 3,
    security_measures:
      'Impianto conforme al Provvedimento Garante 08/04/2010. Cartelli informativi ' +
      '(Art. 13 GDPR) posizionati prima dell\'area videosorvegliata. Registrazioni ' +
      'conservate su NVR/DVR con accesso protetto da password. Cancellazione automatica ' +
      'dopo 72 ore. Nessuna telecamera in aree private. Informativa estesa disponibile ' +
      'presso la reception. Accordo sindacale o autorizzazione ITL ex Art. 4 L. 300/1970 ' +
      'per le aree di lavoro.',
    dpia_required: true,
  },

  // -------------------------------------------------------------------------
  // 9. Website cookies and analytics
  // -------------------------------------------------------------------------
  {
    activity_name: 'Cookie e analisi del traffico del sito web',
    purpose:
      'Raccolta e analisi dei dati di navigazione degli utenti del sito web ' +
      'della struttura per finalita\' statistiche, ottimizzazione dell\'esperienza ' +
      'utente e misurazione dell\'efficacia delle campagne di marketing online. ' +
      'I cookie tecnici non richiedono consenso; i cookie di profilazione e ' +
      'analitici di terze parti richiedono il consenso preventivo.',
    legal_basis:
      'Art. 6(1)(a) GDPR — Consenso dell\'interessato + ' +
      'Linee guida Garante cookie 10/06/2021 (Provvedimento n. 231)',
    data_categories: [
      'Indirizzo IP (anonimizzato ove possibile)',
      'Dati di navigazione (pagine visitate, durata, referrer)',
      'Identificatori univoci dei cookie',
      'Tipo di dispositivo, browser e sistema operativo',
      'Dati di geolocalizzazione approssimativa (da IP)',
    ],
    data_subjects: [
      'Visitatori del sito web della struttura',
      'Utenti che utilizzano il booking engine online',
    ],
    recipients: [
      'Fornitore del servizio di analytics (es. Google Analytics, Matomo)',
      'Fornitori di servizi pubblicitari (se attivi cookie di profilazione)',
      'Fornitore del servizio di hosting del sito web',
    ],
    retention_period:
      'Cookie tecnici: durata della sessione. Cookie analitici: max 13 mesi. ' +
      'Cookie di profilazione: max 12 mesi dal consenso (rinnovabile)',
    retention_period_days: 395,
    security_measures:
      'Cookie banner conforme alle Linee guida Garante 10/06/2021. Consenso ' +
      'granulare per categoria di cookie. Blocco preventivo dei cookie non tecnici ' +
      'fino al consenso. Registro dei consensi cookie con timestamp. Politica cookie ' +
      'dettagliata e accessibile. Anonimizzazione dell\'IP per i cookie analitici. ' +
      'Opzione di revoca del consenso facilmente accessibile.',
    dpia_required: false,
  },

  // -------------------------------------------------------------------------
  // 10. Staff management
  // -------------------------------------------------------------------------
  {
    activity_name: 'Gestione del personale dipendente e collaboratori',
    purpose:
      'Gestione del rapporto di lavoro con il personale dipendente e i ' +
      'collaboratori della struttura ricettiva, inclusa l\'amministrazione ' +
      'delle buste paga, la gestione dei turni, la formazione, la sicurezza ' +
      'sul lavoro e gli adempimenti previdenziali e fiscali.',
    legal_basis:
      'Art. 6(1)(b) GDPR — Esecuzione del contratto di lavoro + ' +
      'Art. 6(1)(c) GDPR per gli obblighi di legge del datore di lavoro',
    data_categories: [
      'Dati identificativi e anagrafici (nome, cognome, data di nascita, codice fiscale)',
      'Dati di contatto (indirizzo, telefono, email personale)',
      'Dati contrattuali (tipo di contratto, inquadramento, retribuzione)',
      'Dati previdenziali e fiscali (INPS, INAIL, CUD/CU)',
      'Dati relativi a presenze, ferie, permessi e malattie',
      'Dati bancari per l\'accredito dello stipendio (IBAN)',
      'Certificazioni e attestati di formazione (es. HACCP, sicurezza)',
    ],
    data_subjects: [
      'Personale dipendente a tempo indeterminato e determinato',
      'Collaboratori e lavoratori stagionali',
      'Tirocinanti e stagisti',
    ],
    recipients: [
      'Consulente del lavoro / studio paghe',
      'INPS — Istituto Nazionale della Previdenza Sociale',
      'INAIL — Istituto Nazionale per l\'Assicurazione contro gli Infortuni sul Lavoro',
      'Agenzia delle Entrate (CU, 770)',
      'Organismo di vigilanza e medico competente (per sicurezza sul lavoro)',
    ],
    retention_period:
      'Durata del rapporto di lavoro + 10 anni per i documenti fiscali e ' +
      'contributivi. Fino a 5 anni per i dati relativi alla sicurezza sul lavoro.',
    retention_period_days: 3650,
    security_measures:
      'Accesso ai dati del personale limitato alla direzione e all\'ufficio ' +
      'amministrativo. Fascicoli digitali del personale protetti da password e ' +
      'crittografia. Trasmissione sicura dei dati al consulente del lavoro. ' +
      'Separazione logica dei dati sanitari (idoneita\' lavorativa) dai dati ' +
      'amministrativi. Distruzione sicura dei documenti cartacei a fine conservazione.',
    dpia_required: false,
  },
]

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Art. 30 required fields for each processing activity.
 *
 * Per GDPR Art. 30(1), the register must contain:
 * (a) name and contact details of the controller — handled at export level
 * (b) purposes of the processing
 * (c) description of categories of data subjects and personal data
 * (d) categories of recipients
 * (e) transfers to third countries (not included here — assumed EEA only)
 * (f) time limits for erasure (retention periods)
 * (g) description of technical and organisational security measures
 */
const ART_30_REQUIRED_FIELDS: { field: keyof ProcessingActivityTemplate; label: string }[] = [
  { field: 'activity_name', label: 'Nome del trattamento (Art. 30(1))' },
  { field: 'purpose', label: 'Finalita\' del trattamento (Art. 30(1)(b))' },
  { field: 'legal_basis', label: 'Base giuridica del trattamento' },
  { field: 'data_categories', label: 'Categorie di dati personali (Art. 30(1)(c))' },
  { field: 'data_subjects', label: 'Categorie di interessati (Art. 30(1)(c))' },
  { field: 'recipients', label: 'Destinatari dei dati (Art. 30(1)(d))' },
  { field: 'retention_period', label: 'Termini di cancellazione (Art. 30(1)(f))' },
  { field: 'security_measures', label: 'Misure di sicurezza tecniche e organizzative (Art. 30(1)(g))' },
]

/**
 * Validate that a processing activity contains all Art. 30 mandatory fields.
 *
 * Checks for:
 * - Presence of all required fields
 * - Non-empty string values
 * - Non-empty arrays (for data_categories, data_subjects, recipients)
 *
 * Returns an object with `valid` (boolean) and `missing` (array of field
 * descriptions that are absent or empty).
 */
export function validateProcessingActivity(
  activity: Partial<ProcessingActivityTemplate>,
): { valid: boolean; missing: string[] } {
  const missing: string[] = []

  for (const { field, label } of ART_30_REQUIRED_FIELDS) {
    const value = activity[field]

    if (value === undefined || value === null) {
      missing.push(label)
      continue
    }

    if (typeof value === 'string' && value.trim().length === 0) {
      missing.push(label)
      continue
    }

    if (Array.isArray(value) && value.length === 0) {
      missing.push(label)
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  }
}

// ---------------------------------------------------------------------------
// Export for Garante inspection
// ---------------------------------------------------------------------------

/**
 * Export the processing activities register in a structured, human-readable
 * format suitable for presentation during a Garante per la Protezione dei
 * Dati Personali inspection.
 *
 * The output follows the format recommended by the Garante and includes:
 * - Organization identification (data controller)
 * - Date of register generation
 * - Complete listing of all processing activities with Art. 30 fields
 * - DPIA indicators where applicable
 *
 * Per GDPR Art. 30(4), the register must be made available to the
 * supervisory authority on request.
 */
export function exportRegisterForGarante(
  activities: ProcessingActivityTemplate[],
  organizationName: string,
): string {
  const generationDate = format(new Date(), 'dd/MM/yyyy')
  const separator = '='.repeat(72)
  const sectionSeparator = '-'.repeat(72)

  const lines: string[] = []

  // Header
  lines.push('REGISTRO DELLE ATTIVITA\' DI TRATTAMENTO')
  lines.push('ai sensi dell\'Art. 30 del Regolamento UE 2016/679 (GDPR)')
  lines.push('')
  lines.push(separator)
  lines.push('')
  lines.push(`Titolare del trattamento: ${organizationName}`)
  lines.push(`Data di generazione: ${generationDate}`)
  lines.push(`Numero di trattamenti registrati: ${activities.length}`)
  lines.push('')
  lines.push(separator)

  // Activities
  for (let i = 0; i < activities.length; i++) {
    const activity = activities[i]!
    const num = i + 1

    lines.push('')
    lines.push(`TRATTAMENTO N. ${num}`)
    lines.push(sectionSeparator)
    lines.push('')

    lines.push(`Nome del trattamento:`)
    lines.push(`  ${activity.activity_name}`)
    lines.push('')

    lines.push(`Finalita' del trattamento:`)
    lines.push(`  ${activity.purpose}`)
    lines.push('')

    lines.push(`Base giuridica:`)
    lines.push(`  ${activity.legal_basis}`)
    lines.push('')

    lines.push(`Categorie di dati personali trattati:`)
    for (const category of activity.data_categories) {
      lines.push(`  - ${category}`)
    }
    lines.push('')

    lines.push(`Categorie di interessati:`)
    for (const subject of activity.data_subjects) {
      lines.push(`  - ${subject}`)
    }
    lines.push('')

    lines.push(`Categorie di destinatari:`)
    for (const recipient of activity.recipients) {
      lines.push(`  - ${recipient}`)
    }
    lines.push('')

    lines.push(`Termini previsti per la cancellazione:`)
    lines.push(`  ${activity.retention_period}`)
    if (activity.retention_period_days > 0) {
      lines.push(`  (${activity.retention_period_days} giorni)`)
    }
    lines.push('')

    lines.push(`Misure di sicurezza tecniche e organizzative (Art. 32 GDPR):`)
    lines.push(`  ${activity.security_measures}`)
    lines.push('')

    lines.push(`Valutazione d'impatto (DPIA) richiesta (Art. 35 GDPR):`)
    lines.push(`  ${activity.dpia_required ? 'SI\' — Valutazione d\'impatto necessaria' : 'NO'}`)

    if (i < activities.length - 1) {
      lines.push('')
      lines.push(separator)
    }
  }

  // Footer
  lines.push('')
  lines.push(separator)
  lines.push('')
  lines.push('DICHIARAZIONE DEL TITOLARE DEL TRATTAMENTO')
  lines.push('')
  lines.push(
    `Il sottoscritto, in qualita\' di legale rappresentante di ${organizationName}, ` +
    'dichiara che il presente registro delle attivita\' di trattamento e\' stato redatto ' +
    'ai sensi dell\'Art. 30 del Regolamento UE 2016/679 (GDPR) e riflette fedelmente ' +
    'le attivita\' di trattamento dei dati personali effettuate dalla struttura.',
  )
  lines.push('')
  lines.push(
    'Il presente registro e\' soggetto a revisione periodica e viene aggiornato in ' +
    'occasione di ogni modifica significativa alle attivita\' di trattamento.',
  )
  lines.push('')
  lines.push(`Data: ${generationDate}`)
  lines.push(`Titolare: ${organizationName}`)
  lines.push('')
  lines.push(separator)

  return lines.join('\n')
}
