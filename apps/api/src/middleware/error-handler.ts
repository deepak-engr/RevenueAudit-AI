import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import type { Environment } from "../config/env.js";
import type { ApiErrorResponse } from "../types/api.js";
import { AppError } from "../utils/app-error.js";

export const notFoundHandler: RequestHandler = (_request, response) => {
  const body: ApiErrorResponse = { error: { code: "NOT_FOUND", message: "Route not found" } };
  return response.status(404).json(body);
};
export function errorHandler(config: Pick<Environment, "NODE_ENV" | "LOG_LEVEL">): ErrorRequestHandler {
  return (error: unknown, _request, response, _next) => {
    if (error instanceof AppError) { const body: ApiErrorResponse = { error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } }; return response.status(error.statusCode).json(body); }
    if (error instanceof ZodError) { const body: ApiErrorResponse = { error: { code: "VALIDATION_ERROR", message: "Request validation failed" } }; return response.status(400).json(body); }
    if (config.LOG_LEVEL !== "error") console.error(error);
    const message = config.NODE_ENV === "production" ? "An unexpected server error occurred" : "An unexpected server error occurred";
    const body: ApiErrorResponse = { error: { code: "INTERNAL_ERROR", message } };
    return response.status(500).json(body);
  };
}
