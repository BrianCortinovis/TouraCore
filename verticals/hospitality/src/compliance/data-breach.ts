/**
 * Data Breach Management
 *
 * Implements data breach detection, assessment, and notification workflows
 * per GDPR Art. 33-34 for the Italian accommodation market. Covers the
 * 72-hour notification obligation to the Garante per la Protezione dei
 * Dati Personali and the assessment of whether data subjects must be
 * notified.
 *
 * Key regulations:
 * - GDPR Art. 33 (Notifica di una violazione all'autorita' di controllo)
 * - GDPR Art. 34 (Comunicazione di una violazione all'interessato)
 * - GDPR Art. 4(12) (Definizione di violazione dei dati personali)
 * - Linee guida WP250 rev.01 — Notifica delle violazioni dei dati personali
 * - Provvedimento Garante Privacy del 30/07/2019 — Procedura telematica
 *   per la notifica delle violazioni dei dati personali
 * - D.Lgs. 196/2003 Art. 166 (Sanzioni)
 */

import { format } from 'date-fns'
import type { BreachSeverity, DataBreach } from '../types/database'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** GDPR Art. 33(1) notification deadline: 72 hours from detection. */
const NOTIFICATION_DEADLINE_HOURS = 72

/** Sensitive data categories per GDPR Art. 9 and Art. 10. */
const SENSITIVE_DATA_CATEGORIES = [
  'dati sanitari',
  'dati biometrici',
  'dati genetici',
  'origine razziale o etnica',
  'opinioni politiche',
  'convinzioni religiose',
  'appartenenza sindacale',
  'vita sessuale',
  'orientamento sessuale',
  'dati giudiziari',
  'dati penali',
]

/** Financial data categories requiring heightened attention. */
const FINANCIAL_DATA_CATEGORIES = [
  'dati di pagamento',
  'dati bancari',
  'carte di credito',
  'carte di pagamento',
  'IBAN',
  'dati fiscali',
]

// ---------------------------------------------------------------------------
// Notification deadline (Art. 33(1))
// ---------------------------------------------------------------------------

/**
 * Calculate the 72-hour notification deadline for the Garante per la
 * Protezione dei Dati Personali per GDPR Art. 33(1).
 *
 * The regulation requires notification "without undue delay and, where
 * feasible, not later than 72 hours after having become aware of it."
 * If the notification is not made within 72 hours, it must be accompanied
 * by reasons for the delay (Art. 33(1)).
 */
export function calculateNotificationDeadline(detectedAt: Date): {
  deadline: Date
  hoursRemaining: number
  isOverdue: boolean
} {
  const deadline = new Date(detectedAt.getTime() + NOTIFICATION_DEADLINE_HOURS * 60 * 60 * 1000)
  const now = new Date()
  const msRemaining = deadline.getTime() - now.getTime()
  const hoursRemaining = Math.max(0, msRemaining / (1000 * 60 * 60))

  return {
    deadline,
    hoursRemaining: Math.round(hoursRemaining * 100) / 100,
    isOverdue: now > deadline,
  }
}

// ---------------------------------------------------------------------------
// Severity assessment
// ---------------------------------------------------------------------------

/**
 * Auto-assess breach severity based on the nature and scope of the breach.
 *
 * The assessment follows the ENISA severity assessment methodology and
 * the WP250 rev.01 guidelines. Factors considered:
 * - Number of records and data subjects affected
 * - Categories of data involved (especially Art. 9 special categories)
 * - Type of breach (confidentiality, integrity, availability)
 *
 * Returns a severity level that determines the notification obligations
 * and response urgency.
 */
export function assessSeverity(params: {
  recordsAffected: number
  subjectsAffected: number
  dataCategories: string[]
  breachType: string[]
}): BreachSeverity {
  let score = 0

  // --- Scope scoring (number of subjects/records) ---

  if (params.subjectsAffected > 10000 || params.recordsAffected > 100000) {
    score += 4
  } else if (params.subjectsAffected > 1000 || params.recordsAffected > 10000) {
    score += 3
  } else if (params.subjectsAffected > 100 || params.recordsAffected > 1000) {
    score += 2
  } else if (params.subjectsAffected > 0 || params.recordsAffected > 0) {
    score += 1
  }

  // --- Data sensitivity scoring ---

  const categoriesLower = params.dataCategories.map(c => c.toLowerCase())

  const hasSensitiveData = categoriesLower.some(cat =>
    SENSITIVE_DATA_CATEGORIES.some(sc => cat.includes(sc)),
  )
  if (hasSensitiveData) {
    score += 4
  }

  const hasFinancialData = categoriesLower.some(cat =>
    FINANCIAL_DATA_CATEGORIES.some(fc => cat.includes(fc)),
  )
  if (hasFinancialData) {
    score += 3
  }

  const hasIdentityDocuments = categoriesLower.some(cat =>
    cat.includes('documento') || cat.includes('passaporto') || cat.includes('carta d\'identita'),
  )
  if (hasIdentityDocuments) {
    score += 2
  }

  // --- Breach type scoring ---

  const typesLower = params.breachType.map(t => t.toLowerCase())

  if (typesLower.some(t => t.includes('confidentiality') || t.includes('riservatezza'))) {
    score += 2
  }
  if (typesLower.some(t => t.includes('integrity') || t.includes('integrita'))) {
    score += 2
  }
  if (typesLower.some(t => t.includes('availability') || t.includes('disponibilita'))) {
    score += 1
  }

  // --- Map score to severity ---

  if (score >= 10) return 'critical'
  if (score >= 6) return 'high'
  if (score >= 3) return 'medium'
  return 'low'
}

// ---------------------------------------------------------------------------
// Subject notification assessment (Art. 34)
// ---------------------------------------------------------------------------

/**
 * Determine whether notification to data subjects is required per
 * GDPR Art. 34.
 *
 * Art. 34(1) requires communication to the data subject when the breach
 * "is likely to result in a high risk to the rights and freedoms of
 * natural persons." This assessment considers the severity level and the
 * nature of the data categories involved.
 *
 * Art. 34(3) provides exemptions when:
 * (a) Appropriate technical measures were applied (e.g., encryption)
 * (b) Subsequent measures ensure the high risk is no longer likely
 * (c) It would involve disproportionate effort (public communication instead)
 */
export function isSubjectNotificationRequired(
  severity: string,
  dataCategories: string[],
): { required: boolean; reason: string } {
  const categoriesLower = dataCategories.map(c => c.toLowerCase())

  const hasSensitiveData = categoriesLower.some(cat =>
    SENSITIVE_DATA_CATEGORIES.some(sc => cat.includes(sc)),
  )

  const hasFinancialData = categoriesLower.some(cat =>
    FINANCIAL_DATA_CATEGORIES.some(fc => cat.includes(fc)),
  )

  const hasIdentityDocuments = categoriesLower.some(cat =>
    cat.includes('documento') || cat.includes('passaporto') || cat.includes('carta d\'identita'),
  )

  // Critical severity always requires notification
  if (severity === 'critical') {
    return {
      required: true,
      reason: 'Gravita\' critica — la violazione comporta un rischio elevato per i diritti ' +
        'e le liberta\' degli interessati. Notifica obbligatoria ai sensi dell\'Art. 34(1) GDPR.',
    }
  }

  // High severity with sensitive or financial data
  if (severity === 'high' && (hasSensitiveData || hasFinancialData)) {
    return {
      required: true,
      reason: 'Gravita\' elevata con coinvolgimento di dati ' +
        (hasSensitiveData ? 'particolari (Art. 9 GDPR)' : 'finanziari') +
        '. Rischio elevato per gli interessati — notifica obbligatoria ai sensi dell\'Art. 34(1) GDPR.',
    }
  }

  // High severity with identity documents (risk of identity theft)
  if (severity === 'high' && hasIdentityDocuments) {
    return {
      required: true,
      reason: 'Gravita\' elevata con coinvolgimento di documenti di identita\'. Rischio di ' +
        'furto d\'identita\' — notifica obbligatoria ai sensi dell\'Art. 34(1) GDPR.',
    }
  }

  // High severity without special categories may still require notification
  if (severity === 'high') {
    return {
      required: true,
      reason: 'Gravita\' elevata — si raccomanda la notifica agli interessati per il principio ' +
        'di trasparenza. Valutare l\'applicabilita\' delle esenzioni di cui all\'Art. 34(3) GDPR.',
    }
  }

  // Medium severity with sensitive data
  if (severity === 'medium' && hasSensitiveData) {
    return {
      required: true,
      reason: 'Coinvolgimento di categorie particolari di dati (Art. 9 GDPR). Nonostante la ' +
        'gravita\' media, la natura dei dati comporta un rischio elevato per gli interessati.',
    }
  }

  // Medium severity with financial or identity data
  if (severity === 'medium' && (hasFinancialData || hasIdentityDocuments)) {
    return {
      required: true,
      reason: 'Coinvolgimento di dati ' +
        (hasFinancialData ? 'finanziari' : 'di documenti di identita\'') +
        '. Si raccomanda la notifica agli interessati per prevenire danni patrimoniali o furto di identita\'.',
    }
  }

  // Medium severity without special data
  if (severity === 'medium') {
    return {
      required: false,
      reason: 'Gravita\' media senza coinvolgimento di dati particolari, finanziari o documenti ' +
        'di identita\'. La notifica agli interessati non e\' obbligatoria, ma il Titolare puo\' ' +
        'comunque decidere di procedere per trasparenza.',
    }
  }

  // Low severity
  return {
    required: false,
    reason: 'Gravita\' bassa — non sussiste un rischio elevato per i diritti e le liberta\' degli ' +
      'interessati. La notifica agli interessati non e\' richiesta ai sensi dell\'Art. 34 GDPR. ' +
      'La violazione deve comunque essere documentata nel registro interno (Art. 33(5) GDPR).',
  }
}

// ---------------------------------------------------------------------------
// Breach reference generation
// ---------------------------------------------------------------------------

/**
 * Generate a unique breach reference number in the format BREACH-YYYY-NNN.
 *
 * The reference combines the organization ID prefix, the current year, and
 * a sequential portion derived from the current timestamp to ensure
 * uniqueness within the organization.
 */
export function generateBreachReference(organizationId: string): string {
  const year = new Date().getFullYear()
  const seq = String(Date.now() % 1000).padStart(3, '0')
  return `BREACH-${year}-${seq}`
}

// ---------------------------------------------------------------------------
// Garante notification report (Art. 33(3))
// ---------------------------------------------------------------------------

/**
 * Generate a formatted notification report for the Garante per la Protezione
 * dei Dati Personali per GDPR Art. 33(3).
 *
 * Art. 33(3) requires that the notification contain at minimum:
 * (a) The nature of the personal data breach including the categories and
 *     approximate number of data subjects and records concerned
 * (b) The name and contact details of the data protection officer or other
 *     contact point
 * (c) A description of the likely consequences of the breach
 * (d) A description of the measures taken or proposed to address the breach
 *
 * The report follows the format prescribed by the Garante's online
 * notification procedure (Provvedimento del 30/07/2019).
 */
export function generateGaranteNotificationReport(breach: DataBreach): string {
  const detectedAt = new Date(breach.detected_at)
  const { deadline, hoursRemaining, isOverdue } = calculateNotificationDeadline(detectedAt)

  const severityLabels: Record<BreachSeverity, string> = {
    low: 'Bassa',
    medium: 'Media',
    high: 'Elevata',
    critical: 'Critica',
  }

  const statusLabels: Record<string, string> = {
    detected: 'Rilevata',
    investigating: 'In fase di indagine',
    contained: 'Contenuta',
    resolved: 'Risolta',
    notified_authority: 'Notificata all\'autorita\'',
    notified_subjects: 'Notificata agli interessati',
    closed: 'Chiusa',
  }

  const overdueWarning = isOverdue
    ? `\n⚠ ATTENZIONE: Il termine di 72 ore per la notifica al Garante e' scaduto.\n` +
      `  Ai sensi dell'Art. 33(1) GDPR, la notifica deve essere corredata delle\n` +
      `  motivazioni del ritardo.\n`
    : ''

  return `${'='.repeat(72)}
NOTIFICA DI VIOLAZIONE DEI DATI PERSONALI
ai sensi dell'Art. 33 del Regolamento UE 2016/679 (GDPR)
al Garante per la Protezione dei Dati Personali
${'='.repeat(72)}

Riferimento violazione: ${breach.breach_reference}
Data di generazione del report: ${format(new Date(), 'dd/MM/yyyy HH:mm')}
${overdueWarning}
${'─'.repeat(72)}
SEZIONE 1 — TEMPISTICA
${'─'.repeat(72)}

Data e ora di rilevazione:    ${format(detectedAt, 'dd/MM/yyyy HH:mm')}
Termine per la notifica:      ${format(deadline, 'dd/MM/yyyy HH:mm')}
Ore rimanenti:                ${isOverdue ? 'SCADUTO' : hoursRemaining.toFixed(1) + ' ore'}
Stato attuale:                ${statusLabels[breach.status] ?? breach.status}
Rilevata da:                  ${breach.detected_by ?? 'Non specificato'}
Metodo di rilevazione:        ${breach.detection_method ?? 'Non specificato'}

${'─'.repeat(72)}
SEZIONE 2 — NATURA DELLA VIOLAZIONE (Art. 33(3)(a))
${'─'.repeat(72)}

Titolo:                       ${breach.title}

Descrizione:
${breach.description}

Tipologia di violazione:      ${breach.breach_type.join(', ')}
Gravita' stimata:             ${severityLabels[breach.severity]}

Categorie di dati coinvolti:
${breach.data_categories_affected.map(c => `  - ${c}`).join('\n')}

Numero approssimativo di registrazioni coinvolte: ${breach.number_of_records_affected ?? 'In fase di accertamento'}
Numero approssimativo di interessati coinvolti:   ${breach.number_of_subjects_affected ?? 'In fase di accertamento'}

${'─'.repeat(72)}
SEZIONE 3 — CONSEGUENZE PROBABILI (Art. 33(3)(c))
${'─'.repeat(72)}

${breach.likely_consequences ?? 'In fase di valutazione.'}

${'─'.repeat(72)}
SEZIONE 4 — MISURE ADOTTATE E PROPOSTE (Art. 33(3)(d))
${'─'.repeat(72)}

Misure gia' adottate:
${breach.measures_taken ?? 'Nessuna misura ancora adottata.'}

Misure pianificate:
${breach.measures_planned ?? 'In fase di definizione.'}

${'─'.repeat(72)}
SEZIONE 5 — NOTIFICA AGLI INTERESSATI (Art. 34)
${'─'.repeat(72)}

Notifica agli interessati richiesta: ${breach.subject_notification_required ? 'SI\'' : 'NO'}
${breach.subjects_notified_at ? `Data di notifica agli interessati: ${format(new Date(breach.subjects_notified_at), 'dd/MM/yyyy HH:mm')}` : 'Interessati non ancora notificati'}
${breach.subject_notification_method ? `Metodo di notifica: ${breach.subject_notification_method}` : ''}

${'─'.repeat(72)}
SEZIONE 6 — CAUSA E RISOLUZIONE
${'─'.repeat(72)}

Causa radice:       ${breach.root_cause ?? 'In fase di accertamento.'}
${breach.resolved_at ? `Risolta il:         ${format(new Date(breach.resolved_at), 'dd/MM/yyyy HH:mm')}` : 'Non ancora risolta.'}
${breach.resolution_notes ? `\nNote sulla risoluzione:\n${breach.resolution_notes}` : ''}
${breach.lessons_learned ? `\nLezioni apprese:\n${breach.lessons_learned}` : ''}

${'='.repeat(72)}
NOTA: Il presente report e' generato automaticamente dal sistema Gest
a supporto della procedura di notifica telematica al Garante Privacy.
Il Titolare del trattamento e' responsabile della verifica e
dell'integrazione delle informazioni prima dell'invio.

Riferimenti normativi:
- Art. 33 GDPR — Notifica di una violazione dei dati personali
  all'autorita' di controllo
- Art. 34 GDPR — Comunicazione di una violazione dei dati personali
  all'interessato
- Provvedimento Garante del 30/07/2019 — Modello di notifica telematica
${'='.repeat(72)}`
}
