import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildAnalysisRouter } from "../analysisRoutes";

describe("/analysis", () => {
  const workflowFactory = {
    createWorkflowFromYAML: vi.fn(),
  };
  const workflowExists = vi.fn();
  const app = express();
  app.use(express.json());
  app.use(
    "/analysis",
    buildAnalysisRouter({
      workflowFactory,
      workflowExists,
    }),
  );

  beforeEach(() => {
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

    const response = await request(app).post("/analysis").send({
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

    expect(response.status).toBe(202);
    expect(response.body).toEqual({
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

    const response = await request(app).post("/analysis").send({
      clientId: "client123",
      geoJson: {
        type: "Polygon",
        coordinates: [],
      },
    });

    expect(response.status).toBe(202);
    expect(response.body.workflow).toBe("example_workflow");
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

    const response = await request(app).post("/analysis").send({
      clientId: "client123",
      workflow: "missing_workflow",
      geoJson: {
        type: "Polygon",
        coordinates: [],
      },
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Workflow 'missing_workflow' not found",
    });
    expect(workflowFactory.createWorkflowFromYAML).not.toHaveBeenCalled();
  });

  it("returns 500 when workflow creation fails", async () => {
    workflowExists.mockReturnValue(true);
    workflowFactory.createWorkflowFromYAML.mockRejectedValue(new Error("boom"));

    const response = await request(app).post("/analysis").send({
      clientId: "client123",
      workflow: "example_workflow",
      geoJson: {
        type: "Polygon",
        coordinates: [],
      },
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: "Failed to create workflow",
    });
  });
});
