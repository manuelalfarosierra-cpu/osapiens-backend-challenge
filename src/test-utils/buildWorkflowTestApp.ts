import "reflect-metadata";

import fs from "fs";
import { Router } from "express";
import { DataSource } from "typeorm";

import { Workflow } from "../models/Workflow";
import { Task } from "../models/Task";
import { Result } from "../models/Result";
import { WorkflowService } from "../services/workflowService";
import { buildAnalysisRouter } from "../routes/analysisRoutes";
import { buildWorkflowRouter } from "../routes/workflowRoutes";
import { WorkflowFactory } from "../workflows/WorkflowFactory";

export const createWorkflowTestDataSource = async () => {
  const dataSource = new DataSource({
    type: "sqlite",
    database: ":memory:",
    dropSchema: true,
    entities: [Workflow, Task, Result],
    synchronize: true,
    logging: false,
  });

  await dataSource.initialize();

  return dataSource;
};

export const buildWorkflowTestRouter = (dataSource: DataSource) => {
  const workflowService = new WorkflowService(dataSource.getRepository(Workflow));

  return buildWorkflowRouter({
    workflowService,
  });
};

export const buildAnalysisWorkflowTestRouter = (dataSource: DataSource) => {
  const router = Router();
  const workflowFactory = new WorkflowFactory(dataSource);
  const workflowService = new WorkflowService(dataSource.getRepository(Workflow));

  router.use(
    "/analysis",
    buildAnalysisRouter({
      workflowFactory,
      workflowExists: fs.existsSync,
    }),
  );
  router.use(
    "/workflow",
    buildWorkflowRouter({
      workflowService,
    }),
  );

  return router;
};
