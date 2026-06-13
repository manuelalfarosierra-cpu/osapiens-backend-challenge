import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotFoundError } from "../../shared/errors/NotFoundError";

vi.mock("../../workers/taskRunner", () => ({
  TaskStatus: {
    Queued: "queued",
    InProgress: "in_progress",
    Completed: "completed",
    Failed: "failed",
  },
}));

const { WorkflowService } = await import("../workflowService");

describe("WorkflowService", () => {
  let findOne: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    findOne = vi.fn();
  });

  it("returns the workflow status summary with completed task count", async () => {
    findOne.mockResolvedValue({
      workflowId: "workflow-123",
      status: "in_progress",
      tasks: [
        { status: "completed" },
        { status: "queued" },
        { status: "completed" },
      ],
    });
    const workflowService = new WorkflowService({
      findOne,
    } as any);

    await expect(
      workflowService.getWorkflowStatus("workflow-123"),
    ).resolves.toEqual({
      workflowId: "workflow-123",
      status: "in_progress",
      completedTasks: 2,
      totalTasks: 3,
    });
    expect(findOne).toHaveBeenCalledWith({
      where: { workflowId: "workflow-123" },
      relations: ["tasks"],
    });
  });

  it("throws NotFoundError when the workflow does not exist", async () => {
    const workflowService = new WorkflowService({
      findOne,
    } as any);
    findOne.mockResolvedValue(null);

    const error = await workflowService
      .getWorkflowStatus("missing-workflow")
      .catch((thrownError) => thrownError);

    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.message).toBe("Workflow missing-workflow not found");
    expect(error.statusCode).toBe(404);
  });
});
