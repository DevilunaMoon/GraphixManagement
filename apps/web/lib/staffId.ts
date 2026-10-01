/**
 * Format Staff ID deterministically based on existing user database records.
 * 
 * Formats:
 *   Super Admin:  ADM-SYS-XXXX
 *   Branch Admin: ADM-[BRANCH]-XXXX (e.g. ADM-TAG-001, ADM-VIL-001, ADM-JAS-001)
 *   Cashier:      CSH-[BRANCH]-XXXX (e.g. CSH-TAG-001, CSH-VIL-001, CSH-JAS-001)
 */
export function formatStaffId(user: { id?: string; role?: string; branch?: string | null } | null | undefined): string {
  if (!user || !user.id) return 'STF-001';
  const role = (user.role || '').toUpperCase();
  const idSuffix = user.id.length >= 4 
    ? user.id.substring(user.id.length - 4).toUpperCase() 
    : user.id.toUpperCase().padStart(4, '0');
  
  const rawBranch = (user.branch || 'Tagoloan').trim().toUpperCase();
  let branchCode = 'TAG';
  if (rawBranch.includes('VIL')) {
    branchCode = 'VIL';
  } else if (rawBranch.includes('JAS')) {
    branchCode = 'JAS';
  } else if (rawBranch.includes('TAG')) {
    branchCode = 'TAG';
  } else if (rawBranch.length >= 3) {
    branchCode = rawBranch.substring(0, 3);
  }

  if (role === 'SUPER_ADMIN') {
    return `ADM-SYS-${idSuffix}`;
  } else if (role === 'ADMIN') {
    return `ADM-${branchCode}-${idSuffix}`;
  } else if (role === 'CASHIER') {
    return `CSH-${branchCode}-${idSuffix}`;
  }
  return `STF-${branchCode}-${idSuffix}`;
}
