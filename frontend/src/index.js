import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// Suppress ResizeObserver loop errors (harmless browser warning)
const resizeObserverErr = window.onerror;
window.onerror = (message, ...args) => {
  if (message && message.includes && message.includes('ResizeObserver loop')) {
    return true; // Suppress the error
  }
  if (resizeObserverErr) {
    return resizeObserverErr(message, ...args);
  }
};

// Also suppress in error event
window.addEventListener('error', (e) => {
  if (e.message && e.message.includes('ResizeObserver loop')) {
    e.stopPropagation();
    e.preventDefault();
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
