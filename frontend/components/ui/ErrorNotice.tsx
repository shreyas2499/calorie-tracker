import type { ReactNode } from "react";

interface ErrorNoticeProps {
  title?: string;
  message: string;
  action?: ReactNode;
}

export function ErrorNotice({ title = "Something went wrong", message, action }: ErrorNoticeProps) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-300 bg-red-50 p-5 text-sm text-red-900"
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1">{message}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
