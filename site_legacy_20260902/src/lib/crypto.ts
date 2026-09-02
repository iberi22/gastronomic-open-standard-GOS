/**
 * Cryptographic utilities using Web Crypto API
 * RSA-OAEP 4096-bit key pairs with PBKDF2 + AES-GCM for key storage
 */

const KEY_PAIR_STORE = 'gos_keys';
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const PBKDF2_ITERATIONS = 100000;

/**
 * Generate a random salt
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Generate a random IV for AES-GCM
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Derive a key from password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const importedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    importedKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data with AES-GCM
 */
async function aesEncrypt(data: Uint8Array, key: CryptoKey): Promise<Uint8Array> {
  const iv = generateIV();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Prepend IV to encrypted data
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encrypted), iv.length);
  return result;
}

/**
 * Decrypt data with AES-GCM
 */
async function aesDecrypt(encryptedData: Uint8Array, key: CryptoKey): Promise<Uint8Array> {
  const iv = encryptedData.slice(0, IV_LENGTH);
  const data = encryptedData.slice(IV_LENGTH);

  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    )
  );
}

/**
 * Open IndexedDB database for key storage
 */
function openKeyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(KEY_PAIR_STORE, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('keys')) {
        db.createObjectStore('keys', { keyPath: 'id' });
      }
    };
  });
}

/**
 * Store encrypted key pair in IndexedDB
 */
async function storeEncryptedKeyPair(id: string, encryptedPrivateKey: Uint8Array, publicKey: JsonWebKey): Promise<void> {
  const db = await openKeyDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readwrite');
    const store = tx.objectStore('keys');

    const request = store.put({
      id,
      encryptedPrivateKey: Array.from(encryptedPrivateKey),
      publicKey,
      createdAt: Date.now()
    });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Retrieve and decrypt private key from IndexedDB
 */
async function retrieveEncryptedKeyPair(id: string): Promise<{ encryptedPrivateKey: Uint8Array; publicKey: JsonWebKey } | null> {
  const db = await openKeyDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readonly');
    const store = tx.objectStore('keys');
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result;
      if (!result) {
        resolve(null);
        return;
      }
      resolve({
        encryptedPrivateKey: new Uint8Array(result.encryptedPrivateKey),
        publicKey: result.publicKey
      });
    };
  });
}

/**
 * Generate RSA-OAEP 4096-bit key pair, encrypt private key with password, and store
 */
export async function generateKeyPair(password: string): Promise<void> {
  // Generate RSA-OAEP 4096-bit key pair
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );

  // Export keys
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);

  // Generate salt for key derivation
  const salt = generateSalt();

  // Derive encryption key from password
  const derivedKey = await deriveKey(password, salt);

  // Encrypt private key with derived key
  const encryptedPrivateKey = await aesEncrypt(new Uint8Array(privateKeyBuffer), derivedKey);

  // Prepend salt to encrypted private key
  const encryptedWithSalt = new Uint8Array(salt.length + encryptedPrivateKey.length);
  encryptedWithSalt.set(salt);
  encryptedWithSalt.set(encryptedPrivateKey, salt.length);

  // Store encrypted key pair and public key
  await storeEncryptedKeyPair('gos_keypair', encryptedWithSalt, JSON.parse(await crypto.subtle.exportKey('jwk', keyPair.publicKey)));

  // Store public key in localStorage for quick access
  localStorage.setItem('gos_public_key', JSON.stringify(JSON.parse(await crypto.subtle.exportKey('jwk', keyPair.publicKey))));

  // Store key existence flag
  localStorage.setItem('gos_has_keys', 'true');
}

/**
 * Decrypt and get private key (requires password)
 */
export async function getPrivateKey(password: string): Promise<CryptoKey | null> {
  const stored = await retrieveEncryptedKeyPair('gos_keypair');
  if (!stored) return null;

  try {
    const salt = stored.encryptedPrivateKey.slice(0, SALT_LENGTH);
    const encryptedKey = stored.encryptedPrivateKey.slice(SALT_LENGTH);

    const derivedKey = await deriveKey(password, new Uint8Array(salt));
    const decryptedBuffer = await aesDecrypt(new Uint8Array(encryptedKey), derivedKey);

    return crypto.subtle.importKey(
      'pkcs8',
      decryptedBuffer,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['decrypt']
    );
  } catch (e) {
    console.error('Failed to decrypt private key:', e);
    return null;
  }
}

/**
 * Get public key (no password required)
 */
export async function getPublicKey(): Promise<string | null> {
  const stored = await retrieveEncryptedKeyPair('gos_keypair');
  if (!stored) {
    // Check localStorage fallback
    const fallback = localStorage.getItem('gos_public_key');
    return fallback;
  }
  return JSON.stringify(stored.publicKey);
}

/**
 * Sign data with private key (requires password)
 */
export async function signData(data: string, password: string): Promise<string> {
  const privateKey = await getPrivateKey(password);
  if (!privateKey) {
    throw new Error('No private key available. Generate keys first.');
  }

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  const signatureBuffer = await crypto.subtle.sign(
    { name: 'RSA-OAEP' },
    privateKey,
    dataBuffer
  );

  // Return as base64
  return btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
}

/**
 * Verify signature with public key
 */
export async function verifySignature(data: string, signature: string, publicKeyJwk: string): Promise<boolean> {
  try {
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      JSON.parse(publicKeyJwk),
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['encrypt']
    );

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));

    return await crypto.subtle.verify(
      { name: 'RSA-OAEP' },
      publicKey,
      signatureBytes,
      dataBuffer
    );
  } catch (e) {
    console.error('Signature verification failed:', e);
    return false;
  }
}

/**
 * Check if keys exist
 */
export async function hasKeys(): Promise<boolean> {
  if (localStorage.getItem('gos_has_keys') === 'true') {
    return true;
  }
  const stored = await retrieveEncryptedKeyPair('gos_keypair');
  return stored !== null;
}

/**
 * Delete keys (for reset)
 */
export async function deleteKeys(): Promise<void> {
  const db = await openKeyDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readwrite');
    const store = tx.objectStore('keys');
    const request = store.delete('gos_keypair');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      localStorage.removeItem('gos_public_key');
      localStorage.removeItem('gos_has_keys');
      resolve();
    };
  });
}