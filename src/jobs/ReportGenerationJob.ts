import { Job } from "./Job";
import { JobContext } from "./JobContext";
import { Task } from "../models/Task";

export class ReportGenerationJob implements Job {
  async run(task: Task, context?: JobContext): Promise<any> {
    return {
      workflowId: task.workflow.workflowId,
      tasks: context?.dependencies ?? [],
      finalReport: "Aggregated data and results",
    };
  }
}
