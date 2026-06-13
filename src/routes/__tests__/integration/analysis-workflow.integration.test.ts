import type { NextFunction, Request, Response } from "express";
import type { Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { Task } from "../../../models/Task";
import { Workflow } from "../../../models/Workflow";
import { Result } from "../../../models/Result";
import { TaskRunner } from "../../../workers/taskRunner";
import { TaskStatus } from "../../../workers/TaskStatus";
import {
  buildAnalysisWorkflowTestRouter,
  createWorkflowTestDataSource,
} from "../../../test-utils/buildWorkflowTestApp";

describe("analysis to workflow integration", () => {
  let dataSource: Awaited<ReturnType<typeof createWorkflowTestDataSource>>;
  let workflowRepository: Repository<Workflow>;
  let taskRepository: Repository<Task>;
  let resultRepository: Repository<Result>;
  let router: ReturnType<typeof buildAnalysisWorkflowTestRouter>;

  const invokeRoute = async ({
    method,
    url,
    body,
  }: {
    method: "GET" | "POST";
    url: string;
    body?: unknown;
  }) => {
    const req = {
      method,
      url,
      body,
    } as unknown as Request;
    let statusCode: number | undefined;
    let responseBody: unknown;

    const res = {
      status(code: number) {
        statusCode = code;
        return res;
      },
      json(payload: unknown) {
        responseBody = payload;
        resolve();
        return res;
      },
    } as unknown as Response;

    let resolve!: () => void;

    await new Promise<void>((promiseResolve, reject) => {
      resolve = promiseResolve;

      (router as any).handle(req, res, ((error?: unknown) => {
        if (error) {
          reject(error);
        }
      }) as NextFunction);
    });

    return {
      status: statusCode,
      body: responseBody,
    };
  };

  const createAnalysisRequestBody = () => ({
    clientId: "client-123",
    workflow: "example_workflow",
    geoJson: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-63.624885020050996, -10.311050368263523],
            [-63.624885020050996, -10.367865108370523],
            [-63.61278302732815, -10.367865108370523],
            [-63.61278302732815, -10.311050368263523],
            [-63.624885020050996, -10.311050368263523],
          ],
        ],
      },
    },
  });

  const runWorkflowTasksLikeWorker = async (workflowId: string) => {
    const taskRunner = new TaskRunner(
      workflowRepository,
      taskRepository,
      resultRepository,
    );

    while (true) {
      const workflow = await workflowRepository.findOne({
        where: { workflowId },
        relations: ["tasks"],
      });

      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found during execution`);
      }

      const nextTask = workflow.tasks
        .filter((task) => task.status === TaskStatus.Queued)
        .sort((a, b) => a.stepNumber - b.stepNumber)[0];

      if (!nextTask) {
        break;
      }

      nextTask.workflow = workflow;
      await taskRunner.run(nextTask);
    }
  };

  beforeAll(async () => {
    dataSource = await createWorkflowTestDataSource();
    workflowRepository = dataSource.getRepository(Workflow);
    taskRepository = dataSource.getRepository(Task);
    resultRepository = dataSource.getRepository(Result);
    router = buildAnalysisWorkflowTestRouter(dataSource);
  });

  beforeEach(async () => {
    await resultRepository.clear();
    await taskRepository.clear();
    await workflowRepository.clear();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it("creates a workflow through /analysis and exposes it via /workflow/:id/status", async () => {
    const createResponse = await invokeRoute({
      method: "POST",
      url: "/analysis",
      body: createAnalysisRequestBody(),
    });

    expect(createResponse.status).toBe(202);
    expect(createResponse.body).toMatchObject({
      workflow: "example_workflow",
      message: "Workflow created and tasks queued from YAML definition.",
    });

    const workflowId = (createResponse.body as { workflowId: string }).workflowId;

    const statusResponse = await invokeRoute({
      method: "GET",
      url: `/workflow/${workflowId}/status`,
    });

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body).toEqual({
      workflowId,
      status: "initial",
      completedTasks: 0,
      totalTasks: 2,
    });
  });

  it("runs the queued tasks and updates the workflow status to completed", async () => {
    const createResponse = await invokeRoute({
      method: "POST",
      url: "/analysis",
      body: createAnalysisRequestBody(),
    });
    const workflowId = (createResponse.body as { workflowId: string }).workflowId;

    await runWorkflowTasksLikeWorker(workflowId);
    await vi.waitFor(async () => {
      const workflow = await workflowRepository.findOne({
        where: { workflowId },
      });

      expect(workflow?.status).toBe("completed");
      expect(workflow?.finalResult).toBeTruthy();
    });

    const statusResponse = await invokeRoute({
      method: "GET",
      url: `/workflow/${workflowId}/status`,
    });

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body).toEqual({
      workflowId,
      status: "completed",
      completedTasks: 2,
      totalTasks: 2,
    });

    const workflow = await workflowRepository.findOne({
      where: { workflowId },
    });
    expect(workflow?.finalResult).toBeTruthy();

    const tasks = await taskRepository.find({
      where: {
        workflow: {
          workflowId,
        },
      },
      order: {
        stepNumber: "ASC",
      },
    });

    expect(tasks.map((task) => task.status)).toEqual([
      TaskStatus.Completed,
      TaskStatus.Completed,
    ]);

    const resultsResponse = await invokeRoute({
      method: "GET",
      url: `/workflow/${workflowId}/results`,
    });

    expect(resultsResponse.status).toBe(200);
    expect(resultsResponse.body).toEqual({
      workflowId,
      status: "completed",
      finalResult: workflow?.finalResult,
    });
  });
});
