export type ErrorCode = "NOT_FOUND" | "VALIDATION_ERROR" | "UNSAFE_URL" | "CRAWL_ERROR" | "REQUEST_TIMEOUT" | "INTERNAL_ERROR" | "METHOD_NOT_ALLOWED";

export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, string[]>;
  };
}

export interface HealthResponse {
  status: "ok";
}
