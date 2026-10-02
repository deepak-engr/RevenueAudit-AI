import { z } from "zod";
import { AppError } from "./app-error.js";

export function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const details = result.error.issues.reduce<Record<string, string[]>>((all, issue) => {
    const key = issue.path.join(".") || "request";
    (all[key] ??= []).push(issue.message);
    return all;
  }, {});
  throw new AppError(400, "VALIDATION_ERROR", "Request validation failed", details);
}
