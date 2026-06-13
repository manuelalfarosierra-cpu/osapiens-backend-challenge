import { Router, Response } from "express";
import { AppDataSource } from "../data-source";
import { WorkflowFactory } from "../workflows/WorkflowFactory"; // Create a folder for factories if you prefer
import path from "path";
import fs from "fs";
import { AppError } from "../shared/errors/AppError";

interface AnalysisRouteDependencies {
  workflowFactory: Pick<WorkflowFactory, "createWorkflowFromYAML">;
  workflowExists: (workflowFile: string) => boolean;
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
    message: "Failed to create workflow",
  });
};

export const buildAnalysisRouter = ({
  workflowFactory,
  workflowExists,
}: AnalysisRouteDependencies) => {
  const router = Router();

  router.post("/", async (req, res): Promise<void> => {
    const { clientId, geoJson, workflow } = req.body;

    const workflowName = workflow ?? "example_workflow";

    const workflowFile = path.join(
      __dirname,
      `../workflows/${workflowName}.yml`,
    );

    if (!workflowExists(workflowFile)) {
      res.status(404).json({
        message: `Workflow '${workflowName}' not found`,
      });
      return;
    }

    try {
      const workflowEntity = await workflowFactory.createWorkflowFromYAML(
        workflowFile,
        clientId,
        JSON.stringify(geoJson),
      );

      res.status(202).json({
        workflowId: workflowEntity.workflowId,
        workflow: workflowName,
        message: "Workflow created and tasks queued from YAML definition.",
      });
    } catch (error) {
      handleRouteError(error, res);
    }
  });

  return router;
};

const workflowFactory = new WorkflowFactory(AppDataSource);

export default buildAnalysisRouter({
  workflowFactory,
  workflowExists: fs.existsSync,
});
