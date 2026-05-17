import * as React from 'react';
import { Camera, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNativeAppShell } from '@/hooks/useNativeAppShell';

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

    const openPicker = () => {
      if (!disabled) innerRef.current?.click();
    };

    const openCamera = () => {
      if (!disabled) cameraRef.current?.click();
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
        {displayName ? (
          <p className="text-sm text-muted-foreground truncate" title={displayName}>
            Selected: {displayName}
          </p>
        ) : null}
      </div>
    );
  },
);
FileInput.displayName = 'FileInput';
