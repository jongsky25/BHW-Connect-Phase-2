// NIST SP 800-63B calls for blocking known-compromised/common passwords
// rather than composition rules (delivery-plan.md §5.1). This is a starter
// list of the passwords that show up at the top of every public breach
// corpus; it's meant to grow from real signals (breach lists, the app's own
// lockout data), not to be exhaustive on day one.
const COMMON_PASSWORDS = new Set(
  [
    "123456",
    "123456789",
    "12345678",
    "12345",
    "1234567",
    "1234567890",
    "qwerty",
    "qwerty123",
    "password",
    "password1",
    "password123",
    "111111",
    "123123",
    "abc123",
    "1q2w3e4r",
    "iloveyou",
    "admin",
    "admin123",
    "welcome",
    "welcome1",
    "letmein",
    "monkey",
    "dragon",
    "football",
    "baseball",
    "sunshine",
    "princess",
    "trustno1",
    "000000",
    "11111111",
    "87654321",
    "qwertyuiop",
    "asdfghjkl",
    "changeme",
    "passw0rd",
    "P@ssw0rd",
    "philippines",
    "mahalkita",
    "iloveyou1",
    "barangay",
  ].map((password) => password.toLowerCase()),
);

export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.trim().toLowerCase());
}
