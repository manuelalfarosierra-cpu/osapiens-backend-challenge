import { Router, Response } from "express";

import { AppDataSource } from "../data-source";
import { Workflow } from "../models/Workflow";
import { WorkflowService } from "../services/workflowService";
import { AppError } from "../shared/errors/AppError";

interface WorkflowRouteDependencies {
  workflowService: Pick<
    WorkflowService,
    "getWorkflowStatus" | "getWorkflowResults"
  >;
}

const handleRouteError = (error: unknown, res: Response): void => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      message: error.message,
    });
    return;
  }

  console.error(error);

  res.status(500).json({
    message: "Internal server error",
  });
};

export const buildWorkflowRouter = ({
  workflowService,
}: WorkflowRouteDependencies) => {
  const router = Router();

  router.get("/:id/status", async (req, res): Promise<void> => {
    try {
      const status = await workflowService.getWorkflowStatus(req.params.id);

      res.status(200).json(status);
    } catch (error) {
      handleRouteError(error, res);
    }
  });

  router.get("/:id/results", async (req, res): Promise<void> => {
    try {
      const results = await workflowService.getWorkflowResults(req.params.id);

      res.status(200).json(results);
    } catch (error) {
      handleRouteError(error, res);
    }
  });

  return router;
};

const workflowService = new WorkflowService(
  AppDataSource.getRepository(Workflow),
);

export default buildWorkflowRouter({
  workflowService,
});
