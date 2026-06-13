import type { Repository } from "typeorm";
import type { NextFunction, Request, Response } from "express";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const { Workflow } = await import("../../../models/Workflow");
const { Task } = await import("../../../models/Task");
const {
  buildWorkflowTestRouter,
  createWorkflowTestDataSource,
} = await import("../../../test-utils/buildWorkflowTestApp");

describe("GET /workflow/:id/status integration", () => {
  let dataSource: Awaited<ReturnType<typeof createWorkflowTestDataSource>>;
  let workflowRepository: Repository<InstanceType<typeof Workflow>>;
  let taskRepository: Repository<InstanceType<typeof Task>>;
  let router: ReturnType<typeof buildWorkflowTestRouter>;

  const invokeGet = async (url: string) => {
    const workflowId = url.split("/")[2];
    const routerUrl = url.replace(/^\/workflow/, "");
    const req = {
      method: "GET",
      url: routerUrl,
      params: {
        id: workflowId,
      },
    } as unknown as Request;
    let statusCode: number | undefined;
    let body: unknown;

    const res = {
      status(code: number) {
        statusCode = code;
        return res;
      },
      json(payload: unknown) {
        body = payload;
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
      body,
    };
  };

  beforeAll(async () => {
    dataSource = await createWorkflowTestDataSource();
    workflowRepository = dataSource.getRepository(Workflow);
    taskRepository = dataSource.getRepository(Task);
    router = buildWorkflowTestRouter(dataSource);
  });

  beforeEach(async () => {
    await taskRepository.clear();
    await workflowRepository.clear();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it("returns the workflow status summary from the real database", async () => {
    const workflow = await workflowRepository.save({
      workflowName: "example_workflow",
      clientId: "client-123",
      status: "in_progress",
    });

    await taskRepository.save([
      {
        clientId: "client-123",
        geoJson: "{}",
        status: "completed",
        taskType: "polygon_area",
        stepNumber: 1,
        workflow,
      },
      {
        clientId: "client-123",
        geoJson: "{}",
        status: "queued",
        taskType: "report_generation",
        stepNumber: 2,
        workflow,
      },
      {
        clientId: "client-123",
        geoJson: "{}",
        status: "completed",
        taskType: "email_notification",
        stepNumber: 3,
        workflow,
      },
    ]);

    const response = await invokeGet(
      `/workflow/${workflow.workflowId}/status`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      workflowId: workflow.workflowId,
      status: "in_progress",
      completedTasks: 2,
      totalTasks: 3,
    });
  });

  it("returns 404 when the workflow does not exist", async () => {
    const response = await invokeGet(
      "/workflow/00000000-0000-0000-0000-000000000000/status",
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Workflow 00000000-0000-0000-0000-000000000000 not found",
    });
  });
});
