import type { RequestHandler } from "express";
import type { Environment } from "../config/env.js";

const ranks = { debug: 10, info: 20, warn: 30, error: 40 } as const;
export function requestLogger(config: Pick<Environment, "LOG_LEVEL">): RequestHandler {
  return (request, response, next) => {
    const startedAt = performance.now();
    response.on("finish", () => {
      if (ranks[config.LOG_LEVEL] <= ranks.info) console.info(`${request.method} ${request.originalUrl} ${response.statusCode} ${(performance.now() - startedAt).toFixed(1)}ms`);
    });
    next();
  };
}
