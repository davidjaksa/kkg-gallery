export const MIN_PASSWORD_LENGTH = 12;

export function passwordTooShort(password: string): boolean {
  return password.length < MIN_PASSWORD_LENGTH;
}
