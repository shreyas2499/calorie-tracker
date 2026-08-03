import { ApiError } from "@/lib/api";
import type { UseFormSetError } from "react-hook-form";

/**
 * Maps a backend validation error onto the matching form fields and returns a
 * message suitable for a toast.
 */
export function applyApiError<T extends Record<string, unknown>>(
  error: unknown,
  setError: UseFormSetError<T>,
  fieldMap: Record<string, string> = {},
): string {
  if (!(error instanceof ApiError)) {
    return (error as Error)?.message ?? "Something went wrong. Please try again.";
  }
  Object.entries(error.fields).forEach(([field, message]) => {
    const target = fieldMap[field] ?? field;
    setError(target as never, { type: "server", message });
  });
  return error.message;
}
