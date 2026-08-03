import type { ReactNode } from "react";

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[720px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      className={`border-b border-line px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className = "",
}: {
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={`border-b border-line px-3 py-2 align-top ${
        align === "right" ? "text-right tabular-nums" : ""
      } ${className}`}
    >
      {children}
    </td>
  );
}

interface PaginationBarProps {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
}

export function PaginationBar({ page, pages, total, onChange }: PaginationBarProps) {
  if (total === 0) return null;
  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex items-center justify-between gap-3 text-sm text-muted"
    >
      <p>
        Page {page} of {Math.max(pages, 1)} · {total} entries
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
          className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
