/**
 * Client-safe pure SMS utilities for Philippine phone numbers
 * Zero node/database dependencies so it can be safely imported by React client components.
 */

export interface SendSmsResult {
  success: boolean;
  network: 'DITO' | 'GLOBE' | 'SMART' | 'UNKNOWN';
  senderNameUsed: string | null;
  messageId?: number;
  status?: string;
  rawResponse?: any;
  error?: string;
}

export interface SemaphoreAccountStatus {
  configured: boolean;
  accountId?: number;
  accountName?: string;
  status?: string;
  creditBalance?: number;
  customSenderName: string;
  ditoApproved: boolean;
  error?: string;
}

/**
 * Normalizes any Philippine mobile phone number into clean 11-digit format: 09XXXXXXXXX
 * Supports formats:
 * - 09171234567
 * - +639171234567
 * - 639171234567
 * - 9171234567
 * - 0917-123-4567 / (0917) 123 4567
 */
export function normalizePhilippineNumber(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');

  if (clean.startsWith('63') && clean.length === 12) {
    clean = '0' + clean.slice(2);
  } else if (clean.startsWith('9') && clean.length === 10) {
    clean = '0' + clean;
  }

  return clean;
}

/**
 * Detects the Philippine telco network based on mobile prefix.
 */
export function detectTelcoNetwork(phone: string): 'DITO' | 'GLOBE' | 'SMART' | 'UNKNOWN' {
  const normalized = normalizePhilippineNumber(phone);
  if (!normalized || normalized.length !== 11) return 'UNKNOWN';

  const prefix = normalized.slice(0, 4);

  // DITO Telecommunity Prefixes
  const ditoPrefixes = [
    '0895', '0896', '0897', '0898',
    '0991', '0992', '0993', '0994'
  ];
  if (ditoPrefixes.includes(prefix)) {
    return 'DITO';
  }

  // Globe / TM Prefixes
  const globePrefixes = [
    '0905', '0906', '0915', '0916', '0917', '0925', '0926', '0927',
    '0935', '0936', '0937', '0945', '0953', '0954', '0955', '0956',
    '0965', '0966', '0967', '0975', '0976', '0977', '0978', '0979',
    '0995', '0996', '0997'
  ];
  if (globePrefixes.includes(prefix)) {
    return 'GLOBE';
  }

  // Smart / TNT / Sun Prefixes
  const smartPrefixes = [
    '0907', '0908', '0909', '0910', '0911', '0912', '0913', '0914',
    '0918', '0919', '0920', '0921', '0928', '0929', '0930', '0938',
    '0939', '0946', '0947', '0948', '0949', '0950', '0951', '0961',
    '0963', '0968', '0969', '0970', '0971', '0981', '0982', '0985',
    '0989', '0998', '0999'
  ];
  if (smartPrefixes.includes(prefix)) {
    return 'SMART';
  }

  return 'UNKNOWN';
}

/**
 * Returns true if the phone number belongs to DITO Telecommunity.
 */
export function isDitoNetwork(phone: string): boolean {
  return detectTelcoNetwork(phone) === 'DITO';
}

export type CanonicalRepairStatus = 'Diagnostic' | 'Repairing' | 'Completed' | 'Cancelled';

/**
 * Normalizes any freeform or legacy repair progress string into one of the 4 standard statuses.
 */
export function canonicalizeRepairStatus(status: string): CanonicalRepairStatus | null {
  if (!status) return null;
  const s = status.trim().toLowerCase();

  if (s === 'diagnostic' || s.includes('diag') || s.includes('intake') || s.includes('assessment')) {
    return 'Diagnostic';
  }
  if (s === 'repairing' || s.includes('repair') || s.includes('fixing') || s.includes('in progress')) {
    return 'Repairing';
  }
  if (s === 'completed' || s === 'done' || s === 'finished' || s === '100%') {
    return 'Completed';
  }
  if (s === 'cancelled' || s === 'canceled' || s === 'rejected') {
    return 'Cancelled';
  }

  return null;
}

export interface BuildSmsMessageParams {
  status: CanonicalRepairStatus;
  customerName: string;
  deviceName: string;
  repairReference: string;
  branchName: string;
}

/**
 * Generates automated SMS templates according strictly to Section 7 of requirements.
 */
export function buildRepairSmsMessage(params: BuildSmsMessageParams): string {
  const { status, customerName, deviceName, repairReference, branchName } = params;

  switch (status) {
    case 'Diagnostic':
      return `GraphiX Store: Hello ${customerName}, your gadget (${deviceName}) is currently undergoing diagnostic evaluation. We will update you regarding its repair progress. Reference: ${repairReference}.`;

    case 'Repairing':
      return `GraphiX Store: Hello ${customerName}, your gadget (${deviceName}) is now undergoing repair. Our technician is currently working on your device. Reference: ${repairReference}.`;

    case 'Completed':
      return `GraphiX Store: Good news, ${customerName}! Your gadget repair (${repairReference}) has been completed. Please coordinate with our ${branchName} Branch regarding device pickup. Thank you for choosing GraphiX Store!`;

    case 'Cancelled':
      return `GraphiX Store: Hello ${customerName}, your gadget repair request (${repairReference}) has been cancelled. For further information, please contact our ${branchName} Branch. Thank you.`;

    default:
      return '';
  }
}
