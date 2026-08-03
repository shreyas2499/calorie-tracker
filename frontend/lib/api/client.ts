/**
 * The single place that talks to the Flask API.
 * Components never call `fetch` directly.
 */
import type { ApiErrorBody } from "@/types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;

  constructor(status: number, body: Partial<ApiErrorBody> | null, fallback: string) {
    const error = body?.error;
    super(error?.message ?? fallback);
    this.name = "ApiError";
    this.status = status;
    this.code = error?.code ?? "UNKNOWN_ERROR";
    this.fields = error?.fields ?? {};
  }

  /** True when no profile has been created yet. */
  get isMissingProfile(): boolean {
    return this.code === "PROFILE_NOT_FOUND";
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

export function buildUrl(path: string, query?: Query): string {
  const url = `${API_BASE_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  });
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, signal } = options;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
      cache: "no-store",
    });
  } catch (cause) {
    if ((cause as Error)?.name === "AbortError") throw cause;
    throw new ApiError(
      0,
      null,
      "Could not reach the API. Check that the backend is running and that NEXT_PUBLIC_API_URL is correct.",
    );
  }

  if (response.status === 204) return undefined as T;

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new ApiError(response.status, payload, `Request failed (${response.status}).`);
  }
  return payload as T;
}

/** Most endpoints wrap their payload in `{ data: ... }`. */
export async function requestData<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const payload = await request<{ data: T }>(path, options);
  return payload.data;
}

export function downloadUrl(path: string, query?: Query): string {
  return buildUrl(path, query);
}
