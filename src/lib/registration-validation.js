// Shared registration rules. Client and server enforce equivalent checks.
export const registrationPatterns = {
  name: /^[\p{L}][\p{L}\s'-]{1,59}$/u,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  phone: /^(?:\+234|234|0)[789][01]\d{8}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/
};

export function validateRegistration({ name, email, phone, password, confirmPassword }) {
  if (!registrationPatterns.name.test(String(name || '').trim())) return 'Enter a valid full name (2–60 letters).';
  if (!registrationPatterns.email.test(String(email || '').trim().toLowerCase())) return 'Enter a valid email address.';
  if (!registrationPatterns.phone.test(String(phone || '').replace(/[\s()-]/g, ''))) return 'Enter a valid Nigerian phone number, e.g. 08012345678 or +2348012345678.';
  if (!registrationPatterns.password.test(String(password || ''))) return 'Use 8–128 characters with uppercase, lowercase, a number and a symbol.';
  if (password !== confirmPassword) return 'Passwords do not match.';
  return '';
}
