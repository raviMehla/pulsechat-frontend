import { createContext, useContext, useState, useEffect, useRef } from "react";
import { getPrivateKey } from "../services/keystore";
import { deriveMessageKey } from "../services/crypto";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [activeChat, setActiveChat] = useState(null);
  const [privateKey, setPrivateKey] = useState(null);
  const [e2eeReady, setE2eeReady] = useState(false);
  const keyCacheRef = useRef(new Map());

  // ----------------------------------------------------
  // Initializer: Load E2EE Private Key from IndexedDB
  // ----------------------------------------------------
  useEffect(() => {
    async function loadKey() {
      const userId = localStorage.getItem("userId");
      if (userId) {
        try {
          const keyRecord = await getPrivateKey(userId);
          if (keyRecord) {
            setPrivateKey(keyRecord.privateKey);
          }
        } catch (err) {
          console.error("Failed to load E2EE private key from IndexedDB:", err);
        }
      }
      setE2eeReady(true);
    }
    loadKey();
  }, []);

  // ----------------------------------------------------
  // Key Derivation Helper (with memory caching)
  // ----------------------------------------------------
  const getOrDeriveMessageKey = async (otherUserId, otherPublicKeyHex) => {
    if (!privateKey) return null;
    
    const cacheKey = String(otherUserId);
    if (keyCacheRef.current.has(cacheKey)) {
      return keyCacheRef.current.get(cacheKey);
    }
    
    if (!otherPublicKeyHex) return null;
    
    try {
      const aesKey = await deriveMessageKey(privateKey, otherPublicKeyHex);
      keyCacheRef.current.set(cacheKey, aesKey);
      return aesKey;
    } catch (err) {
      console.error(`Failed to derive key for user ${otherUserId}:`, err);
      return null;
    }
  };

  // ----------------------------------------------------
  // E2EE Decryption Engine
  // ----------------------------------------------------
  const getOrDeriveGroupKey = async (chat) => {
    if (!chat || !privateKey) return null;
    const chatId = String(chat._id || chat);

    if (keyCacheRef.current.has(chatId)) {
      return keyCacheRef.current.get(chatId);
    }

    let fullChat = activeChat;
    if (!fullChat || String(fullChat._id) !== chatId) {
      if (chat && typeof chat === "object" && chat.encryptedGroupKeys) {
        fullChat = chat;
      } else {
        return null;
      }
    }

    if (!fullChat.encryptedGroupKeys || fullChat.encryptedGroupKeys.length === 0) {
      return null;
    }

    const currentUserId = localStorage.getItem("userId");
    const myKeySlot = fullChat.encryptedGroupKeys.find(
      k => String(k.userId?._id || k.userId) === String(currentUserId)
    );

    if (!myKeySlot) {
      console.warn(`No group key slot found for current user in chat ${chatId}`);
      return null;
    }

    try {
      const parts = myKeySlot.encryptedKey.split(":");
      if (parts.length !== 2) {
        console.error("Group key slot format is invalid, expected ephemeralPublicKey:ciphertext");
        return null;
      }
      const [ephemeralPublicKeyHex, ciphertextHex] = parts;

      const { decryptECIES, importSymmetricKey } = await import("../services/crypto");
      const groupKeyHex = await decryptECIES(
        ciphertextHex,
        privateKey,
        myKeySlot.iv,
        ephemeralPublicKeyHex
      );

      const aesKey = await importSymmetricKey(groupKeyHex);
      keyCacheRef.current.set(chatId, aesKey);
      return aesKey;
    } catch (err) {
      console.error(`Failed to decrypt group key for chat ${chatId}:`, err);
      return null;
    }
  };

  const decryptMessagePayload = async (msg) => {
    if (!msg || !msg.isEncrypted || !msg.content || msg.isDecrypted) return msg;

    const currentUserId = localStorage.getItem("userId");

    // Check if the chat is a group chat
    let isGroupChat = false;
    let chatObj = msg.chat;
    if (chatObj && typeof chatObj === "object") {
      isGroupChat = chatObj.isGroup;
    } else if (activeChat && String(activeChat._id) === String(msg.chat)) {
      isGroupChat = activeChat.isGroup;
      chatObj = activeChat;
    }

    if (isGroupChat) {
      const aesKey = await getOrDeriveGroupKey(chatObj);
      if (!aesKey) return msg;

      try {
        const { decryptMessage } = await import("../services/crypto");
        const plaintext = await decryptMessage(msg.content, aesKey, msg.iv);
        return {
          ...msg,
          content: plaintext,
          isDecrypted: true
        };
      } catch (err) {
        console.error(`Group decryption failed for message ${msg._id || msg.id}:`, err);
        return {
          ...msg,
          content: "🔒 Decryption failed: incorrect key or corrupted payload",
          isDecrypted: false
        };
      }
    } else {
      const senderId = msg.sender?._id || msg.sender;
      let otherUserId = null;
      let otherPublicKey = null;

      if (String(senderId) === String(currentUserId)) {
        // Current user is sender: look up recipient in activeChat users
        if (activeChat && activeChat.users) {
          const otherUser = activeChat.users.find(u => u && String(u._id || u) !== String(currentUserId));
          if (otherUser) {
            otherUserId = otherUser._id || otherUser;
            otherPublicKey = otherUser.e2ee?.publicKey || otherUser.publicKey;
          }
        }
      } else {
        // Other user is sender
        otherUserId = senderId;
        otherPublicKey = msg.sender?.e2ee?.publicKey || msg.sender?.publicKey;
      }

      if (!otherUserId || !otherPublicKey) {
        return msg;
      }

      const aesKey = await getOrDeriveMessageKey(otherUserId, otherPublicKey);
      if (!aesKey) return msg;

      try {
        const { decryptMessage } = await import("../services/crypto");
        const plaintext = await decryptMessage(msg.content, aesKey, msg.iv);
        return {
          ...msg,
          content: plaintext,
          isDecrypted: true
        };
      } catch (err) {
        console.error(`Decryption failed for message ${msg._id || msg.id}:`, err);
        return {
          ...msg,
          content: "🔒 Decryption failed: incorrect key or corrupted payload",
          isDecrypted: false
        };
      }
    }
  };

  // ----------------------------------------------------
  // E2EE Encryption Engine
  // ----------------------------------------------------
  const encryptMessagePayload = async (plaintext, otherUserId, otherPublicKeyHex) => {
    if (!privateKey) throw new Error("E2EE private key is not initialized");
    
    const aesKey = await getOrDeriveMessageKey(otherUserId, otherPublicKeyHex);
    if (!aesKey) throw new Error("Could not derive symmetric encryption key");

    const { encryptMessage } = await import("../services/crypto");
    const { ciphertext, iv } = await encryptMessage(plaintext, aesKey);
    return { ciphertext, iv };
  };

  const encryptGroupMessagePayload = async (plaintext, chatId) => {
    if (!privateKey) throw new Error("E2EE private key is not initialized");

    const aesKey = await getOrDeriveGroupKey(chatId);
    if (!aesKey) throw new Error("Could not retrieve group encryption key");

    const { encryptMessage } = await import("../services/crypto");
    const { ciphertext, iv } = await encryptMessage(plaintext, aesKey);
    return { ciphertext, iv };
  };

  const generateGroupE2EEPayload = async (members) => {
    const groupKeyBytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
    const { bufToHex, encryptECIES } = await import("../services/crypto");
    const groupKeyHex = bufToHex(groupKeyBytes);

    const encryptedKeys = [];
    const currentUserId = localStorage.getItem("userId");
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const currentUserPublicKey = currentUser.e2ee?.publicKey || currentUser.publicKey;

    const allMembers = [...members];
    if (currentUserPublicKey && !allMembers.some(m => String(m._id || m) === String(currentUserId))) {
      allMembers.push({
        _id: currentUserId,
        e2ee: { publicKey: currentUserPublicKey }
      });
    }

    for (const member of allMembers) {
      const pubKey = member.e2ee?.publicKey || member.publicKey;
      if (!pubKey) continue;
      try {
        const ecies = await encryptECIES(groupKeyHex, pubKey);
        encryptedKeys.push({
          userId: member._id || member,
          encryptedKey: `${ecies.ephemeralPublicKey}:${ecies.ciphertext}`,
          iv: ecies.iv
        });
      } catch (err) {
        console.error(`Failed to encrypt group key for member ${member._id || member}:`, err);
      }
    }

    return {
      groupKeyHex,
      encryptedGroupKeys: encryptedKeys
    };
  };

  const cacheGroupKey = async (chatId, groupKeyHex) => {
    try {
      const { importSymmetricKey } = await import("../services/crypto");
      const aesKey = await importSymmetricKey(groupKeyHex);
      keyCacheRef.current.set(String(chatId), aesKey);
    } catch (err) {
      console.error("Failed to cache group key:", err);
    }
  };

  const encryptGroupKeyForUser = async (chat, targetUser) => {
    const currentUserId = localStorage.getItem("userId");
    const myKeySlot = chat.encryptedGroupKeys?.find(
      k => String(k.userId?._id || k.userId) === String(currentUserId)
    );

    if (!myKeySlot) {
      throw new Error("No group key slot found for current user to perform E2EE addition");
    }

    const parts = myKeySlot.encryptedKey.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid group key slot format");
    }
    const [ephemeralPublicKeyHex, ciphertextHex] = parts;

    const { decryptECIES, encryptECIES } = await import("../services/crypto");
    const groupKeyHex = await decryptECIES(
      ciphertextHex,
      privateKey,
      myKeySlot.iv,
      ephemeralPublicKeyHex
    );

    const targetPublicKey = targetUser.e2ee?.publicKey || targetUser.publicKey;
    if (!targetPublicKey) {
      throw new Error("Target user does not have an E2EE public key");
    }

    const ecies = await encryptECIES(groupKeyHex, targetPublicKey);
    return {
      encryptedKey: `${ecies.ephemeralPublicKey}:${ecies.ciphertext}`,
      iv: ecies.iv,
      keyVersion: myKeySlot.keyVersion || chat.groupKeyVersion || 1
    };
  };

  const rotateGroupKeyPayload = async (chat, excludedUserId) => {
    const groupKeyBytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
    const { bufToHex, encryptECIES } = await import("../services/crypto");
    const newGroupKeyHex = bufToHex(groupKeyBytes);

    const remainingMembers = chat.users.filter(u => String(u._id || u) !== String(excludedUserId));
    const encryptedKeys = [];
    const nextKeyVersion = (chat.groupKeyVersion || 1) + 1;

    for (const member of remainingMembers) {
      const pubKey = member.e2ee?.publicKey || member.publicKey;
      if (!pubKey) continue;
      try {
        const ecies = await encryptECIES(newGroupKeyHex, pubKey);
        encryptedKeys.push({
          userId: member._id || member,
          encryptedKey: `${ecies.ephemeralPublicKey}:${ecies.ciphertext}`,
          iv: ecies.iv,
          keyVersion: nextKeyVersion
        });
      } catch (err) {
        console.error(`Failed to encrypt rotated key for member ${member._id || member}:`, err);
      }
    }

    return {
      groupKeyHex: newGroupKeyHex,
      encryptedGroupKeys: encryptedKeys
    };
  };

  const clearE2eeSession = () => {
    setPrivateKey(null);
    keyCacheRef.current.clear();
  };

  return (
    <ChatContext.Provider
      value={{
        activeChat,
        setActiveChat,
        privateKey,
        setPrivateKey,
        e2eeReady,
        decryptMessagePayload,
        encryptMessagePayload,
        encryptGroupMessagePayload,
        generateGroupE2EEPayload,
        cacheGroupKey,
        encryptGroupKeyForUser,
        rotateGroupKeyPayload,
        clearE2eeSession
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useChat = () => useContext(ChatContext);