import { isNativeAppShell } from "@/lib/nativeAppShell";

/** Web → Flutter: open native file / camera picker. */
export const NATIVE_FILE_PICK_REQUEST_EVENT = "khudra-native-file-pick-request";

/** Flutter → Web: picked file payloads (base64) for FormData uploads. */
export const NATIVE_FILE_PICK_RESULT_EVENT = "khudra-native-file-pick-result";

export type NativeFilePickSource = "camera" | "video" | "gallery" | "file";

export type NativeFilePickOptions = {
  accept?: string;
  multiple?: boolean;
  capture?: boolean | "environment" | "user";
  source?: NativeFilePickSource;
};

export type NativeFilePickPayload = {
  name: string;
  mimeType: string;
  base64: string;
};

type NativeFilePickResultDetail = {
  requestId?: string;
  files?: NativeFilePickPayload[];
  error?: string;
};

declare global {
  interface Window {
    KhudraFilePick?: { postMessage: (message: string) => void };
    __kpNativeFilePickListener?: boolean;
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function filesFromNativePickPayloads(payloads: NativeFilePickPayload[]): File[] {
  return payloads
    .filter((p) => p.base64 && p.name)
    .map((p) => {
      const bytes = base64ToUint8Array(p.base64);
      const mime = p.mimeType?.trim() || "application/octet-stream";
      return new File([bytes], p.name, { type: mime, lastModified: Date.now() });
    })
    .filter((f) => f.size > 0);
}

export function fileListFromFiles(files: File[]): FileList {
  const dt = new DataTransfer();
  for (const f of files) {
    dt.items.add(f);
  }
  return dt.files;
}

function newRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `kp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function postNativePickRequest(detail: Record<string, unknown>): void {
  try {
    const payload = JSON.stringify(detail);
    if (window.KhudraFilePick?.postMessage) {
      window.KhudraFilePick.postMessage(payload);
      return;
    }
  } catch {
    /* channel unavailable */
  }
  window.dispatchEvent(new CustomEvent(NATIVE_FILE_PICK_REQUEST_EVENT, { detail }));
}

/**
 * Opens the Flutter native picker and returns real `File` blobs for Django multipart uploads.
 */
export function pickNativeFiles(options: NativeFilePickOptions = {}): Promise<File[]> {
  if (typeof window === "undefined" || !isNativeAppShell()) {
    return Promise.resolve([]);
  }

  const requestId = newRequestId();
  const detail: Record<string, unknown> = {
    requestId,
    accept: options.accept ?? "",
    multiple: options.multiple === true,
    capture: options.capture ?? null,
    source: options.source ?? null,
  };

  return new Promise((resolve) => {
    const timeoutMs = 120_000;
    const timeout = window.setTimeout(() => {
      cleanup();
      resolve([]);
    }, timeoutMs);

    const onResult = (ev: Event) => {
      const d = (ev as CustomEvent<NativeFilePickResultDetail>).detail;
      if (!d || d.requestId !== requestId) return;
      cleanup();
      if (d.error) {
        resolve([]);
        return;
      }
      resolve(filesFromNativePickPayloads(d.files ?? []));
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      window.removeEventListener(NATIVE_FILE_PICK_RESULT_EVENT, onResult);
    };

    window.addEventListener(NATIVE_FILE_PICK_RESULT_EVENT, onResult);
    postNativePickRequest(detail);
  });
}

export async function pickNativeFileList(
  options: NativeFilePickOptions = {},
): Promise<FileList | null> {
  const files = await pickNativeFiles(options);
  if (!files.length) return null;
  return fileListFromFiles(files);
}

/** Idempotent listener bootstrap (optional; pickNativeFiles registers per call). */
export function bootstrapNativeFilePickListener(): void {
  if (typeof window === "undefined" || window.__kpNativeFilePickListener) return;
  window.__kpNativeFilePickListener = true;
}
