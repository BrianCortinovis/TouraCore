/**
 * Anti-Money Laundering (AML) Compliance Utilities
 *
 * Implements core AML compliance functions for Italian accommodation facilities
 * per D.Lgs. 231/2007 (Decreto Antiriciclaggio) as amended by D.Lgs. 90/2017
 * and D.Lgs. 125/2019.
 *
 * Key regulations:
 * - D.Lgs. 231/2007 (Attuazione della Direttiva 2005/60/CE — antiriciclaggio)
 * - D.Lgs. 90/2017 (Attuazione della IV Direttiva AML — UE 2015/849)
 * - D.Lgs. 125/2019 (Attuazione della V Direttiva AML — UE 2018/843)
 * - Art. 49 D.Lgs. 231/2007 (Limitazioni all'uso del contante)
 * - Art. 31 D.Lgs. 231/2007 (Obblighi di conservazione)
 * - Art. 35 D.Lgs. 231/2007 (Segnalazione di operazioni sospette alla UIF)
 * - L. 197/2022 Art. 1 comma 384 (soglia contante a 5.000 EUR dal 01/01/2023,
 *   poi ridotta nuovamente — verificare soglia vigente)
 *
 * NOTE: The cash threshold has been modified multiple times by successive
 * legislation. The value defined here (999.99 EUR) reflects the most
 * restrictive interpretation. Operators should verify the current threshold
 * with their compliance officer or commercialista.
 */

import type { AmlCashRecord } from '../types/database'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Maximum cash payment amount in EUR.
 *
 * Per Art. 49 D.Lgs. 231/2007, as amended, cash transactions between
 * different parties are prohibited above this threshold. The limit applies
 * to single transactions as well as to split transactions that appear
 * connected (operazioni frazionate).
 *
 * The threshold is cumulative per guest per stay — multiple cash payments
 * by the same guest that collectively exceed this limit are treated as a
 * single fragmented transaction (Art. 49, comma 2).
 */
export const AML_CASH_THRESHOLD = 999.99

// ---------------------------------------------------------------------------
// Internal policy thresholds
// ---------------------------------------------------------------------------

/**
 * Internal verification threshold in EUR.
 *
 * Per internal compliance policy, identity verification (adeguata verifica)
 * is required for cumulative cash amounts exceeding this value. This is
 * stricter than the legal requirement and aligns with Art. 18 D.Lgs. 231/2007
 * (obblighi di adeguata verifica della clientela).
 */
const INTERNAL_VERIFICATION_THRESHOLD = 500

/**
 * Warning percentage of the AML cash threshold.
 *
 * When a guest's cumulative cash payments reach this percentage of the
 * legal threshold, the system issues a warning to allow staff to inform
 * the guest and offer alternative payment methods.
 */
const WARNING_PERCENTAGE = 0.80

// ---------------------------------------------------------------------------
// Cash threshold check
// ---------------------------------------------------------------------------

/**
 * Check whether a cash payment would exceed the AML threshold.
 *
 * Per Art. 49 D.Lgs. 231/2007, the threshold applies to the cumulative
 * amount of cash transactions between the same parties (guest and facility)
 * within the context of a single stay or connected set of transactions.
 *
 * This function does NOT block the payment — it returns advisory information
 * for the operator to make the final decision. Exceeding the threshold must
 * result in rejection of the cash payment and the guest must be directed to
 * an electronic payment method.
 *
 * @param currentPayment - The amount of the cash payment being processed (EUR)
 * @param previousCashPayments - Total of all prior cash payments by this guest (EUR)
 * @returns Threshold check result with cumulative total, remaining allowance, and warning flag
 */
export function checkCashThreshold(
  currentPayment: number,
  previousCashPayments: number,
): { exceeds: boolean; cumulative: number; remaining: number; warning: boolean } {
  const cumulative = previousCashPayments + currentPayment
  const exceeds = cumulative > AML_CASH_THRESHOLD
  const remaining = Math.max(0, AML_CASH_THRESHOLD - previousCashPayments)
  const warning = cumulative >= AML_CASH_THRESHOLD * WARNING_PERCENTAGE

  return { exceeds, cumulative, remaining, warning }
}

// ---------------------------------------------------------------------------
// AML record creation
// ---------------------------------------------------------------------------

interface AmlRecordParams {
  entity_id: string
  payment_id?: string
  reservation_id?: string
  guest_id: string
  amount: number
  cumulative_cash_amount: number
  guest_name: string
  guest_document_type?: string
  guest_document_number?: string
  guest_fiscal_code?: string
  guest_nationality?: string
}

/**
 * Create an AML cash record object ready for database insertion.
 *
 * Per Art. 31 D.Lgs. 231/2007, all cash transactions must be recorded and
 * the records conserved for a period of 10 years from the date of the
 * transaction. The record must include sufficient detail to reconstruct
 * the transaction in case of inspection by the Guardia di Finanza or the
 * Unita' di Informazione Finanziaria (UIF).
 *
 * The returned object conforms to the `aml_cash_records` table schema
 * (excluding auto-generated fields `id` and `created_at`).
 *
 * @param params - Transaction and guest details for the AML record
 * @returns An AML cash record object suitable for database insertion
 */
export function createAmlRecord(
  params: AmlRecordParams,
): Omit<AmlCashRecord, 'id' | 'created_at'> {
  const isThresholdExceeded = params.cumulative_cash_amount > AML_CASH_THRESHOLD

  return {
    entity_id: params.entity_id,
    payment_id: params.payment_id ?? null,
    reservation_id: params.reservation_id ?? null,
    guest_id: params.guest_id,
    amount: params.amount,
    currency: 'EUR',
    transaction_date: new Date().toISOString(),
    is_threshold_exceeded: isThresholdExceeded,
    cumulative_cash_amount: params.cumulative_cash_amount,
    guest_name: params.guest_name,
    guest_document_type: params.guest_document_type ?? null,
    guest_document_number: params.guest_document_number ?? null,
    guest_fiscal_code: params.guest_fiscal_code ?? null,
    guest_nationality: params.guest_nationality ?? null,
    verified_by: null,
    verified_at: null,
    verification_notes: null,
    reported_to_uif: false,
    report_date: null,
    report_reference: null,
  }
}

// ---------------------------------------------------------------------------
// Identity verification check
// ---------------------------------------------------------------------------

/**
 * Determine whether identity verification (adeguata verifica) is required.
 *
 * Per Art. 18 D.Lgs. 231/2007, customer due diligence must be performed
 * when carrying out occasional transactions involving cash amounts above
 * the legal threshold. As an internal compliance policy, this facility
 * applies a stricter threshold of 500 EUR to ensure early identification
 * of guests making significant cash payments.
 *
 * Verification is also required when the cumulative amount approaches the
 * legal threshold (>= 80%), even if the internal threshold has not yet
 * been reached.
 *
 * @param cumulativeAmount - Total cumulative cash amount for the guest (EUR)
 * @returns `true` if identity verification should be performed
 */
export function isVerificationRequired(cumulativeAmount: number): boolean {
  return (
    cumulativeAmount > INTERNAL_VERIFICATION_THRESHOLD ||
    cumulativeAmount >= AML_CASH_THRESHOLD * WARNING_PERCENTAGE
  )
}

// ---------------------------------------------------------------------------
// AML report generation
// ---------------------------------------------------------------------------

/**
 * Summary statistics for a set of cash transactions within a reporting period.
 */
export interface AmlReportSummary {
  period: { from: string; to: string }
  generated_at: string
  total_transactions: number
  total_cash_amount: number
  unique_guests: number
  threshold_exceeded_count: number
  threshold_exceeded_records: {
    guest_name: string
    guest_id: string
    cumulative_cash_amount: number
    transaction_date: string
    reported_to_uif: boolean
  }[]
  verification_required_count: number
  average_transaction_amount: number
  largest_transaction: number
  reported_to_uif_count: number
}

/**
 * Generate a summary report of cash transactions for a given period.
 *
 * Per Art. 31 D.Lgs. 231/2007 and the UIF guidelines, accommodation
 * facilities must maintain complete and accurate records of all cash
 * transactions and be prepared to produce summary reports upon request
 * from competent authorities (Guardia di Finanza, UIF, Autorita'
 * giudiziaria).
 *
 * This report provides an overview of all cash activity during the
 * specified period, highlighting transactions that exceeded the legal
 * threshold or that triggered internal verification requirements.
 *
 * @param records - Array of AML cash records for the reporting period
 * @param period - The reporting period (ISO date strings)
 * @returns A structured summary report of cash transaction activity
 */
export function generateAmlReport(
  records: AmlCashRecord[],
  period: { from: string; to: string },
): AmlReportSummary {
  const totalTransactions = records.length
  const totalCashAmount = records.reduce((sum, r) => sum + r.amount, 0)

  const uniqueGuestIds = new Set(records.map(r => r.guest_id))

  const thresholdExceededRecords = records
    .filter(r => r.is_threshold_exceeded)
    .map(r => ({
      guest_name: r.guest_name,
      guest_id: r.guest_id,
      cumulative_cash_amount: r.cumulative_cash_amount,
      transaction_date: r.transaction_date,
      reported_to_uif: r.reported_to_uif,
    }))

  const verificationRequiredCount = records.filter(r =>
    isVerificationRequired(r.cumulative_cash_amount),
  ).length

  const averageTransactionAmount =
    totalTransactions > 0 ? totalCashAmount / totalTransactions : 0

  const largestTransaction =
    totalTransactions > 0 ? Math.max(...records.map(r => r.amount)) : 0

  const reportedToUifCount = records.filter(r => r.reported_to_uif).length

  return {
    period,
    generated_at: new Date().toISOString(),
    total_transactions: totalTransactions,
    total_cash_amount: Math.round(totalCashAmount * 100) / 100,
    unique_guests: uniqueGuestIds.size,
    threshold_exceeded_count: thresholdExceededRecords.length,
    threshold_exceeded_records: thresholdExceededRecords,
    verification_required_count: verificationRequiredCount,
    average_transaction_amount: Math.round(averageTransactionAmount * 100) / 100,
    largest_transaction: largestTransaction,
    reported_to_uif_count: reportedToUifCount,
  }
}
