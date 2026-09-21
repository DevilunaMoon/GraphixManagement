/**
 * Shared Password Validation & Security Policy for Graphix
 * Aligned with standards-based information security practices.
 */

export interface PasswordRequirementStatus {
  minLength: boolean;        // At least 8 characters
  hasUppercase: boolean;     // At least 1 uppercase letter (A-Z)
  hasLowercase: boolean;     // At least 1 lowercase letter (a-z)
  hasNumber: boolean;        // At least 1 number (0-9)
  hasSpecialChar: boolean;   // At least 1 special character
  noSpaces: boolean;         // No spaces
  noInvalidChars: boolean;   // No unsupported / control / non-printable characters
  isValid: boolean;          // True only if all criteria are satisfied
}

// Allowed special characters standard list:
// ! @ # $ % ^ & * ( ) _ - + = [ ] { } : ; , . ? / \ | ~ ` < > " '
export const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_\-+={\}\[\]:;"'<>,.?\/\\|~`]/;

// Check for spaces or whitespace of any kind
export const SPACE_REGEX = /\s/;

// Control characters or non-printable ASCII
export const CONTROL_CHAR_REGEX = /[\x00-\x1F\x7F]/;

// Allowed character set (Printable ASCII without whitespace)
// ASCII 33 (!) through 126 (~)
export const ALLOWED_PASSWORD_CHAR_REGEX = /^[\x21-\x7E]+$/;

/**
 * Checks all individual password criteria in real time.
 */
export function checkPasswordRequirements(password: string = ""): PasswordRequirementStatus {
  const pwd = password || "";

  const minLength = pwd.length >= 8;
  const hasUppercase = /[A-Z]/.test(pwd);
  const hasLowercase = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecialChar = SPECIAL_CHAR_REGEX.test(pwd);
  const noSpaces = pwd.length > 0 ? !SPACE_REGEX.test(pwd) : false;
  
  // Characters must be non-empty and conform strictly to printable non-whitespace ASCII
  const noInvalidChars = pwd.length > 0 ? (!CONTROL_CHAR_REGEX.test(pwd) && ALLOWED_PASSWORD_CHAR_REGEX.test(pwd)) : false;

  const isValid =
    minLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecialChar &&
    noSpaces &&
    noInvalidChars;

  return {
    minLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    noSpaces,
    noInvalidChars,
    isValid,
  };
}

/**
 * Checks specifically for invalid or unsupported characters.
 */
export function detectInvalidPasswordChars(password: string = ""): { hasInvalid: boolean; error?: string } {
  if (!password) return { hasInvalid: false };

  if (SPACE_REGEX.test(password)) {
    return {
      hasInvalid: true,
      error: "Password cannot contain spaces.",
    };
  }

  if (CONTROL_CHAR_REGEX.test(password) || !ALLOWED_PASSWORD_CHAR_REGEX.test(password)) {
    return {
      hasInvalid: true,
      error: "Password contains an invalid character.",
    };
  }

  return { hasInvalid: false };
}

/**
 * Validates a password on server or client and returns a user-friendly error string if invalid.
 */
export function validatePassword(password: string = ""): { isValid: boolean; error?: string; requirements: PasswordRequirementStatus } {
  const requirements = checkPasswordRequirements(password);

  if (!password) {
    return {
      isValid: false,
      error: "Password is required.",
      requirements,
    };
  }

  const invalidCheck = detectInvalidPasswordChars(password);
  if (invalidCheck.hasInvalid) {
    return {
      isValid: false,
      error: invalidCheck.error || "Password contains an invalid character.",
      requirements,
    };
  }

  if (!requirements.minLength) {
    return {
      isValid: false,
      error: "Password must be at least 8 characters long.",
      requirements,
    };
  }

  if (!requirements.hasUppercase) {
    return {
      isValid: false,
      error: "Password must contain at least 1 uppercase letter (A-Z).",
      requirements,
    };
  }

  if (!requirements.hasLowercase) {
    return {
      isValid: false,
      error: "Password must contain at least 1 lowercase letter (a-z).",
      requirements,
    };
  }

  if (!requirements.hasNumber) {
    return {
      isValid: false,
      error: "Password must contain at least 1 number (0-9).",
      requirements,
    };
  }

  if (!requirements.hasSpecialChar) {
    return {
      isValid: false,
      error: "Password must contain at least 1 special character.",
      requirements,
    };
  }

  return {
    isValid: true,
    requirements,
  };
}
