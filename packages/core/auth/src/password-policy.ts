// Lunghezza minima password
export const MIN_PASSWORD_LENGTH = 8

export function validatePasswordPolicy(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La password deve essere di almeno ${MIN_PASSWORD_LENGTH} caratteri.`
  }

  return null
}
