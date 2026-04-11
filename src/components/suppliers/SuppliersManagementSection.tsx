import { type ReactNode } from 'react';
import AdminTable from '@/components/admin/AdminTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const BTN_SEARCH = 'rounded-lg bg-[#5C1BB1] px-5 font-semibold text-white hover:bg-[#4c1694]';
const BTN_ADD = 'rounded-lg bg-[#FFA500] px-5 font-semibold text-black hover:bg-[#e69500]';
const INPUT_BAR = 'rounded-lg border-[#E0E0E0]';

export type SuppliersManagementSectionProps = {
  rows: Record<string, unknown>[];
  q: string;
  setQ: (v: string) => void;
  onSearchCommit: () => void;
  onAddClick: () => void;
  dialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  onSave: () => void;
  savePending: boolean;
  saveDisabled?: boolean;
  /** Renders above the search row (e.g. super-admin vendor picker). */
  toolbarPrefix?: ReactNode;
  /** When false, search row + table are hidden (super-admin before vendor is chosen). */
  showList?: boolean;
  /** Shown when showList is false (optional). */
  selectionHint?: ReactNode;
  nameFieldId?: string;
  phoneFieldId?: string;
};

export default function SuppliersManagementSection({
  rows,
  q,
  setQ,
  onSearchCommit,
  onAddClick,
  dialogOpen,
  onDialogOpenChange,
  name,
  setName,
  phone,
  setPhone,
  onSave,
  savePending,
  saveDisabled,
  toolbarPrefix,
  showList = true,
  selectionHint,
  nameFieldId = 'supplier-name',
  phoneFieldId = 'supplier-phone',
}: SuppliersManagementSectionProps) {
  return (
    <div className="space-y-4">
      {toolbarPrefix ? <div className="flex flex-wrap items-center gap-3">{toolbarPrefix}</div> : null}

      {!showList ? (
        selectionHint ?? (
          <p className="text-sm text-muted-foreground">Select a vendor to view and manage suppliers.</p>
        )
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="flex min-w-0 max-w-md flex-1 gap-2">
              <Input
                placeholder="Search name or phone…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className={INPUT_BAR}
              />
              <Button type="button" className={BTN_SEARCH} onClick={onSearchCommit}>
                Search
              </Button>
            </div>
            <Button type="button" className={BTN_ADD} onClick={onAddClick}>
              Add supplier
            </Button>
          </div>

          <AdminTable
            variant="suppliers"
            title="Suppliers"
            subtitle="Wholesalers and vendors you buy stock from"
            data={rows}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'phone', label: 'Phone' },
              {
                key: 'is_active',
                label: 'Active',
                render: (r) => (r.is_active ? 'Yes' : 'No'),
              },
            ]}
          />
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
        <DialogContent className="rounded-[10px] border-[#E0E0E0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor={nameFieldId}>Name</Label>
              <Input
                id={nameFieldId}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Supplier name"
                className={INPUT_BAR}
              />
            </div>
            <div>
              <Label htmlFor={phoneFieldId}>Phone</Label>
              <Input
                id={phoneFieldId}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
                className={INPUT_BAR}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" type="button" className="rounded-lg border-[#E0E0E0]" onClick={() => onDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className={BTN_SEARCH}
              disabled={saveDisabled ?? !name.trim() || savePending}
              onClick={onSave}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
