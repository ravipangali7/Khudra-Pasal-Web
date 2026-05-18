import { FileText } from "lucide-react";
import { useFileObjectUrl } from "@/hooks/useFileObjectUrl";
import { isImageFile, isPdfFile } from "@/lib/imagePick";
import { cn } from "@/lib/utils";

type FilePreviewProps = {
  file: File | null | undefined;
  className?: string;
  imageClassName?: string;
  label?: string;
};

/** Inline preview for a chosen file (image thumbnail or PDF label). */
export function FilePreview({ file, className, imageClassName, label }: FilePreviewProps) {
  const url = useFileObjectUrl(file ?? null);
  if (!file) return null;

  if (isImageFile(file) && url) {
    return (
      <div className={cn("space-y-1", className)}>
        {label ? <p className="text-xs font-medium text-muted-foreground">{label}</p> : null}
        <div className="rounded-md border border-border bg-muted/30 p-2">
          <img
            src={url}
            alt=""
            className={cn("max-h-48 w-full max-w-full rounded object-contain", imageClassName)}
          />
        </div>
      </div>
    );
  }

  if (isPdfFile(file)) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm",
          className,
        )}
      >
        <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span className="truncate" title={file.name}>
          {label ? `${label}: ` : ""}
          {file.name}
        </span>
      </div>
    );
  }

  return (
    <p className={cn("text-sm text-muted-foreground truncate", className)} title={file.name}>
      {label ? `${label}: ` : ""}
      {file.name}
    </p>
  );
}
