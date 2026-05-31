/**
 * PulseChat - Real-Time Encrypted Messaging System (Web Client)
 * 
 * Cryptographic Signature & Verification Hash
 * --------------------------------------------------
 * Developer Name : Ravi Mehla
 * Roll Number    : 19590
 * College Name   : SKD University
 * Signature Hash : 69f1589e1eeb95b42956e3f21cae32c0a9f79cd3db1b4adf7e78ca1e08a16491
 * --------------------------------------------------
 * Verification command: node verify-owner.js
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

console.log(
  "%c PulseChat %c Signed by Ravi Mehla (19590) - SKD University %c Hash: 69f1589e1eeb95b42956e3f21cae32c0a9f79cd3db1b4adf7e78ca1e08a16491",
  "background: #4F46E5; color: #fff; padding: 3px 6px; border-radius: 3px 0 0 3px; font-weight: bold;",
  "background: #10B981; color: #fff; padding: 3px 6px; font-weight: 500;",
  "background: #3B82F6; color: #fff; padding: 3px 6px; border-radius: 0 3px 3px 0; font-family: monospace;"
);

import { BrowserRouter } from "react-router-dom";
import { ChatProvider } from "./context/ChatContext";
import { CallProvider } from "./context/CallContext";
import ErrorBoundary from "./components/common/ErrorBoundary";
import localforage from "localforage";

localforage.config({
  name: "PulseChat",
  storeName: "offline_cache"
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ChatProvider>
          <CallProvider>
            <App />
          </CallProvider>
        </ChatProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);