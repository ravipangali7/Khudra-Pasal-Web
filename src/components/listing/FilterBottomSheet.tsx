import { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

export interface FilterGroup {
  id: string;
  label: string;
  type: 'checkbox' | 'range';
  options?: FilterOption[];
  range?: { min: number; max: number; step?: number };
}

interface FilterBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterGroup[];
  values: Record<string, string[] | [number, number]>;
  onChange: (values: Record<string, string[] | [number, number]>) => void;
  onApply: () => void;
  onReset: () => void;
}

const FilterBottomSheet = ({
  open,
  onOpenChange,
  filters,
  values,
  onChange,
  onApply,
  onReset,
}: FilterBottomSheetProps) => {
  const handleCheckboxChange = (groupId: string, optionId: string, checked: boolean) => {
    const current = (values[groupId] as string[]) || [];
    const updated = checked
      ? [...current, optionId]
      : current.filter(id => id !== optionId);
    onChange({ ...values, [groupId]: updated });
  };

  const handleRangeChange = (groupId: string, value: [number, number]) => {
    onChange({ ...values, [groupId]: value });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Filters</SheetTitle>
            <Button variant="ghost" size="sm" onClick={onReset}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
        </SheetHeader>

        <div className="overflow-y-auto flex-1 py-4 space-y-6">
          {filters.map((group) => (
            <div key={group.id} className="space-y-3">
              <Label className="text-sm font-semibold">{group.label}</Label>

              {group.type === 'checkbox' && group.options && (
                <div className="space-y-2">
                  {group.options.map((option) => {
                    const isChecked = ((values[group.id] as string[]) || []).includes(option.id);
                    return (
                      <div key={option.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`${group.id}-${option.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(group.id, option.id, checked as boolean)
                            }
                          />
                          <Label
                            htmlFor={`${group.id}-${option.id}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {option.label}
                          </Label>
                        </div>
                        {option.count !== undefined && (
                          <span className="text-xs text-muted-foreground">({option.count})</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {group.type === 'range' && group.range && (
                <div className="space-y-4 px-1">
                  <Slider
                    value={(values[group.id] as [number, number]) || [group.range.min, group.range.max]}
                    min={group.range.min}
                    max={group.range.max}
                    step={group.range.step || 1}
                    onValueChange={(value) => handleRangeChange(group.id, value as [number, number])}
                  />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Rs. {((values[group.id] as [number, number]) || [group.range.min, group.range.max])[0]}</span>
                    <span>Rs. {((values[group.id] as [number, number]) || [group.range.min, group.range.max])[1]}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <SheetFooter className="border-t pt-4">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={() => { onApply(); onOpenChange(false); }}>
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default FilterBottomSheet;
