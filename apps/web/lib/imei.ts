/**
 * IMEI validation and helper utilities
 */

/**
 * Validates whether a string is a valid 15-digit IMEI.
 * Standard IMEI consists of exactly 15 numerical digits.
 */
export function validateImeiFormat(imei: string): { valid: boolean; error?: string; cleanImei: string } {
  if (!imei || !String(imei).trim()) {
    return { valid: false, error: 'Device Unique ID / IMEI is required.', cleanImei: '' };
  }

  const raw = String(imei).trim();

  // 1. Check if it matches Unique Device ID format (e.g., IP11PM-TAG-A01, SAM-S24-A01)
  if (/^[A-Za-z0-9]+(-[A-Za-z0-9]+)+$/.test(raw)) {
    return { valid: true, cleanImei: raw.toUpperCase() };
  }

  // 2. Check if it's a numeric 15-digit IMEI (standard cellular IMEI)
  const numericOnly = raw.replace(/[-\s]/g, '');
  if (/^\d{14,16}$/.test(numericOnly)) {
    return { valid: true, cleanImei: numericOnly };
  }

  // 3. General serial / alphanumeric unique identifier (at least 6 characters)
  if (/^[A-Za-z0-9-_]{6,32}$/.test(raw)) {
    return { valid: true, cleanImei: raw.toUpperCase() };
  }

  return { 
    valid: false, 
    error: 'Device ID must be a valid Unique ID (e.g. IP11PM-TAG-A01) or a 15-digit IMEI number.', 
    cleanImei: raw 
  };
}

/**
 * Checks Luhn checksum (MOD 10) for extra validity.
 */
export function checkLuhnChecksum(imei: string): boolean {
  if (!/^\d{15}$/.test(imei)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = parseInt(imei.charAt(i), 10);
    if (i % 2 !== 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/**
 * Checks if a device or product name is an iPhone / Apple phone unit.
 */
export function isIPhoneProduct(item: any): boolean {
  if (!item) return false;
  const name = typeof item === 'string' ? item : (item.name || item.deviceName || '');
  const cat = typeof item === 'object' ? (item.category?.name || item.category || '') : '';
  const lowerName = String(name).toLowerCase();
  const lowerCat = String(cat).toLowerCase();
  return (
    lowerName.includes('iphone') || 
    lowerName.includes('apple') || 
    lowerCat.includes('iphone') || 
    lowerCat.includes('apple')
  );
}
