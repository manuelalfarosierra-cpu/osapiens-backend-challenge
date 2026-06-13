import type { NextFunction, Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BadRequestError } from "../../shared/errors/BadRequestError";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { buildWorkflowRouter } from "../workflowRoutes";

type MockResponse = Pick<Response, "status" | "json"> & {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
};

const createMockResponse = (onComplete: () => void): MockResponse => {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  } as MockResponse;

  response.status.mockReturnValue(response);
  response.json.mockImplementation(() => {
    onComplete();
    return response;
  });

  return response;
};

const workflowService = {
  getWorkflowStatus: vi.fn(),
  getWorkflowResults: vi.fn(),
};

const buildRouter = () =>
  buildWorkflowRouter({
    workflowService,
  });

const invokeGetRoute = async (
  workflowId: string,
  path: "status" | "results" = "status",
  router = buildRouter(),
) => {
  const req = {
    method: "GET",
    url: `/${workflowId}/${path}`,
    params: {
      id: workflowId,
    },
  } as unknown as Request;
  let res: MockResponse;

  await new Promise<void>((resolve, reject) => {
    res = createMockResponse(resolve);

    (router as any).handle(req, res as unknown as Response, ((error?: unknown) => {
      if (error) {
        reject(error);
      }
    }) as NextFunction);
  });

  return res!;
};

describe("/workflow/:id/status", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    workflowService.getWorkflowStatus.mockReset();
    workflowService.getWorkflowResults.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the workflow status summary", async () => {
    workflowService.getWorkflowStatus.mockResolvedValue({
      workflowId: "workflow-123",
      status: "in_progress",
      completedTasks: 1,
      totalTasks: 3,
    });

    const response = await invokeGetRoute("workflow-123");

    expect(workflowService.getWorkflowStatus).toHaveBeenCalledWith(
      "workflow-123",
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      workflowId: "workflow-123",
      status: "in_progress",
      completedTasks: 1,
      totalTasks: 3,
    });
  });

  it("returns 404 when the workflow does not exist", async () => {
    workflowService.getWorkflowStatus.mockRejectedValue(
      new NotFoundError("Workflow missing-workflow not found"),
    );

    const response = await invokeGetRoute("missing-workflow");

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      message: "Workflow missing-workflow not found",
    });
  });

  it("returns 500 when the service fails unexpectedly", async () => {
    workflowService.getWorkflowStatus.mockRejectedValue(new Error("boom"));

    const response = await invokeGetRoute("workflow-123");

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      message: "Internal server error",
    });
  });
});

describe("/workflow/:id/results", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    workflowService.getWorkflowStatus.mockReset();
    workflowService.getWorkflowResults.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the completed workflow results", async () => {
    workflowService.getWorkflowResults.mockResolvedValue({
      workflowId: "workflow-123",
      status: "completed",
      finalResult: '{"summary":"done"}',
    });

    const response = await invokeGetRoute("workflow-123", "results");

    expect(workflowService.getWorkflowResults).toHaveBeenCalledWith(
      "workflow-123",
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      workflowId: "workflow-123",
      status: "completed",
      finalResult: '{"summary":"done"}',
    });
  });

  it("returns 400 when the workflow is not completed yet", async () => {
    workflowService.getWorkflowResults.mockRejectedValue(
      new BadRequestError("Workflow workflow-123 is not completed yet"),
    );

    const response = await invokeGetRoute("workflow-123", "results");

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      message: "Workflow workflow-123 is not completed yet",
    });
  });

  it("returns 404 when the workflow does not exist", async () => {
    workflowService.getWorkflowResults.mockRejectedValue(
      new NotFoundError("Workflow missing-workflow not found"),
    );

    const response = await invokeGetRoute("missing-workflow", "results");

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      message: "Workflow missing-workflow not found",
    });
  });
});
