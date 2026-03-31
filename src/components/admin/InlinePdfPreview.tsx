import { useEffect, useState } from "react";
import { getAuthToken } from "@/lib/api";
import { cn } from "@/lib/utils";

type InlinePdfPreviewProps = {
  url: string;
  title: string;
  className?: string;
};

/**
 * Fetches the PDF as a blob and shows it in an iframe. Avoids cross-origin iframe
 * restrictions and works when the file is served same-origin via the dev proxy.
 */
export function InlinePdfPreview({ url, title, className }: InlinePdfPreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setBlobUrl(null);
    setFailed(false);

    const run = async () => {
      try {
        const headers = new Headers();
        const token = getAuthToken();
        if (token) headers.set("Authorization", `Token ${token}`);
        const res = await fetch(url, { headers, credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (failed) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded border bg-muted/30 p-6 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        <p>Could not load PDF in the viewer.</p>
        <a href={url} target="_blank" rel="noreferrer" className="text-primary underline font-medium">
          Open PDF in a new tab
        </a>
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div
        className={cn("rounded border bg-muted/40 animate-pulse", className)}
        aria-busy
        aria-label="Loading PDF"
      />
    );
  }

  return <iframe title={title} src={blobUrl} className={cn("border-0", className)} />;
}
