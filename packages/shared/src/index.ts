import { z } from "zod";
export const healthResponseSchema = z.object({ status: z.literal("ok") });
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export interface ApiErrorResponse { code: "NOT_FOUND" | "INTERNAL_ERROR"; message: string; }
export interface ApiResponse<T> { data: T; }
