import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../workflows/WorkflowFactory", () => ({
  WorkflowStatus: {
    Initial: "initial",
    InProgress: "in_progress",
    Completed: "completed",
    Failed: "failed",
  },
}));

import * as JobFactory from "../../jobs/JobFactory";
import { Result } from "../../models/Result";
import { Task } from "../../models/Task";
import { Workflow } from "../../models/Workflow";
import { TaskRunner } from "../taskRunner";
import { TaskStatus } from "../TaskStatus";

describe("TaskRunner", () => {
  const workflowRepository = {
    findOne: vi.fn(),
    save: vi.fn(),
  };
  const taskRepository = {
    findOne: vi.fn(),
    save: vi.fn(),
  };
  const resultRepository = {
    findOne: vi.fn(),
    save: vi.fn(),
  };

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    workflowRepository.findOne.mockReset();
    workflowRepository.save.mockReset();
    taskRepository.findOne.mockReset();
    taskRepository.save.mockReset();
    resultRepository.findOne.mockReset();
    resultRepository.save.mockReset();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("passes dependency outputs into report generation and stores finalResult", async () => {
    const runner = new TaskRunner(
      workflowRepository as any,
      taskRepository as any,
      resultRepository as any,
    );

    const dependencyAreaTask = {
      taskId: "task-1",
      stepId: "polygon-area",
      taskType: "polygonArea",
      stepNumber: 1,
      status: TaskStatus.Completed,
      resultId: "result-1",
    } as Task;
    const dependencyAnalysisTask = {
      taskId: "task-2",
      stepId: "analysis",
      taskType: "analysis",
      stepNumber: 2,
      status: TaskStatus.Failed,
      resultId: "result-2",
    } as Task;
    const reportTask = {
      taskId: "task-3",
      stepId: "report",
      taskType: "reportGeneration",
      stepNumber: 3,
      status: TaskStatus.Queued,
      workflow: {
        workflowId: "workflow-123",
        workflowName: "report_workflow",
      } as Workflow,
      dependsOn: JSON.stringify(["polygon-area", "analysis"]),
    } as Task;

    const currentWorkflow = {
      workflowId: "workflow-123",
      workflowName: "report_workflow",
      status: "initial",
      tasks: [reportTask, dependencyAnalysisTask, dependencyAreaTask],
    } as Workflow;

    const resultsById = new Map<string, Result | null>([
      [
        "result-1",
        {
          resultId: "result-1",
          taskId: "task-1",
          data: JSON.stringify({ area: 123.45 }),
        } as Result,
      ],
      [
        "result-2",
        {
          resultId: "result-2",
          taskId: "task-2",
          data: JSON.stringify({ message: "analysis failed" }),
        } as Result,
      ],
    ]);

    taskRepository.findOne.mockImplementation(async ({ where }) => {
      if (where.stepId === "polygon-area") {
        return dependencyAreaTask;
      }

      if (where.stepId === "analysis") {
        return dependencyAnalysisTask;
      }

      return null;
    });
    resultRepository.findOne.mockImplementation(async ({ where }) => {
      return resultsById.get(where.resultId) ?? null;
    });
    resultRepository.save.mockImplementation(async (result: Result) => {
      result.resultId = "result-3";
      const savedResult = result as Result;
      resultsById.set("result-3", savedResult);
      return savedResult;
    });
    workflowRepository.findOne.mockResolvedValue(currentWorkflow);
    workflowRepository.save.mockImplementation(async (workflow) => workflow);

    await runner.run(reportTask);

    expect(reportTask.status).toBe(TaskStatus.Completed);
    expect(reportTask.resultId).toBe("result-3");

    const reportOutput = JSON.parse(resultsById.get("result-3")!.data!);
    expect(reportOutput).toEqual({
      workflowId: "workflow-123",
      tasks: [
        {
          stepId: "polygon-area",
          taskId: "task-1",
          taskType: "polygonArea",
          status: TaskStatus.Completed,
          output: { area: 123.45 },
        },
        {
          stepId: "analysis",
          taskId: "task-2",
          taskType: "analysis",
          status: TaskStatus.Failed,
          output: { message: "analysis failed" },
        },
      ],
      finalReport: "Aggregated data and results",
    });

    await vi.waitFor(() => {
      expect(currentWorkflow.status).toBe("failed");
      expect(currentWorkflow.finalResult).toBeTruthy();
    });

    const finalResult = JSON.parse(currentWorkflow.finalResult!);
    expect(finalResult).toEqual({
      workflowId: "workflow-123",
      workflowName: "report_workflow",
      status: "failed",
      tasks: [
        {
          stepId: "polygon-area",
          taskId: "task-1",
          taskType: "polygonArea",
          status: TaskStatus.Completed,
          output: { area: 123.45 },
        },
        {
          stepId: "analysis",
          taskId: "task-2",
          taskType: "analysis",
          status: TaskStatus.Failed,
          output: { message: "analysis failed" },
        },
        {
          stepId: "report",
          taskId: "task-3",
          taskType: "reportGeneration",
          status: TaskStatus.Completed,
          output: reportOutput,
        },
      ],
    });
  });

  it("does not execute a job when one dependency is still pending", async () => {
    const job = {
      run: vi.fn(),
    };
    vi.spyOn(JobFactory, "getJobForTaskType").mockReturnValue(job as any);

    const runner = new TaskRunner(
      workflowRepository as any,
      taskRepository as any,
      resultRepository as any,
    );

    const dependencyTask = {
      taskId: "task-1",
      stepId: "analysis",
      taskType: "analysis",
      stepNumber: 1,
      status: TaskStatus.Queued,
      resultId: "result-1",
    } as Task;
    const dependentTask = {
      taskId: "task-2",
      stepId: "report",
      taskType: "reportGeneration",
      stepNumber: 2,
      status: TaskStatus.Queued,
      workflow: {
        workflowId: "workflow-123",
        workflowName: "report_workflow",
      } as Workflow,
      dependsOn: JSON.stringify(["analysis"]),
    } as Task;
    const currentWorkflow = {
      workflowId: "workflow-123",
      workflowName: "report_workflow",
      status: "initial",
      tasks: [dependencyTask, dependentTask],
    } as Workflow;

    taskRepository.findOne.mockResolvedValue(dependencyTask);
    resultRepository.save.mockImplementation(async (result: Result) => {
      result.resultId = "failed-result";
      return result;
    });
    workflowRepository.findOne.mockResolvedValue(currentWorkflow);
    workflowRepository.save.mockImplementation(async (workflow) => workflow);

    await expect(runner.run(dependentTask)).rejects.toThrow(
      "Dependency analysis is not completed",
    );

    expect(job.run).not.toHaveBeenCalled();
    expect(dependentTask.status).toBe(TaskStatus.Failed);
    await vi.waitFor(() => {
      expect(currentWorkflow.status).toBe("in_progress");
      expect(currentWorkflow.finalResult).toBeUndefined();
    });
  });
});
