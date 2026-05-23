import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { BrowserRouter } from "react-router-dom";
import { ChatProvider } from "./context/ChatContext";
import { CallProvider } from "./context/CallContext";
import localforage from "localforage";

localforage.config({
  name: "PulseChat",
  storeName: "offline_cache"
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ChatProvider>
      <CallProvider>
        <App />
      </CallProvider>
    </ChatProvider>
  </BrowserRouter>
);