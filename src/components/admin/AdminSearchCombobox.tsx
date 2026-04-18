import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 280;

export type AdminSearchOption = {
  value: string;
  label: string;
  description?: string;
  parentValue?: string | null;
  depth?: number;
};

function useDebouncedSearch(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const ms = value.trim() === '' ? 0 : delay;
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export type AdminSearchComboboxProps = {
  value: string;
  /** When user selects an option; second arg is display label for the trigger */
  onChange: (value: string, label?: string) => void;
  fetchOptions: (search: string) => Promise<AdminSearchOption[]>;
  /** Stable prefix for react-query cache (e.g. "user", "vendor") */
  queryKeyPrefix: string;
  placeholder?: string;
  /** Shown on the closed trigger when `value` is set */
  selectedLabel?: string;
  /** Optional first row with value "" (e.g. "All vendors") */
  emptyOption?: { label: string };
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
  id?: string;
};

export function AdminSearchCombobox({
  value,
  onChange,
  fetchOptions,
  queryKeyPrefix,
  placeholder = 'Search…',
  selectedLabel,
  emptyOption,
  disabled,
  clearable,
  className,
  id,
}: AdminSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const debouncedSearch = useDebouncedSearch(inputValue, DEBOUNCE_MS);

  useEffect(() => {
    if (open) setInputValue('');
  }, [open]);

  const { data: options = [], isFetching } = useQuery({
    queryKey: ['admin-search-combobox', queryKeyPrefix, debouncedSearch],
    queryFn: () => fetchOptions(debouncedSearch.trim()),
    enabled: open,
    staleTime: 30_000,
  });

  const displayRows = useMemo(() => {
    const rows: AdminSearchOption[] = [];
    if (emptyOption) {
      rows.push({ value: '', label: emptyOption.label });
    }
    rows.push(...options);
    return rows;
  }, [emptyOption, options]);

  const isTreeMode = useMemo(
    () => displayRows.some((row) => typeof row.depth === 'number' || row.parentValue !== undefined),
    [displayRows],
  );

  const sortedRows = useMemo(() => {
    if (!isTreeMode) return displayRows;
    const nodeMap = new Map<string, AdminSearchOption>();
    const childrenMap = new Map<string, AdminSearchOption[]>();
    const roots: AdminSearchOption[] = [];
    for (const row of displayRows) {
      nodeMap.set(row.value, row);
      childrenMap.set(row.value, []);
    }
    for (const row of displayRows) {
      const parentValue = row.parentValue ? String(row.parentValue) : '';
      if (parentValue && nodeMap.has(parentValue)) {
        childrenMap.get(parentValue)?.push(row);
      } else {
        roots.push(row);
      }
    }
    const ordered: AdminSearchOption[] = [];
    const visit = (row: AdminSearchOption, parentDepth: number) => {
      const explicitDepth = typeof row.depth === 'number' ? row.depth : parentDepth;
      ordered.push({ ...row, depth: explicitDepth });
      const children = [...(childrenMap.get(row.value) ?? [])].sort((a, b) => a.label.localeCompare(b.label));
      for (const child of children) {
        visit(child, explicitDepth + 1);
      }
    };
    for (const root of [...roots].sort((a, b) => a.label.localeCompare(b.label))) {
      visit(root, 0);
    }
    return ordered;
  }, [displayRows, isTreeMode]);

  const triggerText = useMemo(() => {
    if (value === '' && emptyOption) {
      return emptyOption.label;
    }
    if (selectedLabel) return selectedLabel;
    const found = sortedRows.find((r) => r.value === value);
    return found?.label ?? (value ? `#${value}` : placeholder);
  }, [value, selectedLabel, sortedRows, emptyOption, placeholder]);

  const handleSelect = useCallback(
    (v: string) => {
      const row = sortedRows.find((r) => r.value === v);
      onChange(v, row?.label);
      setOpen(false);
    },
    [sortedRows, onChange],
  );

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <div className={cn('flex gap-1 w-full', className)}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="flex-1 justify-between font-normal min-h-10 h-auto py-2"
          >
            <span className="truncate text-left">{triggerText}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        {clearable && value !== '' && !disabled ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => onChange('', undefined)}
            aria-label="Clear"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList className="max-h-80 overflow-y-auto">
            {isFetching ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>
            ) : (
              <>
                <CommandEmpty>No results.</CommandEmpty>
                <CommandGroup>
                  {sortedRows.map((row) => (
                    <CommandItem
                      key={row.value === '' ? '__empty__' : row.value}
                      value={`${row.value}\t${row.label}`}
                      onSelect={() => handleSelect(row.value)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4 shrink-0',
                          value === row.value ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <div
                        className="flex flex-col min-w-0"
                        style={{
                          paddingLeft:
                            isTreeMode && typeof row.depth === 'number' && row.depth > 0
                              ? `${Math.min(row.depth, 5) * 14}px`
                              : undefined,
                        }}
                      >
                        <span className="truncate">{row.label}</span>
                        {row.description ? (
                          <span className="text-xs text-muted-foreground truncate">{row.description}</span>
                        ) : null}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
