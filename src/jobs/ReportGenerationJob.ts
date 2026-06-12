import { Job } from "./Job";
import { JobContext } from "./JobContext";
import { Task } from "../models/Task";

export class ReportGenerationJob implements Job {
  async run(task: Task, context?: JobContext): Promise<any> {
    if (!context) {
      throw new Error("ReportGenerationJob requires JobContext");
    }

    const workflowTasks = await context.taskRepository.find({
      where: {
        workflow: {
          workflowId: task.workflow.workflowId,
        },
      },
      relations: ["workflow"],
      order: {
        stepNumber: "ASC",
      },
    });

    const maxStepNumber = Math.max(
      ...workflowTasks.map((workflowTask) => workflowTask.stepNumber),
    );

    if (task.stepNumber !== maxStepNumber) {
      throw new Error("ReportGenerationJob must be the last workflow step");
    }

    const reportTasks = await Promise.all(
      workflowTasks
        .filter((workflowTask) => workflowTask.taskId !== task.taskId)
        .map(async (workflowTask) => {
          const result = workflowTask.resultId
            ? await context.resultRepository.findOne({
                where: {
                  resultId: workflowTask.resultId,
                },
              })
            : null;

          let output = null;

          if (result?.data) {
            try {
              output = JSON.parse(result.data);
            } catch {
              output = result.data;
            }
          }

          return {
            taskId: workflowTask.taskId,
            type: workflowTask.taskType,
            status: workflowTask.status,
            output,
          };
        }),
    );

    return {
      workflowId: task.workflow.workflowId,
      tasks: reportTasks,
      finalReport: "Aggregated data and results",
    };
  }
}
