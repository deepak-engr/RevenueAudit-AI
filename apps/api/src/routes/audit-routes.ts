import { Router } from "express";
import { createAudit } from "../controllers/audit-controller.js";

export const auditRouter: Router = Router();
auditRouter.post("/audit", createAudit);
