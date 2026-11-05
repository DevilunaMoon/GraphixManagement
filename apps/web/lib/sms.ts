/**
 * Semaphore SMS Service Helper (Server-side)
 * Handles Philippine mobile number normalization, telco network detection,
 * DITO 10-day approval fallback routing, and API communication with Semaphore v4.
 *
 * Includes automated Repair Progress SMS notification engine for GraphiX Store.
 */

import { prisma } from 'database';
export * from './sms-utils';
import {
  normalizePhilippineNumber,
  detectTelcoNetwork,
  isDitoNetwork,
  canonicalizeRepairStatus,
  buildRepairSmsMessage,
  SendSmsResult,
  SemaphoreAccountStatus
} from './sms-utils';

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

/**
 * Builds the exact dynamic SMS notification message for repair status transitions
 * as specified in the GraphiX project requirements:
 *
 * A. Diagnostic:
 * "GraphiX Store: Hello [Customer Name], your gadget ([Device Name]) is currently undergoing diagnostic evaluation. We will update you regarding its repair progress. Reference: [Repair Reference]."
 *
 * B. Repairing:
 * "GraphiX Store: Hello [Customer Name], your gadget ([Device Name]) is now undergoing repair. Our technician is currently working on your device. Reference: [Repair Reference]."
 *
 * C. Completed:
 * "GraphiX Store: Good news, [Customer Name]! Your gadget repair ([Repair Reference]) has been completed. Please coordinate with our [Branch Name] Branch regarding device pickup. Thank you for choosing GraphiX Store!"
 *
 * D. Cancelled:
 * "GraphiX Store: Hello [Customer Name], your gadget repair request ([Repair Reference]) has been cancelled. For further information, please contact our [Branch Name] Branch. Thank you."
 */
export async function resolveRepairTrackingNumber(repairId: string, branch: string = 'Tagoloan'): Promise<string> {
  try {
    const rawBranch = branch.toLowerCase();
    let branchCode = 'TAG';
    if (rawBranch.includes('vil')) branchCode = 'VIL';
    else if (rawBranch.includes('jas')) branchCode = 'JAS';
    else branchCode = 'TAG';

    const branchRepairs = await prisma.repairRequest.findMany({
      where: { branch: { equals: branch, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true }
    });

    const index = branchRepairs.findIndex(r => r.id === repairId);
    const seqNum = index >= 0 ? index + 1 : 1;
    const letterIndex = Math.floor((seqNum - 1) / 1000);
    const letter = String.fromCharCode(65 + (letterIndex % 26));
    const seriesNum = ((seqNum - 1) % 1000) + 1;
    return `GRPX-${branchCode}-${letter}${seriesNum}`;
  } catch {
    return 'GRPX-TAG-A1';
  }
}

/**
 * Standardizes raw status into one of the 4 official statuses:
 * Diagnostic, Repairing, Completed, Cancelled
 */
export interface RepairStatusSmsTriggerParams {
  repairId: string;
  previousProgress: string;
  newProgress: string;
  technicianName?: string | null;
  explicitCustomerPhone?: string | null;
}

export interface RepairStatusSmsResult {
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  recipient?: string;
  network?: string;
  senderNameUsed?: string | null;
  messageId?: number;
  status?: string;
  error?: string;
  smsRecordId?: string;
}

/**
 * Core automatic SMS trigger:
 * Automatically invoked when a technician saves changes. Compares previous status with
 * newly saved status. If changed, dynamically builds message, sends via Semaphore,
 * and logs to the RepairSmsHistory table.
 *
 * Never throws an exception that would roll back the repair update.
 */
export async function triggerRepairStatusSms(params: RepairStatusSmsTriggerParams): Promise<RepairStatusSmsResult> {
  const { repairId, previousProgress, newProgress, technicianName, explicitCustomerPhone } = params;

  // 1. Strict status change check: do not send if status did not change
  const prevCanonical = canonicalizeRepairStatus(previousProgress || '');
  const newCanonical = canonicalizeRepairStatus(newProgress || '');

  if (!newCanonical) {
    return {
      sent: false,
      skipped: true,
      reason: `New progress "${newProgress}" is not one of the 4 SMS-eligible statuses.`
    };
  }

  if (prevCanonical === newCanonical) {
    return {
      sent: false,
      skipped: true,
      reason: `Repair progress did not change (${previousProgress} -> ${newProgress}). No SMS sent.`
    };
  }

  // 2. Prevent duplicate SMS within 2 minutes for the same repair and transition
  try {
    const recentDuplicate = await prisma.repairSmsHistory.findFirst({
      where: {
        repairId,
        newStatus: newCanonical,
        sentAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
        sendingStatus: 'Submitted'
      }
    });

    if (recentDuplicate) {
      console.log(`[SMS] Duplicate prevention: SMS for ${repairId} -> ${newCanonical} was already submitted at ${recentDuplicate.sentAt.toISOString()}`);
      return {
        sent: false,
        skipped: true,
        reason: 'Duplicate SMS notification prevented (already sent recently).'
      };
    }
  } catch (dupCheckErr) {
    console.warn('[SMS] Duplicate check warning:', dupCheckErr);
  }

  // 3. Fetch full repair record and customer data
  const repair = await prisma.repairRequest.findUnique({
    where: { id: repairId },
    include: { user: true }
  });

  if (!repair) {
    return {
      sent: false,
      error: `Repair record not found for ID: ${repairId}`
    };
  }

  // 4. Resolve tracking reference and dynamic template parameters
  const trackingNumber = await resolveRepairTrackingNumber(repair.id, repair.branch);
  
  let parsedHistory: any = null;
  if (repair.repairHistory && typeof repair.repairHistory === 'string' && repair.repairHistory.trim().startsWith('{')) {
    try {
      parsedHistory = JSON.parse(repair.repairHistory);
    } catch {}
  }

  const customerName = repair.ownerName?.trim() || repair.user?.name?.trim() || parsedHistory?.customerName?.trim() || 'Valued Customer';
  const deviceName = repair.deviceName || 'Device';
  const branchName = repair.branch || 'Tagoloan';

  // 5. Resolve recipient phone number
  const rawPhone = (
    explicitCustomerPhone || 
    parsedHistory?.customerPhone || 
    repair.user?.phone || 
    ''
  ).trim();

  const normalizedPhone = normalizePhilippineNumber(rawPhone);
  const network = detectTelcoNetwork(normalizedPhone);

  // 6. Generate the message content
  const messageContent = buildRepairSmsMessage({
    status: newCanonical,
    customerName,
    deviceName,
    repairReference: trackingNumber,
    branchName
  });

  if (!messageContent) {
    return {
      sent: false,
      skipped: true,
      reason: 'Failed to build SMS template message.'
    };
  }

  // 7. Check if phone is missing or invalid
  if (!normalizedPhone || normalizedPhone.length !== 11) {
    const errorMsg = !rawPhone 
      ? 'Customer mobile number is missing from repair record.'
      : `Invalid mobile number: "${rawPhone}". Must be 11 digits (e.g. 09XXXXXXXXX).`;

    try {
      const historyRecord = await prisma.repairSmsHistory.create({
        data: {
          repairId: repair.id,
          repairReference: trackingNumber,
          customerId: repair.userId,
          customerName,
          recipientNumber: rawPhone || 'N/A',
          network: 'UNKNOWN',
          technicianName: technicianName || repair.technician || 'Technician',
          branch: repair.branch || 'Tagoloan',
          previousStatus: previousProgress || 'None',
          newStatus: newCanonical,
          message: messageContent,
          sendingStatus: 'Failed',
          errorMessage: errorMsg,
          sentAt: new Date()
        }
      });

      return {
        sent: false,
        recipient: rawPhone || 'N/A',
        error: errorMsg,
        smsRecordId: historyRecord.id
      };
    } catch (e: any) {
      console.error('[SMS] Error logging failed SMS history:', e);
      return {
        sent: false,
        recipient: rawPhone || 'N/A',
        error: errorMsg
      };
    }
  }

  // 8. Send SMS through Semaphore (with DITO fallback)
  const sendResult = await sendSms(normalizedPhone, messageContent);

  // 9. Record SMS sending result in RepairSmsHistory
  let historyRecordId: string | undefined = undefined;
  try {
    const historyRecord = await prisma.repairSmsHistory.create({
      data: {
        repairId: repair.id,
        repairReference: trackingNumber,
        customerId: repair.userId,
        customerName,
        recipientNumber: normalizedPhone,
        network: sendResult.network,
        technicianName: technicianName || repair.technician || 'Technician',
        branch: repair.branch || 'Tagoloan',
        previousStatus: previousProgress || 'None',
        newStatus: newCanonical,
        message: messageContent,
        semaphoreMessageId: sendResult.messageId ? String(sendResult.messageId) : null,
        sendingStatus: sendResult.success ? 'Submitted' : 'Failed',
        errorMessage: sendResult.error || null,
        sentAt: new Date()
      }
    });
    historyRecordId = historyRecord.id;
  } catch (dbErr) {
    console.error('[SMS] Failed to create RepairSmsHistory record:', dbErr);
  }

  return {
    sent: sendResult.success,
    recipient: normalizedPhone,
    network: sendResult.network,
    senderNameUsed: sendResult.senderNameUsed,
    messageId: sendResult.messageId,
    status: sendResult.status,
    error: sendResult.error,
    smsRecordId: historyRecordId
  };
}
