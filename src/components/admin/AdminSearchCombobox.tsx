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

export type AdminSearchOption = { value: string; label: string; description?: string };

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

  const triggerText = useMemo(() => {
    if (value === '' && emptyOption) {
      return emptyOption.label;
    }
    if (selectedLabel) return selectedLabel;
    const found = displayRows.find((r) => r.value === value);
    return found?.label ?? (value ? `#${value}` : placeholder);
  }, [value, selectedLabel, displayRows, emptyOption, placeholder]);

  const handleSelect = useCallback(
    (v: string) => {
      const row = displayRows.find((r) => r.value === v);
      onChange(v, row?.label);
      setOpen(false);
    },
    [displayRows, onChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            {isFetching ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>
            ) : (
              <>
                <CommandEmpty>No results.</CommandEmpty>
                <CommandGroup>
                  {displayRows.map((row) => (
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
                      <div className="flex flex-col min-w-0">
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
