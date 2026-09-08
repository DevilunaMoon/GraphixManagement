/**
 * IMEI validation and helper utilities
 */

/**
 * Validates whether a string is a valid 15-digit IMEI.
 * Standard IMEI consists of exactly 15 numerical digits.
 */
export function validateImeiFormat(imei: string): { valid: boolean; error?: string; cleanImei: string } {
  if (!imei) {
    return { valid: false, error: 'IMEI number is required.', cleanImei: '' };
  }

  const cleanImei = String(imei).trim().replace(/[-\s]/g, '');

  if (!/^\d+$/.test(cleanImei)) {
    return { valid: false, error: 'IMEI must contain numbers only.', cleanImei };
  }

  if (cleanImei.length !== 15) {
    return { valid: false, error: `IMEI must be exactly 15 digits (currently ${cleanImei.length}).`, cleanImei };
  }

  return { valid: true, cleanImei };
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
