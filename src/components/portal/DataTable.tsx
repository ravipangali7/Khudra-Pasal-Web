import { useState } from 'react';
import { Search, Filter, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  title?: string;
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchKey?: keyof T;
  onExport?: () => void;
  onFilter?: () => void;
  pageSize?: number;
  emptyMessage?: string;
}

function DataTable<T extends { id: string }>({
  title,
  data,
  columns,
  searchPlaceholder = "Search...",
  searchKey,
  onExport,
  onFilter,
  pageSize = 10,
  emptyMessage = "No data found",
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = searchKey
    ? data.filter(item => 
        String(item[searchKey]).toLowerCase().includes(search.toLowerCase())
      )
    : data;

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <Card>
      {(title || searchKey || onExport || onFilter) && (
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {title && <CardTitle className="text-base">{title}</CardTitle>}
            <div className="flex items-center gap-2">
              {searchKey && (
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={searchPlaceholder}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 h-9"
                  />
                </div>
              )}
              {onFilter && (
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={onFilter}>
                  <Filter className="w-4 h-4" />
                </Button>
              )}
              {onExport && (
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={onExport}>
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent className={cn(!title && !searchKey && "pt-6")}>
        {paginatedData.length > 0 ? (
          <>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    {columns.map((col) => (
                      <TableHead key={String(col.key)} className={col.className}>
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((item) => (
                    <TableRow key={item.id}>
                      {columns.map((col) => (
                        <TableCell key={String(col.key)} className={col.className}>
                          {col.render 
                            ? col.render(item)
                            : String(item[col.key as keyof T] ?? '')
                          }
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, filteredData.length)} of{' '}
                  {filteredData.length} results
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="px-3 text-sm font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DataTable;
