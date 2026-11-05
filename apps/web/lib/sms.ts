/**
 * Semaphore SMS Service Helper
 * Handles Philippine mobile number normalization, telco network detection,
 * DITO 10-day approval fallback routing, and API communication with Semaphore v4.
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
export function isDitoNumber(phone: string): boolean {
  return detectTelcoNetwork(phone) === 'DITO';
}

/**
 * Retrieves the current Semaphore account status, credit balance, and configuration.
 */
export async function getSemaphoreStatus(): Promise<SemaphoreAccountStatus> {
  const apiKey = process.env.SEMAPHORE_API_KEY?.trim();
  const customSenderName = process.env.SEMAPHORE_SENDER_NAME?.trim() || 'GRAPHIX';
  const ditoApproved = process.env.SEMAPHORE_DITO_APPROVED === 'true';

  if (!apiKey) {
    return {
      configured: false,
      customSenderName,
      ditoApproved,
      error: 'SEMAPHORE_API_KEY is not defined in environment variables.'
    };
  }

  try {
    const res = await fetch(`https://api.semaphore.co/api/v4/account?apikey=${encodeURIComponent(apiKey)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        configured: true,
        customSenderName,
        ditoApproved,
        error: `Semaphore API error (${res.status}): ${errText}`
      };
    }

    const data = await res.json();
    return {
      configured: true,
      accountId: data.account_id,
      accountName: data.account_name,
      status: data.status,
      creditBalance: data.credit_balance,
      customSenderName,
      ditoApproved
    };
  } catch (err: any) {
    return {
      configured: true,
      customSenderName,
      ditoApproved,
      error: err?.message || 'Failed to connect to Semaphore API'
    };
  }
}

/**
 * Sends an SMS through Semaphore v4 with automatic DITO 10-day approval fallback.
 *
 * Routing Rules:
 * - DITO Recipient: If SEMAPHORE_DITO_APPROVED !== 'true', omit sender_name.
 *   This routes through Semaphore's pooled default shortcode so DITO messages arrive immediately
 *   without being rejected during the 10 business day approval period.
 * - Globe / Smart Recipient: Sends using custom sender_name (e.g. "GRAPHIX").
 */
export async function sendSms(to: string, message: string): Promise<SendSmsResult> {
  const apiKey = process.env.SEMAPHORE_API_KEY?.trim();
  const customSender = process.env.SEMAPHORE_SENDER_NAME?.trim() || 'GRAPHIX';
  const ditoApproved = process.env.SEMAPHORE_DITO_APPROVED === 'true';

  const normalizedPhone = normalizePhilippineNumber(to);
  const network = detectTelcoNetwork(normalizedPhone);

  if (!apiKey) {
    console.warn('[SMS] SEMAPHORE_API_KEY is missing. Cannot send SMS to:', normalizedPhone);
    return {
      success: false,
      network,
      senderNameUsed: null,
      error: 'SEMAPHORE_API_KEY is not set in environment variables.'
    };
  }

  if (!normalizedPhone || normalizedPhone.length !== 11) {
    return {
      success: false,
      network: 'UNKNOWN',
      senderNameUsed: null,
      error: `Invalid Philippine mobile number: "${to}". Expected an 11-digit number starting with 09 (e.g. 09171234567).`
    };
  }

  if (!message || !message.trim()) {
    return {
      success: false,
      network,
      senderNameUsed: null,
      error: 'Message content cannot be empty.'
    };
  }

  // Determine whether to use custom sender name or fallback for DITO
  let senderName: string | undefined = undefined;
  if (network === 'DITO') {
    if (ditoApproved) {
      senderName = customSender;
    } else {
      // Intentionally omit sender_name to bypass DITO 10-day rejection
      senderName = undefined;
    }
  } else {
    // Globe, Smart, or Unknown - use custom sender name
    senderName = customSender || undefined;
  }

  try {
    const payload: Record<string, string> = {
      apikey: apiKey,
      number: normalizedPhone,
      message: message.trim()
    };

    if (senderName) {
      payload.sender_name = senderName;
    }

    const response = await fetch('https://api.semaphore.co/api/v4/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = Array.isArray(data)
        ? data.map(d => d.message || JSON.stringify(d)).join(', ')
        : (data?.message || data?.error || JSON.stringify(data));

      console.error('[SMS] Semaphore Error:', errMsg);
      return {
        success: false,
        network,
        senderNameUsed: senderName || null,
        error: errMsg,
        rawResponse: data
      };
    }

    const firstItem = Array.isArray(data) ? data[0] : data;

    return {
      success: true,
      network,
      senderNameUsed: senderName || null,
      messageId: firstItem?.message_id,
      status: firstItem?.status || 'Queued',
      rawResponse: data
    };
  } catch (err: any) {
    console.error('[SMS] Exception sending SMS via Semaphore:', err);
    return {
      success: false,
      network,
      senderNameUsed: senderName || null,
      error: err?.message || 'Network error communicating with Semaphore API'
    };
  }
}

