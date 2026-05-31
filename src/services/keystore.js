// keystore.js — IndexedDB wrapper to store E2EE CryptoKey objects locally on the client

const DB_NAME = "pulsechat-e2ee-keystore";
const DB_VERSION = 1;
const STORE_NAME = "keys";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "userId" });
      }
    };
    
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Stores the user's private key and public key hex in IndexedDB.
 * 
 * @param {string} userId - Current user's DB ID
 * @param {CryptoKey} privateKey - Non-exportable ECDH private key object
 * @param {string} publicKeyHex - Raw public key hex string
 * @returns {Promise<boolean>}
 */
export async function storePrivateKey(userId, privateKey, publicKeyHex) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    
    const record = {
      userId,
      privateKey,
      publicKey: publicKeyHex,
      storedAt: Date.now()
    };
    
    const request = store.put(record);
    request.onsuccess = () => resolve(true);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Retrieves the stored key record for a user.
 * 
 * @param {string} userId - Current user's DB ID
 * @returns {Promise<{ userId: string, privateKey: CryptoKey, publicKey: string, storedAt: number }|null>}
 */
export async function getPrivateKey(userId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.get(userId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Wipes all E2EE keys from IndexedDB (called on logout/account deletion).
 * 
 * @returns {Promise<boolean>}
 */
export async function clearKeys() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.clear();
    request.onsuccess = () => resolve(true);
    request.onerror = (event) => reject(event.target.error);
  });
}
