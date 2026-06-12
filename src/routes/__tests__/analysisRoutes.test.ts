import type { NextFunction, Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildAnalysisRouter } from "../analysisRoutes";

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

const invokePostRoute = async (body: unknown, router = buildRouter()) => {
  const req = {
    method: "POST",
    url: "/",
    body,
  } as Request;
  let res: MockResponse;

  await new Promise<void>((resolve, reject) => {
    res = createMockResponse(resolve);

    router.handle(req, res as Response, ((error?: unknown) => {
      if (error) {
        reject(error);
      }
    }) as NextFunction);
  });

  return res!;
};

const workflowFactory = {
  createWorkflowFromYAML: vi.fn(),
};
const workflowExists = vi.fn();

const buildRouter = () =>
  buildAnalysisRouter({
    workflowFactory,
    workflowExists,
  });

describe("/analysis", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    workflowExists.mockReset();
    workflowFactory.createWorkflowFromYAML.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates a workflow and queues tasks", async () => {
    workflowExists.mockReturnValue(true);
    workflowFactory.createWorkflowFromYAML.mockResolvedValue({
      workflowId: "workflow-123",
    });

    const response = await invokePostRoute({
      clientId: "client123",
      workflow: "example_workflow",
      geoJson: {
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
    });

    expect(response.status).toHaveBeenCalledWith(202);
    expect(response.json).toHaveBeenCalledWith({
      workflowId: "workflow-123",
      workflow: "example_workflow",
      message: "Workflow created and tasks queued from YAML definition.",
    });
    expect(workflowFactory.createWorkflowFromYAML).toHaveBeenCalledWith(
      expect.stringContaining("example_workflow.yml"),
      "client123",
      JSON.stringify({
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
      }),
    );
  });

  it("uses the default workflow when none is provided", async () => {
    workflowExists.mockReturnValue(true);
    workflowFactory.createWorkflowFromYAML.mockResolvedValue({
      workflowId: "workflow-456",
    });

    const response = await invokePostRoute({
      clientId: "client123",
      geoJson: {
        type: "Polygon",
        coordinates: [],
      },
    });

    expect(response.status).toHaveBeenCalledWith(202);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow: "example_workflow",
      }),
    );
    expect(workflowFactory.createWorkflowFromYAML).toHaveBeenCalledWith(
      expect.stringContaining("example_workflow.yml"),
      "client123",
      JSON.stringify({
        type: "Polygon",
        coordinates: [],
      }),
    );
  });

  it("returns 404 when the workflow file does not exist", async () => {
    workflowExists.mockReturnValue(false);

    const response = await invokePostRoute({
      clientId: "client123",
      workflow: "missing_workflow",
      geoJson: {
        type: "Polygon",
        coordinates: [],
      },
    });

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      message: "Workflow 'missing_workflow' not found",
    });
    expect(workflowFactory.createWorkflowFromYAML).not.toHaveBeenCalled();
  });

  it("returns 500 when workflow creation fails", async () => {
    workflowExists.mockReturnValue(true);
    workflowFactory.createWorkflowFromYAML.mockRejectedValue(new Error("boom"));

    const response = await invokePostRoute({
      clientId: "client123",
      workflow: "example_workflow",
      geoJson: {
        type: "Polygon",
        coordinates: [],
      },
    });

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      message: "Failed to create workflow",
    });
  });
});
