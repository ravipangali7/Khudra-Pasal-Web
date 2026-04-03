/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public SPA origin for share links when it must differ from `window.location` (no trailing slash). */
  readonly VITE_PUBLIC_APP_URL?: string;
}
