import { useState, ReactNode } from 'react';
import { 
  Search, Filter, Download, Plus, ChevronLeft, ChevronRight,
  MoreVertical, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  render?: (item: T) => ReactNode;
}

interface AdminTableProps<T> {
  title: string;
  subtitle?: string;
  data: T[];
  columns: Column<T>[];
  searchKey?: string;
  searchPlaceholder?: string;
  onAdd?: () => void;
  addLabel?: string;
  onExport?: (format: 'csv' | 'pdf' | 'excel') => void;
  onFilter?: () => void;
  onBulkAction?: (action: string, selectedIds: string[]) => void;
  bulkActions?: { id: string; label: string }[];
  rowKey?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
}

export default function AdminTable<T extends Record<string, any>>({
  title,
  subtitle,
  data,
  columns,
  searchKey = 'name',
  searchPlaceholder = 'Search...',
  onAdd,
  addLabel = 'Add New',
  onExport,
  onFilter,
  onBulkAction,
  bulkActions = [],
  rowKey = 'id',
  pagination
}: AdminTableProps<T>) {
  const [search, setSearch] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const filteredData = data.filter(item =>
    String(item[searchKey] || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggleRow = (id: string) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedRows.length === filteredData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredData.map(item => String(item[rowKey])));
    }
  };

  const allSelected = filteredData.length > 0 && selectedRows.length === filteredData.length;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] lg:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Bulk Actions */}
            {selectedRows.length > 0 && bulkActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Bulk Actions ({selectedRows.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {bulkActions.map(action => (
                    <DropdownMenuItem
                      key={action.id}
                      onClick={() => onBulkAction?.(action.id, selectedRows)}
                    >
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Filter */}
            {onFilter && (
              <Button variant="outline" size="sm" onClick={onFilter}>
                <Filter className="w-4 h-4 mr-1.5" />
                Filter
              </Button>
            )}

            {/* Export */}
            {onExport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1.5" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => onExport('csv')}>Export CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExport('excel')}>Export Excel</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExport('pdf')}>Export PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Add Button */}
            {onAdd && (
              <Button size="sm" onClick={onAdd}>
                <Plus className="w-4 h-4 mr-1.5" />
                {addLabel}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-y border-border">
              <tr>
                {bulkActions.length > 0 && (
                  <th className="w-12 px-4 py-3">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </th>
                )}
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                      col.className
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (bulkActions.length > 0 ? 1 : 0)}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No data found
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => (
                  <tr key={item[rowKey] || idx} className="hover:bg-muted/30 transition-colors">
                    {bulkActions.length > 0 && (
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selectedRows.includes(String(item[rowKey]))}
                          onCheckedChange={() => toggleRow(String(item[rowKey]))}
                        />
                      </td>
                    )}
                    {columns.map(col => (
                      <td key={col.key} className={cn("px-4 py-3 text-sm", col.className)}>
                        {col.render ? col.render(item) : item[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-border bg-muted/20">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows per page:</span>
              <Select
                value={String(pagination.pageSize)}
                onValueChange={(val) => pagination.onPageSizeChange(Number(val))}
              >
                <SelectTrigger className="w-16 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map(size => (
                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>
                {(pagination.page - 1) * pagination.pageSize + 1}-
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={pagination.page === 1}
                onClick={() => pagination.onPageChange(pagination.page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={pagination.page * pagination.pageSize >= pagination.total}
                onClick={() => pagination.onPageChange(pagination.page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
