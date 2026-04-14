/**
 * GDPR Compliance Utilities
 *
 * Implements core GDPR (Regolamento UE 2016/679) compliance functions for
 * the Italian accommodation market. Covers consent management, data portability
 * (Art. 20), right to erasure (Art. 17), and data retention policies per
 * Italian law.
 *
 * Key regulations:
 * - GDPR (Regolamento UE 2016/679)
 * - D.Lgs. 196/2003 (Codice Privacy) as amended by D.Lgs. 101/2018
 * - Art. 2220 Codice Civile (retention of accounting records)
 * - Art. 109 TULPS (Alloggiati / police registration obligations)
 * - D.Lgs. 231/2007 (antiriciclaggio / anti-money laundering)
 * - PSD2 (Direttiva UE 2015/2366) for payment data
 * - Provvedimento Garante Privacy 24/11/2016 (videosorveglianza)
 */

import { format } from 'date-fns'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GDPRConsentRecord {
  guest_id: string
  timestamp: string
  ip_address: string | null
  consents: {
    type: 'privacy_policy' | 'marketing' | 'profiling' | 'third_party'
    granted: boolean
    text_version: string
  }[]
}

export interface DeletionPlan {
  guest_id: string
  can_delete: { table: string; description: string }[]
  must_retain: { table: string; description: string; retention_until: string; legal_basis: string }[]
  anonymize: { table: string; fields: string[]; description: string }[]
}

export interface RetentionPeriod {
  data_type: string
  retention_years: number
  legal_basis: string
  description: string
}

export interface GDPRGuestData {
  guest_id: string
  profile: {
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
    mobile: string | null
    date_of_birth: string | null
    gender: string | null
    address: string | null
    city: string | null
    province: string | null
    zip: string | null
    country: string | null
    nationality: string | null
    citizenship: string | null
    fiscal_code: string | null
    document_type: string | null
    document_number: string | null
    document_country: string | null
    company_name: string | null
    company_vat: string | null
    preferences: Record<string, unknown>
    tags: string[]
    loyalty_level: string | null
    loyalty_points: number
    created_at: string
    updated_at: string
  }
  reservations: {
    reservation_code: string
    check_in: string
    check_out: string
    status: string
    room_type: string | null
    adults: number
    children: number
    total_amount: number
    source: string
    created_at: string
  }[]
  invoices: {
    invoice_number: string
    invoice_date: string
    invoice_type: string
    total: number
    payment_status: string
  }[]
  payments: {
    payment_date: string
    amount: number
    payment_method: string
    description: string | null
  }[]
  communications: {
    date: string
    channel: string
    subject: string | null
    direction: 'inbound' | 'outbound'
  }[]
  consent_records: {
    timestamp: string
    type: string
    granted: boolean
    text_version: string
  }[]
  police_registrations: {
    registration_date: string
    status: string
  }[]
  tourist_tax_records: {
    tax_date: string
    amount: number
    is_exempt: boolean
  }[]
}

export interface GDPROrganization {
  name: string
  legal_name: string | null
  vat_number: string | null
  address: string | null
  city: string | null
  province: string | null
  zip: string | null
  country: string
  email: string | null
  phone: string | null
  pec: string | null
  website: string | null
}

// ---------------------------------------------------------------------------
// Consent record generation
// ---------------------------------------------------------------------------

/**
 * Create a timestamped, immutable consent record for GDPR compliance.
 *
 * Per GDPR Art. 7(1), the data controller must be able to demonstrate that
 * the data subject has given consent. This function creates a record that
 * captures all necessary evidence.
 *
 * Each consent record is immutable — new consent events create new records
 * rather than updating existing ones, preserving the full audit trail.
 */
export function generatePrivacyConsentRecord(
  guestId: string,
  consents: {
    type: 'privacy_policy' | 'marketing' | 'profiling' | 'third_party'
    granted: boolean
    text_version: string
  }[],
  ipAddress?: string | null,
): GDPRConsentRecord {
  return {
    guest_id: guestId,
    timestamp: new Date().toISOString(),
    ip_address: ipAddress ?? null,
    consents: consents.map(c => ({
      type: c.type,
      granted: c.granted,
      text_version: c.text_version,
    })),
  }
}

// ---------------------------------------------------------------------------
// Data export (Art. 20 — Right to data portability)
// ---------------------------------------------------------------------------

/**
 * Export all guest data in a machine-readable JSON format.
 *
 * GDPR Art. 20 requires that data subjects can receive their personal data
 * "in a structured, commonly used and machine-readable format." This function
 * produces a comprehensive JSON export of ALL personal data held about a guest.
 *
 * The export includes:
 * - Profile and personal information
 * - Reservation history
 * - Invoices and payment records
 * - Communications
 * - Consent history
 * - Police registrations (schedine alloggiati)
 * - Tourist tax records
 *
 * Note: The controller must respond within 30 days of the request (Art. 12(3)).
 */
export function generateDataExport(guestData: GDPRGuestData): string {
  const exportData = {
    _metadata: {
      export_format: 'GDPR Art. 20 Data Portability Export',
      export_date: new Date().toISOString(),
      data_subject_id: guestData.guest_id,
      format_version: '1.0',
      encoding: 'UTF-8',
      description: 'Esportazione completa dei dati personali ai sensi dell\'Art. 20 del Regolamento UE 2016/679 (GDPR)',
    },
    personal_data: {
      profile: guestData.profile,
    },
    reservation_history: guestData.reservations,
    financial_data: {
      invoices: guestData.invoices,
      payments: guestData.payments,
    },
    communications: guestData.communications,
    consent_history: guestData.consent_records,
    regulatory_data: {
      police_registrations: guestData.police_registrations,
      tourist_tax_records: guestData.tourist_tax_records,
    },
  }

  return JSON.stringify(exportData, null, 2)
}

// ---------------------------------------------------------------------------
// Data deletion plan (Art. 17 — Right to erasure)
// ---------------------------------------------------------------------------

/**
 * Legal retention periods per Italian law.
 * These override the guest's right to erasure where a legal obligation exists.
 */
const LEGAL_RETENTION_YEARS: Record<string, { years: number; basis: string }> = {
  invoices: {
    years: 10,
    basis: 'Art. 2220 Codice Civile — Conservazione delle scritture contabili',
  },
  payments: {
    years: 10,
    basis: 'Art. 2220 Codice Civile — Conservazione delle scritture contabili',
  },
  police_registrations: {
    years: 5,
    basis: 'Art. 109 TULPS — Registro degli alloggiati',
  },
  tourist_tax_records: {
    years: 5,
    basis: 'D.Lgs. 23/2011 Art. 4 — Documentazione imposta di soggiorno',
  },
  fiscal_data: {
    years: 10,
    basis: 'Art. 43 D.P.R. 600/1973 — Termini di accertamento fiscale',
  },
  anti_money_laundering: {
    years: 10,
    basis: 'D.Lgs. 231/2007 Art. 31 — Obblighi di conservazione antiriciclaggio',
  },
}

/**
 * Generate a data deletion plan that respects both the guest's right to erasure
 * (GDPR Art. 17) and legal retention obligations under Italian law.
 *
 * The plan categorizes data into three groups:
 * 1. **can_delete**: Data that can be immediately deleted
 * 2. **must_retain**: Data that must be retained due to legal obligations
 * 3. **anonymize**: Data that cannot be deleted but can be anonymized
 *
 * Per GDPR Art. 17(3)(b), the right to erasure does not apply where processing
 * is necessary for compliance with a legal obligation under Union or Member
 * State law.
 */
export function generateDataDeletionPlan(guestId: string): DeletionPlan {
  const now = new Date()

  function retentionDate(years: number): string {
    const d = new Date(now)
    d.setFullYear(d.getFullYear() + years)
    return format(d, 'yyyy-MM-dd')
  }

  return {
    guest_id: guestId,

    can_delete: [
      {
        table: 'guests.preferences',
        description: 'Preferenze personali dell\'ospite (allergie, preferenze camera, ecc.)',
      },
      {
        table: 'guests.tags',
        description: 'Tag e classificazioni interne dell\'ospite',
      },
      {
        table: 'guests.internal_notes',
        description: 'Note interne del personale relative all\'ospite',
      },
      {
        table: 'guests.loyalty_points',
        description: 'Punti fedelta\' accumulati',
      },
      {
        table: 'guests.loyalty_level',
        description: 'Livello del programma fedelta\'',
      },
      {
        table: 'guests.marketing_consent',
        description: 'Consenso marketing (revocabile in qualsiasi momento)',
      },
      {
        table: 'guests.document_scan_url',
        description: 'Scansione del documento di identita\' (conservare solo il riferimento nel registro alloggiati)',
      },
      {
        table: 'message_templates (sent messages)',
        description: 'Comunicazioni di marketing inviate all\'ospite',
      },
    ],

    must_retain: [
      {
        table: 'invoices',
        description: 'Fatture e documenti fiscali emessi',
        retention_until: retentionDate(LEGAL_RETENTION_YEARS.invoices!.years),
        legal_basis: LEGAL_RETENTION_YEARS.invoices!.basis,
      },
      {
        table: 'payments',
        description: 'Registrazioni dei pagamenti ricevuti',
        retention_until: retentionDate(LEGAL_RETENTION_YEARS.payments!.years),
        legal_basis: LEGAL_RETENTION_YEARS.payments!.basis,
      },
      {
        table: 'police_registrations',
        description: 'Schedine alloggiati inviate alla Questura',
        retention_until: retentionDate(LEGAL_RETENTION_YEARS.police_registrations!.years),
        legal_basis: LEGAL_RETENTION_YEARS.police_registrations!.basis,
      },
      {
        table: 'tourist_tax_records',
        description: 'Registrazioni dell\'imposta di soggiorno',
        retention_until: retentionDate(LEGAL_RETENTION_YEARS.tourist_tax_records!.years),
        legal_basis: LEGAL_RETENTION_YEARS.tourist_tax_records!.basis,
      },
      {
        table: 'guests (fiscal fields)',
        description: 'Codice fiscale e dati di fatturazione (necessari per i documenti fiscali conservati)',
        retention_until: retentionDate(LEGAL_RETENTION_YEARS.fiscal_data!.years),
        legal_basis: LEGAL_RETENTION_YEARS.fiscal_data!.basis,
      },
      {
        table: 'audit_logs',
        description: 'Log di audit delle operazioni effettuate (necessari per accountability GDPR Art. 5(2))',
        retention_until: retentionDate(5),
        legal_basis: 'GDPR Art. 5(2) — Principio di responsabilizzazione (accountability)',
      },
    ],

    anonymize: [
      {
        table: 'guests',
        fields: [
          'first_name', 'last_name', 'email', 'phone', 'mobile',
          'date_of_birth', 'gender', 'address', 'city', 'province', 'zip',
          'birth_place', 'birth_province', 'birth_country',
          'document_number', 'document_issued_by',
          'company_name', 'company_pec',
        ],
        description: 'Dati anagrafici dell\'ospite — anonimizzati mantenendo l\'ID per integrita\' referenziale',
      },
      {
        table: 'reservations',
        fields: ['special_requests', 'internal_notes', 'group_name'],
        description: 'Richieste speciali e note delle prenotazioni contenenti dati personali',
      },
      {
        table: 'folio_charges',
        fields: ['notes'],
        description: 'Note sui conti che potrebbero contenere riferimenti personali',
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Privacy notice (Art. 13-14)
// ---------------------------------------------------------------------------

/**
 * Generate a legally compliant Italian privacy notice (informativa privacy)
 * per GDPR Articles 13 and 14.
 *
 * The notice is customized with the organization's data and covers all
 * processing activities typical of an Italian accommodation facility.
 *
 * This text is intended as a comprehensive template. Legal review by a
 * qualified DPO/privacy counsel is recommended before deployment.
 */
export function generatePrivacyNoticeText(organization: GDPROrganization): string {
  const orgName = organization.legal_name ?? organization.name
  const orgAddress = [
    organization.address,
    organization.zip,
    organization.city,
    organization.province ? `(${organization.province})` : null,
  ].filter(Boolean).join(' ')

  const contactInfo = [
    organization.email ? `Email: ${organization.email}` : null,
    organization.pec ? `PEC: ${organization.pec}` : null,
    organization.phone ? `Tel: ${organization.phone}` : null,
  ].filter(Boolean).join(' | ')

  return `INFORMATIVA SUL TRATTAMENTO DEI DATI PERSONALI
ai sensi degli artt. 13 e 14 del Regolamento UE 2016/679 (GDPR)
e del D.Lgs. 196/2003 come modificato dal D.Lgs. 101/2018

${'='.repeat(72)}

1. TITOLARE DEL TRATTAMENTO

Il Titolare del trattamento dei dati personali e':
${orgName}
${orgAddress ? `Sede: ${orgAddress}` : ''}
${organization.vat_number ? `P.IVA: ${organization.vat_number}` : ''}
${contactInfo}
${organization.website ? `Sito web: ${organization.website}` : ''}

2. DATI PERSONALI OGGETTO DEL TRATTAMENTO

Il Titolare tratta le seguenti categorie di dati personali:

a) Dati identificativi e di contatto: nome, cognome, data e luogo di
   nascita, codice fiscale, indirizzo, email, telefono, dati del documento
   di identita'.

b) Dati relativi al soggiorno: date di arrivo e partenza, tipologia di
   camera, numero di ospiti, richieste speciali, preferenze.

c) Dati fiscali e di fatturazione: partita IVA, codice fiscale, ragione
   sociale, codice SDI, indirizzo PEC, dati di pagamento.

d) Dati di navigazione: indirizzo IP, dati di log, cookie tecnici e
   analitici (se applicabile).

3. FINALITA' E BASE GIURIDICA DEL TRATTAMENTO

I dati personali sono trattati per le seguenti finalita':

a) ESECUZIONE DEL CONTRATTO (Art. 6(1)(b) GDPR)
   - Gestione della prenotazione e del soggiorno
   - Erogazione dei servizi richiesti
   - Comunicazioni relative alla prenotazione
   - Gestione dei pagamenti e del conto

b) ADEMPIMENTO DI OBBLIGHI DI LEGGE (Art. 6(1)(c) GDPR)
   - Comunicazione alla Questura dei dati degli alloggiati ai sensi
     dell'Art. 109 del TULPS (R.D. 18 giugno 1931, n. 773)
   - Rilevazione statistica ISTAT ai sensi del D.Lgs. 322/1989
   - Riscossione e versamento dell'imposta di soggiorno ai sensi del
     D.Lgs. 23/2011
   - Emissione di fatture e documenti fiscali ai sensi del D.P.R.
     633/1972
   - Conservazione delle scritture contabili ai sensi dell'Art. 2220
     del Codice Civile
   - Obblighi antiriciclaggio ai sensi del D.Lgs. 231/2007

c) LEGITTIMO INTERESSE DEL TITOLARE (Art. 6(1)(f) GDPR)
   - Prevenzione delle frodi e sicurezza della struttura
   - Miglioramento della qualita' dei servizi offerti
   - Gestione dei reclami e del contenzioso

d) CONSENSO DELL'INTERESSATO (Art. 6(1)(a) GDPR)
   - Invio di comunicazioni commerciali e promozionali
   - Profilazione per offerte personalizzate
   - Comunicazione dei dati a terzi per finalita' di marketing

4. MODALITA' DEL TRATTAMENTO

Il trattamento dei dati personali e' effettuato mediante strumenti
informatici e/o cartacei, con logiche strettamente correlate alle
finalita' sopra indicate e, comunque, in modo da garantire la sicurezza
e la riservatezza dei dati stessi, nel rispetto dei principi di
liceita', correttezza, trasparenza, limitazione delle finalita',
minimizzazione, esattezza, limitazione della conservazione, integrita'
e riservatezza (Art. 5 GDPR).

5. PERIODO DI CONSERVAZIONE DEI DATI

I dati personali saranno conservati per i seguenti periodi:

- Dati contrattuali e di soggiorno: per la durata del rapporto
  contrattuale e successivamente per il periodo necessario ad
  adempiere agli obblighi di legge.

- Fatture e documenti contabili: 10 anni dalla data di emissione
  (Art. 2220 Codice Civile).

- Schedine alloggiati: 5 anni dalla data di registrazione
  (Art. 109 TULPS).

- Dati relativi all'imposta di soggiorno: 5 anni dall'anno di
  riferimento (D.Lgs. 23/2011).

- Dati per finalita' di marketing: fino alla revoca del consenso.

- Dati per finalita' di profilazione: fino alla revoca del consenso.

- Dati di pagamento: per il periodo richiesto dalla normativa PSD2
  e antiriciclaggio.

6. COMUNICAZIONE E TRASFERIMENTO DEI DATI

I dati personali potranno essere comunicati a:

- Autorita' di Pubblica Sicurezza (Questura) per gli adempimenti di
  cui all'Art. 109 TULPS
- ISTAT per le rilevazioni statistiche obbligatorie
- Comune per l'imposta di soggiorno
- Agenzia delle Entrate e Sistema di Interscambio (SDI) per la
  fatturazione elettronica
- Istituti bancari e circuiti di pagamento per l'elaborazione dei
  pagamenti
- Fornitori di servizi informatici (responsabili del trattamento ex
  Art. 28 GDPR) per la gestione del sistema gestionale
- Portali di prenotazione online (OTA) limitatamente ai dati
  necessari alla gestione della prenotazione

I dati non saranno trasferiti al di fuori dello Spazio Economico
Europeo (SEE) salvo che non sussistano adeguate garanzie ai sensi
degli artt. 44-49 del GDPR.

7. DIRITTI DELL'INTERESSATO

L'interessato ha il diritto di:

a) Accesso (Art. 15): ottenere conferma dell'esistenza di un
   trattamento e accedere ai propri dati personali.

b) Rettifica (Art. 16): ottenere la correzione dei dati inesatti
   o l'integrazione dei dati incompleti.

c) Cancellazione (Art. 17): ottenere la cancellazione dei propri
   dati, salvo i casi di cui all'Art. 17(3) (obblighi di legge).

d) Limitazione (Art. 18): ottenere la limitazione del trattamento
   nei casi previsti dalla norma.

e) Portabilita' (Art. 20): ricevere i propri dati in formato
   strutturato, di uso comune e leggibile da dispositivo automatico.

f) Opposizione (Art. 21): opporsi al trattamento basato sul
   legittimo interesse, compresa la profilazione.

g) Revoca del consenso (Art. 7(3)): revocare in qualsiasi momento
   il consenso prestato, senza pregiudicare la liceita' del
   trattamento basato sul consenso prima della revoca.

Per esercitare i propri diritti, l'interessato puo' contattare il
Titolare ai recapiti sopra indicati.

L'interessato ha inoltre il diritto di proporre reclamo al Garante
per la Protezione dei Dati Personali (www.garanteprivacy.it).

8. CONFERIMENTO DEI DATI

Il conferimento dei dati identificativi e del documento di identita'
e' obbligatorio ai sensi dell'Art. 109 TULPS per la registrazione
degli alloggiati. Il rifiuto di conferire tali dati comporta
l'impossibilita' di procedere alla registrazione e, pertanto,
all'erogazione del servizio di alloggio.

Il conferimento dei dati per finalita' di marketing e profilazione
e' facoltativo. Il mancato conferimento non pregiudica l'erogazione
del servizio.

9. PROCESSO DECISIONALE AUTOMATIZZATO

Il Titolare non adotta processi decisionali automatizzati, compresa
la profilazione, che producano effetti giuridici per l'interessato
o che incidano in modo analogo significativamente sulla sua persona
(Art. 22 GDPR).

${'='.repeat(72)}

Ultima revisione: ${format(new Date(), 'dd/MM/yyyy')}
${orgName}`
}

// ---------------------------------------------------------------------------
// Retention periods
// ---------------------------------------------------------------------------

/**
 * Return the data retention periods applicable to an Italian accommodation
 * facility per current Italian and EU law.
 *
 * These periods represent the legal minimum retention obligations. Data
 * should be deleted or anonymized when the retention period expires, unless
 * the data subject has given consent for continued processing.
 */
export function getRetentionPeriods(): RetentionPeriod[] {
  return [
    {
      data_type: 'Fatture e documenti contabili',
      retention_years: 10,
      legal_basis: 'Art. 2220 Codice Civile',
      description:
        'Le scritture contabili, le fatture e i documenti fiscali devono essere conservati ' +
        'per dieci anni dalla data dell\'ultima registrazione. Questo include fatture emesse ' +
        'e ricevute, registri IVA, libro giornale e documenti correlati.',
    },
    {
      data_type: 'Registrazioni alloggiati (Schedine PS)',
      retention_years: 5,
      legal_basis: 'Art. 109 TULPS (R.D. 773/1931) e Art. 7 D.M. 7/1/2017',
      description:
        'I dati delle schedine alloggiati trasmesse alla Questura devono essere conservati ' +
        'per cinque anni. Questo include i dati identificativi degli ospiti, i documenti di ' +
        'identita\' e le date di soggiorno.',
    },
    {
      data_type: 'Dati personali degli ospiti',
      retention_years: -1, // Variable
      legal_basis: 'GDPR Art. 5(1)(e) e Art. 17',
      description:
        'I dati personali degli ospiti sono conservati fino alla revoca del consenso, salvo ' +
        'che sussistano obblighi legali di conservazione (es. dati fiscali per 10 anni, ' +
        'schedine alloggiati per 5 anni). Al termine del periodo di conservazione legale, ' +
        'i dati devono essere cancellati o anonimizzati.',
    },
    {
      data_type: 'Dati per marketing e comunicazioni commerciali',
      retention_years: -1, // Until consent withdrawn
      legal_basis: 'GDPR Art. 6(1)(a) e Art. 7 — Provvedimento Garante 15/05/2013',
      description:
        'I dati trattati per finalita\' di marketing diretto sono conservati fino alla ' +
        'revoca del consenso da parte dell\'interessato. Il Garante italiano ha indicato ' +
        'come ragionevole un periodo massimo di 24 mesi dall\'ultima interazione per il ' +
        'marketing e 12 mesi per la profilazione, salvo rinnovo del consenso.',
    },
    {
      data_type: 'Registrazioni imposta di soggiorno',
      retention_years: 5,
      legal_basis: 'D.Lgs. 23/2011 Art. 4 e normativa tributaria locale',
      description:
        'La documentazione relativa all\'imposta di soggiorno, inclusi i dettagli delle ' +
        'esenzioni e dei versamenti, deve essere conservata per cinque anni dalla data ' +
        'di riferimento, in linea con i termini di accertamento tributario.',
    },
    {
      data_type: 'Dati di pagamento',
      retention_years: 10,
      legal_basis: 'PSD2 (Direttiva UE 2015/2366) e D.Lgs. 231/2007',
      description:
        'I dati relativi alle transazioni di pagamento devono essere conservati in ' +
        'conformita\' alla normativa PSD2 e agli obblighi antiriciclaggio. I dati ' +
        'sensibili delle carte (PAN completo, CVV, PIN) non devono mai essere conservati. ' +
        'I riferimenti alle transazioni e le ricevute devono essere conservati per almeno ' +
        '10 anni.',
    },
    {
      data_type: 'Report statistici ISTAT',
      retention_years: 5,
      legal_basis: 'D.Lgs. 322/1989 — Sistema statistico nazionale',
      description:
        'I dati aggregati dei report ISTAT (modello C/59) e la documentazione di ' +
        'supporto devono essere conservati per cinque anni dalla data di trasmissione.',
    },
    {
      data_type: 'Log di audit e accessi',
      retention_years: 5,
      legal_basis: 'GDPR Art. 5(2) e Provvedimento Garante 27/11/2008 (amministratori di sistema)',
      description:
        'I log degli accessi e delle operazioni effettuate sui dati personali devono ' +
        'essere conservati per un periodo adeguato a dimostrare la conformita\' al GDPR. ' +
        'Il Garante richiede la conservazione dei log degli amministratori di sistema per ' +
        'almeno 6 mesi. Si consiglia la conservazione per 5 anni per finalita\' di ' +
        'accountability.',
    },
    {
      data_type: 'Videosorveglianza',
      retention_years: 0, // Special: 24-72 hours typically
      legal_basis: 'Provvedimento Garante 08/04/2010 e FAQ Garante 03/12/2020',
      description:
        'Le immagini di videosorveglianza devono essere cancellate entro 24-72 ore dalla ' +
        'registrazione, salvo specifica richiesta dell\'autorita\' giudiziaria o esigenze ' +
        'investigative concrete. Periodi piu\' lunghi (fino a 7 giorni) sono ammessi solo ' +
        'in casi motivati e documentati.',
    },
  ]
}
