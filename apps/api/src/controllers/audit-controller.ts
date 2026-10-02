import type { RequestHandler } from "express";
import { CrawlError } from "@revenueaudit/crawler-worker";
import { z } from "zod";
import { publicHttpUrlSchema } from "../utils/public-url.js";
import { validate } from "../utils/validate.js";
import { AppError } from "../utils/app-error.js";
import { runAudit } from "../services/audit-service.js";

const auditRequestSchema = z.object({ url: publicHttpUrlSchema });
export const createAudit: RequestHandler = async (request, response, next) => {
  try {
    const { url } = validate(auditRequestSchema, request.body);
    const report = await runAudit(url);
    response.status(200).json(report);
  } catch (error) {
    if (error instanceof CrawlError) {
      const code = error.code === "UNSAFE_TARGET" ? "UNSAFE_URL" : error.code === "TIMEOUT" ? "REQUEST_TIMEOUT" : "CRAWL_ERROR";
      return next(new AppError(code === "UNSAFE_URL" ? 400 : code === "REQUEST_TIMEOUT" ? 504 : 502, code, error.message));
    }
    return next(error);
  }
};
