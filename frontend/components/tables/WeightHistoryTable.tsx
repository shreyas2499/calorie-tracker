"use client";

import { PaginationBar, TableShell, Td, Th } from "@/components/tables/TableShell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatLongDate } from "@/lib/dates";
import { formatWeight } from "@/lib/units";
import type { Pagination, UnitSystem, WeightEntry } from "@/types";

interface WeightHistoryTableProps {
  entries: WeightEntry[];
  pagination: Pagination;
  unitSystem: UnitSystem;
  onPageChange: (page: number) => void;
  onEdit: (entry: WeightEntry) => void;
  onDelete: (entry: WeightEntry) => void;
}

export function WeightHistoryTable({
  entries,
  pagination,
  unitSystem,
  onPageChange,
  onEdit,
  onDelete,
}: WeightHistoryTableProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="No weight entries found"
        description="Adjust the filters, or add an entry from the dashboard."
      />
    );
  }

  return (
    <>
      <TableShell>
        <caption className="sr-only">Weight entry history</caption>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th align="right">Morning</Th>
            <Th align="right">Evening</Th>
            <Th align="right">Average</Th>
            <Th>Notes</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <Td>{formatLongDate(entry.entry_date)}</Td>
              <Td align="right">{formatWeight(entry.morning_weight, unitSystem)}</Td>
              <Td align="right">{formatWeight(entry.evening_weight, unitSystem)}</Td>
              <Td align="right">{formatWeight(entry.average_weight, unitSystem)}</Td>
              <Td className="max-w-[260px] whitespace-pre-wrap break-words text-muted">
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
