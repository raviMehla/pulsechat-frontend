// crypto.js — Complete client-side E2EE helper using the Web Cryptography API

const PBKDF2_ITERATIONS = 600000;
const DOMAIN_AUTH = "whatsapp-clone-auth-v1";
const DOMAIN_KEY  = "whatsapp-clone-e2ee-v1";

// ==========================================
// UTILITY FUNCTIONS: BUFFER / HEX CONVERTERS
// ==========================================

export function bufToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hexToBuf(hexString) {
  if (!hexString) return new Uint8Array(0).buffer;
  const matches = hexString.match(/.{1,2}/g);
  if (!matches) return new Uint8Array(0).buffer;
  return new Uint8Array(matches.map(byte => parseInt(byte, 16))).buffer;
}

// ==========================================
// PASSWORD KEY DERIVATION (PBKDF2)
// ==========================================

/**
 * Derives authToken (for login verification) and KEK (for private key encryption) from raw password.
 * This runs asynchronously using the browser's native C++ Web Cryptography engine.
 * 
 * @param {string} password - The raw user password
 * @param {string} authSalt - Hex salt for the authentication path
 * @param {string} keySalt - Hex salt for the KEK path
 * @returns {Promise<{ authToken: string, kek: CryptoKey }>}
 */
export async function deriveFromPassword(password, authSalt, keySalt) {
  const enc = new TextEncoder();
  
  // Import the raw password as a key for PBKDF2
  const rawKey = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  // 1. Derive Auth Token (will be sent to the server for authentication)
  // We mix domain separation into the salt to ensure authBits !== keyBits
  const authSaltBuffer = enc.encode(authSalt + DOMAIN_AUTH);
  const authBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: authSaltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    rawKey,
    256
  );
  const authToken = bufToHex(authBits);

  // 2. Derive Key Encryption Key (KEK - remains local, never sent to server)
  const keySaltBuffer = enc.encode(keySalt + DOMAIN_KEY);
  const kek = await globalThis.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: keySaltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    rawKey,
    { name: "AES-GCM", length: 256 },
    false, // Non-extractable (cannot be exported out of the browser memory)
    ["encrypt", "decrypt"]
  );

  return { authToken, kek };
}

/**
 * Derives a Recovery Key Encryption Key (Recovery KEK) from the recovery mnemonic.
 * 
 * @param {string} mnemonic - The 12-word mnemonic string
 * @param {string} saltInfo - Custom salt information (e.g. username/email)
 * @returns {Promise<CryptoKey>} Derived AES-GCM key
 */
export async function deriveRecoveryKey(mnemonic, saltInfo) {
  const enc = new TextEncoder();
  const rawKey = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(mnemonic),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return await globalThis.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(saltInfo + "recovery-v1"),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    rawKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// ==========================================
// ASYMMETRIC KEY MANAGEMENT (ECDH P-256)
// ==========================================

/**
 * Generates an ECDH P-256 key pair.
 * 
 * @returns {Promise<CryptoKeyPair>}
 */
export async function generateECDHKeyPair() {
  return await globalThis.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true, // Extractable (private key exported once for encrypted backup, public key shared)
    ["deriveKey", "deriveBits"]
  );
}

/**
 * Exports the raw hex representation of an ECDH public key.
 * 
 * @param {CryptoKey} publicKey 
 * @returns {Promise<string>} Hex representation of public key
 */
export async function exportPublicKey(publicKey) {
  const exported = await globalThis.crypto.subtle.exportKey("raw", publicKey);
  return bufToHex(exported);
}

/**
 * Imports an ECDH public key from its raw hex representation.
 * 
 * @param {string} publicKeyHex 
 * @returns {Promise<CryptoKey>}
 */
export async function importPublicKey(publicKeyHex) {
  const buffer = hexToBuf(publicKeyHex);
  return await globalThis.crypto.subtle.importKey(
    "raw",
    buffer,
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    []
  );
}

// ==========================================
// PRIVATE KEY BACKUP & RESTORE (AES-GCM-256)
// ==========================================

/**
 * Encrypts the ECDH private key using the derived KEK for secure database backup.
 * 
 * @param {CryptoKey} privateKey - ECDH private key
 * @param {CryptoKey} kek - Derived AES-GCM Key Encryption Key
 * @returns {Promise<{ encryptedPrivateKey: string, keyIv: string }>}
 */
export async function encryptPrivateKeyForBackup(privateKey, kek) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  
  // Export private key as PKCS#8 bytes
  const exportedKeyBytes = await globalThis.crypto.subtle.exportKey("pkcs8", privateKey);
  
  // Encrypt PKCS#8 bytes with KEK
  const ciphertext = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    kek,
    exportedKeyBytes
  );

  return {
    encryptedPrivateKey: bufToHex(ciphertext),
    keyIv: bufToHex(iv)
  };
}

/**
 * Decrypts the ECDH private key retrieved from server backup.
 * 
 * @param {string} encryptedPrivKeyHex - Hex cipher text from server
 * @param {CryptoKey} kek - Derived AES-GCM Key Encryption Key
 * @param {string} keyIvHex - Hex IV from server
 * @returns {Promise<CryptoKey>} ECDH Private Key object
 */
export async function decryptPrivateKeyFromBackup(encryptedPrivKeyHex, kek, keyIvHex) {
  const iv = hexToBuf(keyIvHex);
  const ciphertext = hexToBuf(encryptedPrivKeyHex);

  // Decrypt ciphertext using KEK to get PKCS#8 bytes
  const pkcs8 = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    kek,
    ciphertext
  );

  // Import PKCS#8 bytes back as a functional ECDH private key
  return await globalThis.crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    ["deriveKey", "deriveBits"]
  );
}

// ==========================================
// PAIRWISE KEY AGREEMENT & SYMMETRIC ENCRYPTION
// ==========================================

/**
 * Derives a symmetric AES-GCM-256 key from an ECDH agreement between own private key and their public key.
 * Uses HKDF-SHA256 for key derivation to protect the shared secret.
 * 
 * @param {CryptoKey} ownPrivateKey - Sender's/Receiver's ECDH private key
 * @param {string} theirPublicKeyHex - Remote user's ECDH public key (hex)
 * @returns {Promise<CryptoKey>} Derived AES-GCM-256 message key
 */
export async function deriveMessageKey(ownPrivateKey, theirPublicKeyHex) {
  const theirPublicKey = await importPublicKey(theirPublicKeyHex);
  
  // Derive raw bits using ECDH
  const sharedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: theirPublicKey
    },
    ownPrivateKey,
    256
  );

  // Import raw bits as HKDF input key material
  const hkdfKey = await globalThis.crypto.subtle.importKey(
    "raw",
    sharedBits,
    "HKDF",
    false,
    ["deriveKey"]
  );

  // Derive final message key using HKDF-SHA256
  return await globalThis.crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32), // Non-secret static salt
      info: new TextEncoder().encode("whatsapp-clone-msg-v1")
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false, // Non-extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a plaintext message using a derived message key.
 * 
 * @param {string} plaintext - Raw text message
 * @param {CryptoKey} messageKey - AES-GCM-256 key
 * @returns {Promise<{ ciphertext: string, iv: string }>}
 */
export async function encryptMessage(plaintext, messageKey) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(plaintext);
  
  const ciphertext = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    messageKey,
    encodedText
  );

  return {
    ciphertext: bufToHex(ciphertext),
    iv: bufToHex(iv)
  };
}

/**
 * Decrypts a ciphertext message using a derived message key.
 * 
 * @param {string} ciphertextHex - Hex ciphertext
 * @param {CryptoKey} messageKey - AES-GCM-256 key
 * @param {string} ivHex - Hex IV
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decryptMessage(ciphertextHex, messageKey, ivHex) {
  const iv = hexToBuf(ivHex);
  const ciphertext = hexToBuf(ciphertextHex);

  const decryptedBytes = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    messageKey,
    ciphertext
  );

  return new TextDecoder().decode(decryptedBytes);
}

/**
 * Imports a raw hex symmetric key (e.g. GroupKey) for AES-GCM-256 operations.
 * 
 * @param {string} keyHex - The hex-encoded 256-bit symmetric key
 * @returns {Promise<CryptoKey>}
 */
export async function importSymmetricKey(keyHex) {
  const buffer = hexToBuf(keyHex);
  return await globalThis.crypto.subtle.importKey(
    "raw",
    buffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a plaintext string using ECIES for a target recipient's public key.
 * 
 * @param {string} plaintext 
 * @param {string} recipientPublicKeyHex 
 * @returns {Promise<{ ciphertext: string, iv: string, ephemeralPublicKey: string }>}
 */
export async function encryptECIES(plaintext, recipientPublicKeyHex) {
  const ephemeralKeyPair = await globalThis.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );

  const recipientPublicKey = await importPublicKey(recipientPublicKeyHex);

  const sharedBits = await globalThis.crypto.subtle.deriveBits(
    { name: "ECDH", public: recipientPublicKey },
    ephemeralKeyPair.privateKey,
    256
  );

  const hkdfKey = await globalThis.crypto.subtle.importKey(
    "raw",
    sharedBits,
    "HKDF",
    false,
    ["deriveKey"]
  );

  const aesKey = await globalThis.crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32),
      info: new TextEncoder().encode("whatsapp-clone-ecies-v1")
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    new TextEncoder().encode(plaintext)
  );

  const ephemeralPublicKey = await exportPublicKey(ephemeralKeyPair.publicKey);

  return {
    ciphertext: bufToHex(ciphertext),
    iv: bufToHex(iv),
    ephemeralPublicKey
  };
}

/**
 * Decrypts ECIES ciphertext using own private key and the ephemeral public key.
 * 
 * @param {string} ciphertextHex 
 * @param {CryptoKey} ownPrivateKey 
 * @param {string} ivHex 
 * @param {string} ephemeralPublicKeyHex 
 * @returns {Promise<string>}
 */
export async function decryptECIES(ciphertextHex, ownPrivateKey, ivHex, ephemeralPublicKeyHex) {
  const ephemeralPublicKey = await importPublicKey(ephemeralPublicKeyHex);

  const sharedBits = await globalThis.crypto.subtle.deriveBits(
    { name: "ECDH", public: ephemeralPublicKey },
    ownPrivateKey,
    256
  );

  const hkdfKey = await globalThis.crypto.subtle.importKey(
    "raw",
    sharedBits,
    "HKDF",
    false,
    ["deriveKey"]
  );

  const aesKey = await globalThis.crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32),
      info: new TextEncoder().encode("whatsapp-clone-ecies-v1")
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  const decryptedBytes = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: hexToBuf(ivHex) },
    aesKey,
    hexToBuf(ciphertextHex)
  );

  return new TextDecoder().decode(decryptedBytes);
}
