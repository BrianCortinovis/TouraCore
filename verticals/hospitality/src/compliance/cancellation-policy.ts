/**
 * Cancellation Policy Management
 *
 * Implements cancellation policy logic for Italian accommodation facilities
 * in compliance with the Codice del Consumo (D.Lgs. 206/2005) and applicable
 * EU consumer protection directives.
 *
 * Key regulations:
 * - D.Lgs. 206/2005 (Codice del Consumo)
 *   - Art. 49: Pre-contractual information obligations
 *   - Art. 52: Right of withdrawal (14-day cooling-off period)
 *   - Art. 59(n): Exclusion of accommodation services with specific dates
 * - Direttiva UE 2011/83 (Consumer Rights Directive), Art. 16(l)
 * - Art. 1385 Codice Civile (caparra confirmatoria / confirming deposit)
 * - Art. 1386 Codice Civile (caparra penitenziale / penitential deposit)
 * - D.Lgs. 79/2011 (Codice del Turismo) for package travel cancellations
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CancellationPolicyInput {
  policy_type: 'free' | 'moderate' | 'strict' | 'non_refundable' | 'custom'
  free_cancellation_hours: number
  penalty_first_night: boolean
  penalty_percentage: number
  penalty_fixed: number
}

export interface CancellationPenaltyResult {
  penalty_amount: number
  refund_amount: number
  is_free_cancellation: boolean
}

export interface WithdrawalResult {
  applicable: boolean
  reason: string
}

export interface CancellationPolicyTemplate {
  policy_type: CancellationPolicyInput['policy_type']
  label: { it: string; en: string; de: string }
  description: { it: string; en: string; de: string }
  free_cancellation_hours: number
  penalty_first_night: boolean
  penalty_percentage: number
  penalty_fixed: number
}

// ---------------------------------------------------------------------------
// Default policy templates
// ---------------------------------------------------------------------------

/**
 * Standard cancellation policy templates commonly used by Italian
 * accommodation facilities.
 *
 * These templates align with the transparency requirements of Art. 49 D.Lgs.
 * 206/2005, which mandates that the conditions, time limits, and procedures
 * for exercising the right of withdrawal must be clearly communicated before
 * the consumer is bound by a distance contract.
 *
 * Note: Cancellation policies must be prominently displayed at the time of
 * booking per Art. 49(1)(h) D.Lgs. 206/2005.
 */
export const DEFAULT_POLICIES: CancellationPolicyTemplate[] = [
  {
    policy_type: 'free',
    label: {
      it: 'Cancellazione gratuita',
      en: 'Free cancellation',
      de: 'Kostenlose Stornierung',
    },
    description: {
      it: 'Cancellazione gratuita fino a 24 ore prima del check-in. Nessuna penale applicata.',
      en: 'Free cancellation up to 24 hours before check-in. No penalty applied.',
      de: 'Kostenlose Stornierung bis 24 Stunden vor dem Check-in. Keine Gebuehr.',
    },
    free_cancellation_hours: 24,
    penalty_first_night: false,
    penalty_percentage: 0,
    penalty_fixed: 0,
  },
  {
    policy_type: 'moderate',
    label: {
      it: 'Cancellazione moderata',
      en: 'Moderate cancellation',
      de: 'Moderate Stornierung',
    },
    description: {
      it: 'Cancellazione gratuita fino a 5 giorni prima del check-in. Dopo tale termine, penale pari al costo della prima notte.',
      en: 'Free cancellation up to 5 days before check-in. After that, penalty equal to the first night cost.',
      de: 'Kostenlose Stornierung bis 5 Tage vor dem Check-in. Danach wird die erste Nacht berechnet.',
    },
    free_cancellation_hours: 120,
    penalty_first_night: true,
    penalty_percentage: 0,
    penalty_fixed: 0,
  },
  {
    policy_type: 'strict',
    label: {
      it: 'Cancellazione rigida',
      en: 'Strict cancellation',
      de: 'Strenge Stornierung',
    },
    description: {
      it: 'Cancellazione gratuita fino a 14 giorni prima del check-in. Dopo tale termine, penale pari al 50% dell\'importo totale.',
      en: 'Free cancellation up to 14 days before check-in. After that, 50% penalty on total amount.',
      de: 'Kostenlose Stornierung bis 14 Tage vor dem Check-in. Danach 50% des Gesamtbetrags.',
    },
    free_cancellation_hours: 336,
    penalty_first_night: false,
    penalty_percentage: 50,
    penalty_fixed: 0,
  },
  {
    policy_type: 'non_refundable',
    label: {
      it: 'Non rimborsabile',
      en: 'Non-refundable',
      de: 'Nicht erstattbar',
    },
    description: {
      it: 'Tariffa non rimborsabile. In caso di cancellazione, l\'intero importo sara\' trattenuto come penale ai sensi dell\'Art. 1385 Codice Civile.',
      en: 'Non-refundable rate. In case of cancellation, the full amount will be retained as penalty per Art. 1385 Italian Civil Code.',
      de: 'Nicht erstattbarer Tarif. Bei Stornierung wird der gesamte Betrag als Gebuehr einbehalten gemaess Art. 1385 ital. Zivilgesetzbuch.',
    },
    free_cancellation_hours: 0,
    penalty_first_night: false,
    penalty_percentage: 100,
    penalty_fixed: 0,
  },
]

// ---------------------------------------------------------------------------
// Penalty calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the cancellation penalty based on the policy type, the total
 * booking amount, and the timing of the cancellation relative to check-in.
 *
 * The penalty is computed as follows:
 * 1. If the cancellation falls within the free cancellation window
 *    (defined by `free_cancellation_hours` before check-in), no penalty
 *    is applied.
 * 2. If `penalty_first_night` is true, the penalty equals the cost of the
 *    first night (approximated as `totalAmount / number_of_nights`, with a
 *    minimum of 1 night).
 * 3. If `penalty_percentage` > 0, the penalty is that percentage of the
 *    total amount.
 * 4. If `penalty_fixed` > 0, a fixed penalty is applied.
 * 5. Multiple penalty components are combined (first night + percentage +
 *    fixed) when configured together on a custom policy.
 *
 * The penalty amount is capped at the total booking amount and rounded to
 * two decimal places.
 *
 * Per Art. 1385 Codice Civile, the penalty functions as a caparra
 * confirmatoria (confirming deposit): if the guest cancels, the host may
 * retain the deposit; if the host cancels, the guest is entitled to double
 * the deposit.
 *
 * Per Art. 33(2)(f) D.Lgs. 206/2005 (clausole vessatorie), a penalty
 * that is disproportionate to the actual damages may be deemed unfair.
 * Operators should ensure penalties reflect a reasonable estimate of actual
 * loss.
 */
export function calculatePenalty(
  policy: CancellationPolicyInput,
  totalAmount: number,
  checkInDate: Date,
  cancellationDate: Date,
): CancellationPenaltyResult {
  // Non-refundable: always full penalty, regardless of timing
  if (policy.policy_type === 'non_refundable') {
    return {
      penalty_amount: round2(totalAmount),
      refund_amount: 0,
      is_free_cancellation: false,
    }
  }

  // Determine hours remaining until check-in
  const msUntilCheckIn = checkInDate.getTime() - cancellationDate.getTime()
  const hoursUntilCheckIn = msUntilCheckIn / (1000 * 60 * 60)

  // Free cancellation window
  if (hoursUntilCheckIn >= policy.free_cancellation_hours) {
    return {
      penalty_amount: 0,
      refund_amount: round2(totalAmount),
      is_free_cancellation: true,
    }
  }

  // If cancellation date is after check-in, full penalty applies
  if (hoursUntilCheckIn < 0) {
    return {
      penalty_amount: round2(totalAmount),
      refund_amount: 0,
      is_free_cancellation: false,
    }
  }

  // Calculate penalty components
  let penalty = 0

  // First-night penalty: approximate nightly rate
  if (policy.penalty_first_night) {
    // Estimate number of nights from the total booking duration.
    // Use a minimum of 1 to avoid division by zero for same-day bookings.
    const msPerDay = 1000 * 60 * 60 * 24
    const nights = Math.max(
      1,
      Math.round(
        (checkInDate.getTime() + msPerDay - checkInDate.getTime()) / msPerDay,
      ),
    )
    // For first-night penalty, we approximate the first night as an equal
    // share of the total. Callers with detailed folio data should use
    // 'custom' policy_type with penalty_fixed set to the actual first-night
    // rate for higher precision.
    penalty += totalAmount / nights
  }

  // Percentage penalty
  if (policy.penalty_percentage > 0) {
    penalty += (totalAmount * policy.penalty_percentage) / 100
  }

  // Fixed penalty
  if (policy.penalty_fixed > 0) {
    penalty += policy.penalty_fixed
  }

  // Cap penalty at total amount
  penalty = Math.min(penalty, totalAmount)
  penalty = Math.max(penalty, 0)

  const penaltyAmount = round2(penalty)
  const refundAmount = round2(totalAmount - penaltyAmount)

  return {
    penalty_amount: penaltyAmount,
    refund_amount: refundAmount,
    is_free_cancellation: false,
  }
}

// ---------------------------------------------------------------------------
// Right of withdrawal (Art. 52 D.Lgs. 206/2005)
// ---------------------------------------------------------------------------

/**
 * Determine whether the 14-day right of withdrawal under the Codice del
 * Consumo applies to a given accommodation booking.
 *
 * Per Art. 52 D.Lgs. 206/2005, consumers have a 14-day right of withdrawal
 * for distance contracts (contratti a distanza) and off-premises contracts
 * (contratti negoziati fuori dei locali commerciali) without giving any
 * reason and without incurring any cost other than those provided for in
 * Art. 56(2) and Art. 57.
 *
 * However, Art. 59(n) D.Lgs. 206/2005 (implementing Art. 16(l) of
 * Directive 2011/83/EU) explicitly EXCLUDES the right of withdrawal for:
 *
 *   "la fornitura di alloggio per fini non residenziali, il trasporto di
 *    beni, i servizi di noleggio di autovetture, i servizi di catering o
 *    i servizi riguardanti le attivita' del tempo libero qualora il
 *    contratto preveda una data o un periodo di esecuzione specifici"
 *
 * Translation: accommodation for non-residential purposes where the contract
 * provides for a specific date or period of performance.
 *
 * This means that virtually all hotel/B&B/vacation rental bookings with
 * defined check-in/check-out dates are EXCLUDED from the withdrawal right.
 * The facility's own cancellation policy (not the statutory 14-day right)
 * governs the consumer's ability to cancel.
 *
 * @param bookingDate - The date the reservation was made
 * @param checkInDate - The scheduled check-in date
 * @returns Whether the withdrawal right applies and the legal justification
 */
export function isWithdrawalApplicable(
  bookingDate: Date,
  checkInDate: Date,
): WithdrawalResult {
  // Art. 59(n) excludes accommodation services with specific dates
  // from the right of withdrawal. Since accommodation bookings by
  // definition have specific check-in/check-out dates, the exclusion
  // applies in virtually all cases.

  const hasSpecificDate = checkInDate instanceof Date && !isNaN(checkInDate.getTime())

  if (hasSpecificDate) {
    return {
      applicable: false,
      reason:
        'Il diritto di recesso non si applica ai sensi dell\'Art. 59, comma 1, ' +
        'lettera n) del D.Lgs. 206/2005 (Codice del Consumo), che esclude i ' +
        'contratti di fornitura di alloggio per fini non residenziali quando il ' +
        'contratto prevede una data o un periodo di esecuzione specifici. ' +
        'Tale esclusione recepisce l\'Art. 16, lettera l) della Direttiva UE ' +
        '2011/83. Si applica la politica di cancellazione contrattuale della ' +
        'struttura.',
    }
  }

  // Edge case: if somehow the booking has no specific date (e.g., open-dated
  // voucher or gift certificate), the 14-day withdrawal right may apply.
  const daysSinceBooking = Math.floor(
    (new Date().getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24),
  )
  const withinWithdrawalPeriod = daysSinceBooking <= 14

  if (withinWithdrawalPeriod) {
    return {
      applicable: true,
      reason:
        'Il diritto di recesso ai sensi dell\'Art. 52 D.Lgs. 206/2005 potrebbe ' +
        'essere applicabile. Il contratto non prevede una data di esecuzione ' +
        'specifica, pertanto l\'esclusione di cui all\'Art. 59(n) non opera. ' +
        'Il consumatore ha 14 giorni dalla conclusione del contratto per ' +
        'esercitare il diritto di recesso senza indicarne le ragioni e senza ' +
        'alcuna penalita\' (Art. 52, comma 2).',
    }
  }

  return {
    applicable: false,
    reason:
      'Il termine di 14 giorni per l\'esercizio del diritto di recesso ai sensi ' +
      'dell\'Art. 52 D.Lgs. 206/2005 e\' decorso. Sono trascorsi ' +
      daysSinceBooking +
      ' giorni dalla data di prenotazione. Si applica la politica di ' +
      'cancellazione contrattuale della struttura.',
  }
}

// ---------------------------------------------------------------------------
// Policy text generation
// ---------------------------------------------------------------------------

/**
 * Generate human-readable cancellation policy text in the specified locale.
 *
 * The generated text includes:
 * - A clear statement of the free cancellation window (if any)
 * - The applicable penalty after the free cancellation period
 * - A reference to the governing Italian law (Art. 1385 C.C. for deposits,
 *   Art. 49 D.Lgs. 206/2005 for pre-contractual information)
 *
 * Per Art. 49(1)(h) D.Lgs. 206/2005, the conditions, time limits, and
 * procedures for exercising cancellation rights must be communicated in a
 * "clear and comprehensible manner" before the consumer is bound.
 *
 * Supported locales: Italian (it), English (en), German (de). German is
 * included as it is an official language in Trentino-Alto Adige/Suedtirol
 * per the Statuto di Autonomia (D.P.R. 670/1972).
 */
export function generatePolicyText(
  policy: CancellationPolicyInput,
  locale: 'it' | 'en' | 'de',
): string {
  switch (locale) {
    case 'it':
      return generatePolicyTextIT(policy)
    case 'en':
      return generatePolicyTextEN(policy)
    case 'de':
      return generatePolicyTextDE(policy)
    default:
      return generatePolicyTextEN(policy)
  }
}

// ---------------------------------------------------------------------------
// Italian policy text
// ---------------------------------------------------------------------------

function generatePolicyTextIT(policy: CancellationPolicyInput): string {
  if (policy.policy_type === 'non_refundable') {
    return (
      'TARIFFA NON RIMBORSABILE\n\n' +
      'La prenotazione e\' effettuata a tariffa non rimborsabile. In caso di ' +
      'cancellazione, mancata presentazione (no-show) o partenza anticipata, ' +
      'l\'intero importo della prenotazione sara\' trattenuto a titolo di penale ' +
      'ai sensi dell\'Art. 1385 del Codice Civile.\n\n' +
      'Ai sensi dell\'Art. 59, comma 1, lettera n) del D.Lgs. 206/2005 ' +
      '(Codice del Consumo), il diritto di recesso di cui all\'Art. 52 non ' +
      'si applica ai contratti di fornitura di alloggio con data di esecuzione ' +
      'specifica.'
    )
  }

  const parts: string[] = []

  parts.push('POLITICA DI CANCELLAZIONE\n')

  if (policy.free_cancellation_hours > 0) {
    const days = policy.free_cancellation_hours / 24
    if (Number.isInteger(days) && days >= 1) {
      parts.push(
        `Cancellazione gratuita fino a ${days} ${days === 1 ? 'giorno' : 'giorni'} ` +
        'prima della data di check-in.',
      )
    } else {
      parts.push(
        `Cancellazione gratuita fino a ${policy.free_cancellation_hours} ore ` +
        'prima della data di check-in.',
      )
    }
  } else {
    parts.push('Non e\' previsto un periodo di cancellazione gratuita.')
  }

  // Penalty description
  const penalties: string[] = []

  if (policy.penalty_first_night) {
    penalties.push('il costo della prima notte di soggiorno')
  }
  if (policy.penalty_percentage > 0) {
    penalties.push(`il ${policy.penalty_percentage}% dell'importo totale della prenotazione`)
  }
  if (policy.penalty_fixed > 0) {
    penalties.push(
      `un importo fisso di EUR ${policy.penalty_fixed.toFixed(2)}`,
    )
  }

  if (penalties.length > 0) {
    parts.push(
      '\nIn caso di cancellazione oltre il termine indicato, sara\' applicata ' +
      'una penale pari a ' +
      penalties.join(', oltre a ') +
      ', ai sensi dell\'Art. 1385 del Codice Civile.',
    )
  }

  parts.push(
    '\nIn caso di mancata presentazione (no-show) senza preavviso, l\'intero ' +
    'importo della prenotazione potra\' essere trattenuto.',
  )

  parts.push(
    '\nAi sensi dell\'Art. 59, comma 1, lettera n) del D.Lgs. 206/2005, il ' +
    'diritto di recesso non si applica ai servizi di alloggio con data ' +
    'specifica.',
  )

  return parts.join('\n')
}

// ---------------------------------------------------------------------------
// English policy text
// ---------------------------------------------------------------------------

function generatePolicyTextEN(policy: CancellationPolicyInput): string {
  if (policy.policy_type === 'non_refundable') {
    return (
      'NON-REFUNDABLE RATE\n\n' +
      'This booking is made at a non-refundable rate. In case of cancellation, ' +
      'no-show, or early departure, the full booking amount will be retained ' +
      'as a penalty pursuant to Art. 1385 of the Italian Civil Code.\n\n' +
      'Pursuant to Art. 59(n) of Italian Legislative Decree 206/2005 ' +
      '(Consumer Code), the right of withdrawal under Art. 52 does not ' +
      'apply to accommodation contracts with a specific performance date.'
    )
  }

  const parts: string[] = []

  parts.push('CANCELLATION POLICY\n')

  if (policy.free_cancellation_hours > 0) {
    const days = policy.free_cancellation_hours / 24
    if (Number.isInteger(days) && days >= 1) {
      parts.push(
        `Free cancellation up to ${days} ${days === 1 ? 'day' : 'days'} ` +
        'before the check-in date.',
      )
    } else {
      parts.push(
        `Free cancellation up to ${policy.free_cancellation_hours} hours ` +
        'before the check-in date.',
      )
    }
  } else {
    parts.push('No free cancellation period is provided.')
  }

  // Penalty description
  const penalties: string[] = []

  if (policy.penalty_first_night) {
    penalties.push('the cost of the first night')
  }
  if (policy.penalty_percentage > 0) {
    penalties.push(`${policy.penalty_percentage}% of the total booking amount`)
  }
  if (policy.penalty_fixed > 0) {
    penalties.push(
      `a fixed fee of EUR ${policy.penalty_fixed.toFixed(2)}`,
    )
  }

  if (penalties.length > 0) {
    parts.push(
      '\nIf cancelled after the free cancellation deadline, a penalty of ' +
      penalties.join(', plus ') +
      ' will apply, pursuant to Art. 1385 of the Italian Civil Code.',
    )
  }

  parts.push(
    '\nIn case of no-show without prior notice, the full booking amount ' +
    'may be retained.',
  )

  parts.push(
    '\nPursuant to Art. 59(n) of Italian Legislative Decree 206/2005, ' +
    'the right of withdrawal does not apply to accommodation services ' +
    'with a specific date.',
  )

  return parts.join('\n')
}

// ---------------------------------------------------------------------------
// German policy text
// ---------------------------------------------------------------------------

function generatePolicyTextDE(policy: CancellationPolicyInput): string {
  if (policy.policy_type === 'non_refundable') {
    return (
      'NICHT ERSTATTBARER TARIF\n\n' +
      'Diese Buchung erfolgt zu einem nicht erstattbaren Tarif. Im Falle ' +
      'einer Stornierung, eines Nichterscheinens (No-Show) oder einer ' +
      'vorzeitigen Abreise wird der gesamte Buchungsbetrag als Gebuehr ' +
      'gemaess Art. 1385 des italienischen Zivilgesetzbuches einbehalten.\n\n' +
      'Gemaess Art. 59 Abs. 1 Buchst. n) des ital. Gesetzesdekrets ' +
      '206/2005 (Verbraucherschutzgesetz) gilt das Widerrufsrecht nach ' +
      'Art. 52 nicht fuer Beherbergungsvertraege mit einem bestimmten ' +
      'Ausfuehrungsdatum.'
    )
  }

  const parts: string[] = []

  parts.push('STORNIERUNGSBEDINGUNGEN\n')

  if (policy.free_cancellation_hours > 0) {
    const days = policy.free_cancellation_hours / 24
    if (Number.isInteger(days) && days >= 1) {
      parts.push(
        `Kostenlose Stornierung bis ${days} ${days === 1 ? 'Tag' : 'Tage'} ` +
        'vor dem Check-in-Datum.',
      )
    } else {
      parts.push(
        `Kostenlose Stornierung bis ${policy.free_cancellation_hours} Stunden ` +
        'vor dem Check-in-Datum.',
      )
    }
  } else {
    parts.push('Es ist keine kostenlose Stornierungsfrist vorgesehen.')
  }

  // Penalty description
  const penalties: string[] = []

  if (policy.penalty_first_night) {
    penalties.push('die Kosten der ersten Uebernachtung')
  }
  if (policy.penalty_percentage > 0) {
    penalties.push(`${policy.penalty_percentage}% des Gesamtbuchungsbetrags`)
  }
  if (policy.penalty_fixed > 0) {
    penalties.push(
      `eine Pauschalgebuehr von EUR ${policy.penalty_fixed.toFixed(2)}`,
    )
  }

  if (penalties.length > 0) {
    parts.push(
      '\nBei Stornierung nach Ablauf der kostenlosen Stornierungsfrist wird ' +
      'eine Gebuehr in Hoehe von ' +
      penalties.join(', zuzueglich ') +
      ' erhoben, gemaess Art. 1385 des ital. Zivilgesetzbuches.',
    )
  }

  parts.push(
    '\nBei Nichterscheinen (No-Show) ohne vorherige Benachrichtigung kann ' +
    'der gesamte Buchungsbetrag einbehalten werden.',
  )

  parts.push(
    '\nGemaess Art. 59 Abs. 1 Buchst. n) des ital. Gesetzesdekrets ' +
    '206/2005 gilt das Widerrufsrecht nicht fuer Beherbergungsleistungen ' +
    'mit einem bestimmten Datum.',
  )

  return parts.join('\n')
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Round a number to two decimal places (Euro cents).
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100
}
