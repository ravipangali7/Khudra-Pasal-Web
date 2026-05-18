import * as React from 'react';
import { Camera, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNativeAppShell } from '@/hooks/useNativeAppShell';
import { FilePreview } from '@/components/ui/file-preview';
import { pickNativeFileList } from '@/lib/nativeFilePick';

function acceptsImages(accept?: string): boolean {
  if (!accept) return true;
  const a = accept.toLowerCase();
  return a.includes('image') || a === '*/*' || a === '*';
}

function acceptsPdf(accept?: string): boolean {
  if (!accept) return false;
  return accept.toLowerCase().includes('pdf');
}

function chooseLabel(accept: string | undefined, multiple: boolean | undefined): string {
  if (multiple) return 'Choose files';
  if (acceptsPdf(accept) && !acceptsImages(accept)) return 'Choose PDF';
  if (acceptsImages(accept) && acceptsPdf(accept)) return 'Choose file';
  return 'Choose file';
}

export type FileInputProps = Omit<React.ComponentProps<'input'>, 'type'> & {
  /** When set, keeps the chosen-file label in sync (e.g. after parent clears state). */
  selectedFile?: File | null;
};

export const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  ({ className, accept, disabled, multiple, onChange, id, selectedFile, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement>(null);
    const cameraRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);

    const isMobile = useIsMobile();
    const inNativeApp = useNativeAppShell();
    const mobileUx = isMobile || inNativeApp;
    const showCamera = mobileUx && acceptsImages(accept) && !multiple;

    const [displayName, setDisplayName] = React.useState<string | null>(null);

    React.useEffect(() => {
      if (selectedFile === undefined) return;
      setDisplayName(selectedFile?.name ?? null);
    }, [selectedFile]);

    const emitFileList = (files: FileList | null) => {
      if (multiple && files && files.length > 1) {
        setDisplayName(`${files.length} files selected`);
      } else {
        setDisplayName(files?.[0]?.name ?? null);
      }
      const input = innerRef.current;
      if (!input) return;
      if (files && files.length > 0 && typeof DataTransfer !== 'undefined') {
        const dt = new DataTransfer();
        Array.from(files).forEach((f) => dt.items.add(f));
        input.files = dt.files;
      }
      onChange?.({ target: input, currentTarget: input } as React.ChangeEvent<HTMLInputElement>);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (multiple && files && files.length > 1) {
        setDisplayName(`${files.length} files selected`);
      } else {
        setDisplayName(files?.[0]?.name ?? null);
      }
      onChange?.(e);
      e.target.value = '';
    };

    const openPicker = async () => {
      if (disabled) return;
      if (inNativeApp) {
        const list = await pickNativeFileList({
          accept,
          multiple,
        });
        emitFileList(list);
        return;
      }
      innerRef.current?.click();
    };

    const openCamera = async () => {
      if (disabled) return;
      if (inNativeApp) {
        const list = await pickNativeFileList({
          accept: 'image/*',
          source: 'camera',
          capture: 'environment',
        });
        emitFileList(list);
        return;
      }
      cameraRef.current?.click();
    };

    return (
      <div className={cn('space-y-2', className)}>
        <input
          ref={innerRef}
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          tabIndex={-1}
          aria-hidden={id ? undefined : true}
          onChange={handleChange}
          {...props}
        />
        {showCamera ? (
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            disabled={disabled}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={handleChange}
          />
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 touch-manipulation"
            disabled={disabled}
            onClick={openPicker}
            aria-controls={id}
          >
            <FileUp className="w-4 h-4 mr-2 shrink-0" aria-hidden />
            {chooseLabel(accept, multiple)}
          </Button>
          {showCamera ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 touch-manipulation"
              disabled={disabled}
              onClick={openCamera}
            >
              <Camera className="w-4 h-4 mr-2 shrink-0" aria-hidden />
              Camera
            </Button>
          ) : null}
        </div>
        {selectedFile ? <FilePreview file={selectedFile} /> : null}
        {displayName && !selectedFile ? (
          <p className="text-sm text-muted-foreground truncate" title={displayName}>
            Selected: {displayName}
          </p>
        ) : null}
      </div>
    );
  },
);
FileInput.displayName = 'FileInput';
