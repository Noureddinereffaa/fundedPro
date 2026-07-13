export const PASSWORD_MIN_LENGTH = 8

export function validatePassword(password: string): string | null {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter'
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number'
  }
  if (!/[!@#$%^&*(),.?":{}|<>_\-]/.test(password)) {
    return 'Password must contain at least one special character'
  }
  return null
}
