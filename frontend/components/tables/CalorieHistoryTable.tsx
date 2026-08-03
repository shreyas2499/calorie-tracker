"use client";

import { PaginationBar, TableShell, Td, Th } from "@/components/tables/TableShell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatLongDate } from "@/lib/dates";
import type { CalorieEntry, Pagination } from "@/types";

interface CalorieHistoryTableProps {
  entries: CalorieEntry[];
  pagination: Pagination;
  onPageChange: (page: number) => void;
  onEdit: (entry: CalorieEntry) => void;
  onDelete: (entry: CalorieEntry) => void;
}

export function CalorieHistoryTable({
  entries,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
}: CalorieHistoryTableProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="No calorie entries found"
        description="Adjust the filters, or add an entry from the dashboard."
      />
    );
  }

  return (
    <>
      <TableShell>
        <caption className="sr-only">Calorie entry history</caption>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th align="right">Consumed</Th>
            <Th align="right">Burned</Th>
            <Th align="right">Net</Th>
            <Th align="right">Maintenance</Th>
            <Th>Balance</Th>
            <Th>Notes</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <Td>{formatLongDate(entry.entry_date)}</Td>
              <Td align="right">{entry.calories_consumed.toLocaleString()}</Td>
              <Td align="right">{entry.calories_burned.toLocaleString()}</Td>
              <Td align="right">{entry.net_calories.toLocaleString()}</Td>
              <Td align="right">{entry.maintenance_calories.toLocaleString()}</Td>
              <Td>
                <div className="space-y-1">
                  <span className="block tabular-nums">
                    {entry.calorie_balance > 0 ? "+" : ""}
                    {entry.calorie_balance.toLocaleString()}
                  </span>
                  <StatusBadge status={entry.status} label={entry.status_label} />
                </div>
              </Td>
              <Td className="max-w-[220px] whitespace-pre-wrap break-words text-muted">
                {entry.notes || "—"}
              </Td>
              <Td align="right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" onClick={() => onEdit(entry)}>
                    Edit
                  </Button>
                  <Button variant="ghost" onClick={() => onDelete(entry)}>
                    Delete
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
      <PaginationBar
        page={pagination.page}
        pages={pagination.pages}
        total={pagination.total}
        onChange={onPageChange}
      />
    </>
  );
}
