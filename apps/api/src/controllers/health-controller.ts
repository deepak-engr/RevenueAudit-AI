import type { RequestHandler } from "express";
import type { HealthResponse } from "../types/api.js";

export const getHealth: RequestHandler = (_request, response) => {
  const body: HealthResponse = { status: "ok" };
  response.status(200).json(body);
};
