import { buildAuthenticatedApiUrl, getAuthToken } from "@/lib/api";
import { isNativeAppShell } from "@/lib/nativeAppShell";

export const NATIVE_DOWNLOAD_RESULT_EVENT = "khudra-native-download-result";

/** Stay under Android WebView JavascriptInterface message limits (~2–4 MB). */
const NATIVE_BRIDGE_MAX_BYTES = 1.5 * 1024 * 1024;

export type NativeDownloadResultDetail = {
  requestId?: string;
  ok?: boolean;
  path?: string;
  error?: string;
};

declare global {
  interface Window {
    KhudraFileDownload?: { postMessage: (message: string) => void };
  }
}

function newRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `kp-dl-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "*/*",
  };
  const token = getAuthToken();
  if (token) headers.Authorization = `Token ${token}`;
  return headers;
}

function postNativeDownloadRequest(detail: Record<string, unknown>): Promise<NativeDownloadResultDetail> {
  const requestId = newRequestId();
  const payload = { requestId, ...detail };

  return new Promise((resolve) => {
    const timeoutMs = 120_000;
    const timeout = window.setTimeout(() => {
      cleanup();
      resolve({ requestId, ok: false, error: "timeout" });
    }, timeoutMs);

    const onResult = (ev: Event) => {
      const d = (ev as CustomEvent<NativeDownloadResultDetail>).detail;
      if (!d || d.requestId !== requestId) return;
      cleanup();
      resolve(d);
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      window.removeEventListener(NATIVE_DOWNLOAD_RESULT_EVENT, onResult);
    };

    window.addEventListener(NATIVE_DOWNLOAD_RESULT_EVENT, onResult);

    try {
      const json = JSON.stringify(payload);
      if (window.KhudraFileDownload?.postMessage) {
        window.KhudraFileDownload.postMessage(json);
        return;
      }
    } catch {
      /* channel unavailable */
    }
    cleanup();
    resolve({ requestId, ok: false, error: "no_bridge" });
  });
}

function downloadOk(result: NativeDownloadResultDetail): boolean {
  return result.ok === true || (result.ok as unknown) === "true";
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Trigger a browser download (web fallback). */
export function downloadBlobInBrowser(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function downloadViaNativeBridge(
  filename: string,
  options: { mimeType?: string; blob?: Blob; path?: string },
): Promise<boolean> {
  const mimeType =
    options.mimeType || options.blob?.type || "application/octet-stream";

  if (options.blob && options.blob.size > 0 && options.blob.size <= NATIVE_BRIDGE_MAX_BYTES) {
    const result = await postNativeDownloadRequest({
      filename,
      mimeType,
      base64: await blobToBase64(options.blob),
    });
    return downloadOk(result);
  }

  const path = options.path ?? "";
  if (!path) return false;

  const result = await postNativeDownloadRequest({
    filename,
    mimeType,
    url: buildAuthenticatedApiUrl(path),
    headers: authHeaders(),
  });
  return downloadOk(result);
}

/**
 * Download a file in the Flutter app (Downloads folder) or via browser anchor on web.
 */
export async function downloadBlobAsFile(
  blob: Blob,
  filename: string,
  options?: { mimeType?: string },
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (isNativeAppShell()) {
    return downloadViaNativeBridge(filename, { mimeType: options?.mimeType, blob });
  }

  downloadBlobInBrowser(blob, filename);
  return true;
}

/** Download an authenticated API path (support attachments, bills, etc.). */
export async function downloadAuthenticatedPath(
  path: string,
  filename: string,
  options?: { mimeType?: string; blob?: Blob },
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (isNativeAppShell()) {
    return downloadViaNativeBridge(filename, {
      mimeType: options?.mimeType,
      blob: options?.blob,
      path,
    });
  }

  const { fetchAuthenticatedBlob } = await import("@/lib/api");
  const blob = options?.blob ?? (await fetchAuthenticatedBlob(path));
  downloadBlobInBrowser(blob, filename);
  return true;
}

export function isPdfAttachment(filename: string, mimeType?: string): boolean {
  const t = (mimeType || "").toLowerCase();
  if (t === "application/pdf") return true;
  return filename.toLowerCase().endsWith(".pdf");
}
