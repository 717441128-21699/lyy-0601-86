import CryptoJS from 'crypto-js';

const STORAGE_KEY = 'health_manager_encrypted';
const SALT = 'health_manager_salt_2024';

export function generateKey(password: string): string {
  return CryptoJS.PBKDF2(password, SALT, { keySize: 256 / 32 }).toString();
}

export function encrypt(data: unknown, key: string): string {
  return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
}

export function decrypt<T = unknown>(encryptedData: string, key: string): T | null {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted) as T;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password + SALT).toString();
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function saveEncryptedData(data: unknown, key: string): void {
  const encrypted = encrypt(data, key);
  localStorage.setItem(STORAGE_KEY, encrypted);
}

export function loadEncryptedData<T = unknown>(key: string): T | null {
  const encrypted = localStorage.getItem(STORAGE_KEY);
  if (!encrypted) return null;
  return decrypt<T>(encrypted, key);
}

export function hasStoredData(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

export function hasPasswordHash(): boolean {
  return localStorage.getItem('health_manager_pwd') !== null;
}

export function savePasswordHash(hash: string): void {
  localStorage.setItem('health_manager_pwd', hash);
}

export function getPasswordHash(): string | null {
  return localStorage.getItem('health_manager_pwd');
}

export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('health_manager_pwd');
}
