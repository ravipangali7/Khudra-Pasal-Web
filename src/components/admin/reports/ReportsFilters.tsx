import { format } from "date-fns";
import { CalendarIcon, RotateCcw } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FilterOption = { id: number; label: string };

export type ReportsFiltersProps = {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  vendorId: string;
  onVendorIdChange: (v: string) => void;
  categoryId: string;
  onCategoryIdChange: (v: string) => void;
  vendors: FilterOption[];
  categories: FilterOption[];
  onReset: () => void;
  className?: string;
};

export function ReportsFilters({
  dateRange,
  onDateRangeChange,
  vendorId,
  onVendorIdChange,
  categoryId,
  onCategoryIdChange,
  vendors,
  categories,
  onReset,
  className,
}: ReportsFiltersProps) {
  const label =
    dateRange?.from && dateRange?.to
      ? `${format(dateRange.from, "MMM d, yyyy")} – ${format(dateRange.to, "MMM d, yyyy")}`
      : dateRange?.from
        ? format(dateRange.from, "MMM d, yyyy")
        : "Pick date range";

  return (
    <div
      className={cn(
        "flex flex-col xl:flex-row flex-wrap items-stretch xl:items-end gap-3 p-4 rounded-xl border border-border/80 bg-secondary/10 shadow-sm",
        className,
      )}
    >
      <div className="space-y-1.5 min-w-[200px] flex-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date range</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-10 bg-card",
                !dateRange?.from && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{label}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-1.5 min-w-[160px] flex-1 max-w-xs">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vendor</span>
        <Select value={vendorId} onValueChange={onVendorIdChange}>
          <SelectTrigger className="h-10 bg-card">
            <SelectValue placeholder="All vendors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vendors</SelectItem>
            {vendors.map((v) => (
              <SelectItem key={v.id} value={String(v.id)}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5 min-w-[160px] flex-1 max-w-xs">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</span>
        <Select value={categoryId} onValueChange={onCategoryIdChange}>
          <SelectTrigger className="h-10 bg-card">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="button" variant="secondary" className="h-10 shrink-0" onClick={onReset}>
        <RotateCcw className="h-4 w-4 mr-2" />
        Reset
      </Button>
    </div>
  );
}
