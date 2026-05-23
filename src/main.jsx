import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { BrowserRouter } from "react-router-dom";
import { ChatProvider } from "./context/ChatContext";
import { CallProvider } from "./context/CallContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ChatProvider>
      <CallProvider>
        <App />
      </CallProvider>
    </ChatProvider>
  </BrowserRouter>
);