import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  description: string;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  titleLimit?: number;
  descriptionLimit?: number;
  className?: string;
};

function Counter({ value, max }: { value: number; max: number }) {
  const over = value > max;
  return (
    <span className={cn('text-xs', over ? 'text-destructive' : 'text-muted-foreground')}>
      {value}/{max}
    </span>
  );
}

export function SeoFields({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  titleLimit = 70,
  descriptionLimit = 160,
  className,
}: Props) {
  return (
    <div className={cn('border-t pt-4 space-y-4', className)}>
      <h4 className="font-medium text-sm">SEO</h4>
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <Label>SEO title</Label>
          <Counter value={title.length} max={titleLimit} />
        </div>
        <Input
          placeholder="Meta title for search engines"
          value={title}
          maxLength={titleLimit + 10}
          onChange={(e) => onTitleChange(e.target.value.slice(0, titleLimit))}
        />
      </div>
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <Label>Meta description</Label>
          <Counter value={description.length} max={descriptionLimit} />
        </div>
        <Textarea
          rows={2}
          placeholder="Short summary for Google & social previews"
          value={description}
          maxLength={descriptionLimit + 20}
          onChange={(e) => onDescriptionChange(e.target.value.slice(0, descriptionLimit))}
        />
      </div>
    </div>
  );
}
