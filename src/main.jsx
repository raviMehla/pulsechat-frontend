import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

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