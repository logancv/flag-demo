import { getFlag } from "./flags";

interface ApiResponse<T> {
  data: T;
  meta?: { requestId: string; timestamp: number };
}

interface LegacyResponse<T> {
  result: T;
  success: boolean;
}

export function formatResponse<T>(data: T, requestId: string): ApiResponse<T> | LegacyResponse<T> {
  if (getFlag("v2_api_responses")) {
    return wrapV2(data, requestId);
  }
  return wrapLegacy(data);
}

function wrapV2<T>(data: T, requestId: string): ApiResponse<T> {
  return {
    data,
    meta: { requestId, timestamp: Date.now() },
  };
}

function wrapLegacy<T>(data: T): LegacyResponse<T> {
  return { result: data, success: true };
}

export function formatError(error: Error, requestId: string) {
  if (getFlag("v2_api_responses")) {
    return { error: { message: error.message, code: "INTERNAL_ERROR" }, meta: { requestId, timestamp: Date.now() } };
  }
  return { error: error.message, success: false };
}
