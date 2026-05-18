import type { MutableRefObject, RefObject } from "react";
import { isNativeAppShell } from "@/lib/nativeAppShell";
import { pickNativeFiles, type NativeFilePickOptions } from "@/lib/nativeFilePick";

export function revokeStoredObjectUrl(urlRef: MutableRefObject<string | null>) {
  if (urlRef.current) {
    URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }
}

/** Store a blob preview URL and return it for immediate `<img src>`. */
export function assignObjectUrlPreview(
  file: File,
  urlRef: MutableRefObject<string | null>,
  setPreview: (url: string) => void,
): string {
  revokeStoredObjectUrl(urlRef);
  const url = URL.createObjectURL(file);
  urlRef.current = url;
  setPreview(url);
  return url;
}

export function isImageFile(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  if (t.startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp)$/i.test(file.name);
}

export function isPdfFile(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  return t === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

/** Native shell: pick via Flutter; returns `null` on web (use file input). */
export async function pickImageInNativeApp(
  options?: NativeFilePickOptions,
): Promise<File | null> {
  if (!isNativeAppShell()) return null;
  const files = await pickNativeFiles({
    accept: "image/*",
    ...options,
  });
  return files[0] ?? null;
}

/** Native pick first; otherwise open the hidden `<input type="file">`. */
export async function triggerImageFileInput(
  inputRef: RefObject<HTMLInputElement | null>,
  options?: NativeFilePickOptions,
): Promise<File | null> {
  const fromNative = await pickImageInNativeApp(options);
  if (fromNative) return fromNative;
  inputRef.current?.click();
  return null;
}
