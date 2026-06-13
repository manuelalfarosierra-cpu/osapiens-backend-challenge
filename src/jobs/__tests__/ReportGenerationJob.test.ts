import { describe, expect, it } from "vitest";

import { Task } from "../../models/Task";
import { JobContext } from "../JobContext";
import { ReportGenerationJob } from "../ReportGenerationJob";

describe("ReportGenerationJob", () => {
  it("returns the workflow id and dependency outputs", async () => {
    const job = new ReportGenerationJob();
    const task = {
      workflow: {
        workflowId: "workflow-123",
      },
    } as Task;
    const context: JobContext = {
      dependencies: [
        {
          stepId: "analysis",
          taskId: "task-1",
          taskType: "analysis",
          status: "completed" as any,
          output: "Brazil",
        },
      ],
    };

    await expect(job.run(task, context)).resolves.toEqual({
      workflowId: "workflow-123",
      tasks: context.dependencies,
      finalReport: "Aggregated data and results",
    });
  });

  it("returns an empty dependency list when no context is provided", async () => {
    const job = new ReportGenerationJob();
    const task = {
      workflow: {
        workflowId: "workflow-456",
      },
    } as Task;

    await expect(job.run(task)).resolves.toEqual({
      workflowId: "workflow-456",
      tasks: [],
      finalReport: "Aggregated data and results",
    });
  });
});
