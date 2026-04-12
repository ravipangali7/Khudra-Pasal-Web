import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.tsx";
import "./index.css";
import { API_BASE } from "./lib/api";

/** Lets the native Android WebView shell POST `/auth/fcm-token/` to the same API origin as this build. */
try {
  let u = (API_BASE || "/api").trim();
  if (!u.startsWith("http")) {
    u = `${window.location.origin.replace(/\/$/, "")}${u.startsWith("/") ? u : `/${u}`}`;
  }
  localStorage.setItem("khudrapasal_api_base", u.replace(/\/$/, ""));
} catch {
  /* private mode / quota */
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={googleClientId}>
    <App />
  </GoogleOAuthProvider>,
);
