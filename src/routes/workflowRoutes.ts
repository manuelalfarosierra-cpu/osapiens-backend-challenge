import { Router } from "express";

import { AppDataSource } from "../data-source";
import { Workflow } from "../models/Workflow";
import { WorkflowService } from "../services/workflowService";
import { AppError } from "../shared/errors/AppError";

interface WorkflowRouteDependencies {
  workflowService: Pick<WorkflowService, "getWorkflowStatus">;
}

export const buildWorkflowRouter = ({
  workflowService,
}: WorkflowRouteDependencies) => {
  const router = Router();

  router.get("/:id/status", async (req, res): Promise<void> => {
    try {
      const status = await workflowService.getWorkflowStatus(req.params.id);

      res.status(200).json(status);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          message: error.message,
        });
        return;
      }

      console.error("Error getting workflow status:", error);

      res.status(500).json({
        message: "Internal server error",
      });
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
