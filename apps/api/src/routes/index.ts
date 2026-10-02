import { Router } from "express";
import { auditRouter } from "./audit-routes.js";
import { healthRouter } from "./health-routes.js";

export const apiRouter: Router = Router();
apiRouter.use(healthRouter);
apiRouter.use(auditRouter);
// Future routes will be mounted here only when their crawl pipeline is implemented:
// POST /audits, GET /audits/:id, GET /audits/:id/findings, GET /audits/:id/action-plan
