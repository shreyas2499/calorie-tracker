import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, buildUrl, request } from "@/lib/api/client";

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(status: number, body: unknown) {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
    json: async () => body,
  };
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("API client", () => {
  it("omits empty query parameters", () => {
    expect(buildUrl("/x", { a: 1, b: "", c: null, d: undefined })).toMatch(/\/x\?a=1$/);
  });

  it("surfaces backend validation errors with field messages", async () => {
    mockFetch(422, {
      error: {
        code: "VALIDATION_ERROR",
        message: "The submitted data is invalid.",
        fields: { morning_weight_kg: "Weight must be greater than zero." },
      },
    });

    await expect(request("/weight-entries")).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      fields: { morning_weight_kg: "Weight must be greater than zero." },
    });
  });

  it("flags a missing profile", async () => {
    mockFetch(404, { error: { code: "PROFILE_NOT_FOUND", message: "No user profile exists yet." } });
    try {
      await request("/profile");
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).isMissingProfile).toBe(true);
    }
  });

  it("reports an unreachable API clearly", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(request("/health")).rejects.toThrow(/Could not reach the API/);
  });

  it("unwraps successful responses", async () => {
    mockFetch(200, { status: "ok" });
    await expect(request<{ status: string }>("/health")).resolves.toEqual({ status: "ok" });
  });
});
