import { useEffect, useId, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { resolveMediaUrl } from "@/pages/admin/hooks/adminFormUtils";

type Props = {
  label: string;
  /** New file chosen in this session */
  file: File | null;
  onFileChange: (f: File | null) => void;
  /** Existing server URL/path to show when no new file */
  existingUrl?: string;
  className?: string;
};

export function AdminImageField({ label, file, onFileChange, existingUrl, className }: Props) {
  const inputId = useId();
  const [preview, setPreview] = useState<string>("");

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview("");
    return undefined;
  }, [file]);

  const showUrl = preview || (existingUrl ? resolveMediaUrl(existingUrl) : "");

  return (
    <div className={className}>
      <Label htmlFor={inputId}>{label}</Label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="mt-1 block w-full text-sm text-muted-foreground file:mr-2 file:rounded file:border file:bg-background file:px-2 file:py-1"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onFileChange(f);
        }}
      />
      {showUrl ? (
        <div className="mt-2 rounded-md border bg-muted/30 p-2">
          <img src={showUrl} alt="" className="max-h-40 max-w-full object-contain rounded" />
        </div>
      ) : null}
      {file ? (
        <Button type="button" variant="ghost" size="sm" className="mt-1 h-8 text-xs" onClick={() => onFileChange(null)}>
          Clear
        </Button>
      ) : null}
    </div>
  );
}
