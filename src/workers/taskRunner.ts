import { Repository } from "typeorm";
import { Task } from "../models/Task";
import { getJobForTaskType } from "../jobs/JobFactory";
import { WorkflowStatus } from "../workflows/WorkflowFactory";
import { Workflow } from "../models/Workflow";
import { Result } from "../models/Result";
import { JobContext } from "../jobs/JobContext";

export enum TaskStatus {
  Queued = "queued",
  InProgress = "in_progress",
  Completed = "completed",
  Failed = "failed",
}

export class TaskRunner {
  constructor(
    private workflowRepository: Repository<Workflow>,
    private taskRepository: Repository<Task>,
    private resultRepository: Repository<Result>,
  ) {}

  /**
   * Runs the appropriate job based on the task's type, managing the task's status.
   * @param task - The task entity that determines which job to run.
   * @throws If the job fails, it rethrows the error.
   */
  async run(task: Task): Promise<void> {
    task.status = TaskStatus.InProgress;
    task.progress = "starting job...";
    await this.taskRepository.save(task);
    const job = getJobForTaskType(task.taskType);

    try {
      console.log(
        `[STARTING JOB] ${task.stepId} ${task.stepNumber} ${task.workflow?.workflowName}`,
      );
      const context = task.requiresContext
        ? {
            taskRepository: this.taskRepository,
            resultRepository: this.resultRepository,
            workflowRepository: this.workflowRepository,
          }
        : undefined;
      const taskResult = await job.run(task, context);
      console.log(
        `[JOB FINISHED OK] ${task.stepId} ${task.stepNumber} ${task.workflow?.workflowName}`,
      );
      const result = new Result();
      result.taskId = task.taskId!;
      result.data = JSON.stringify(taskResult || {});
      await this.resultRepository.save(result);
      task.resultId = result.resultId!;
      task.status = TaskStatus.Completed;
      task.progress = null;
      await this.taskRepository.save(task);
    } catch (error: any) {
      console.error(
        `[JOB FINISHED ERROR] Job ${task.stepId} for task ${task.taskId}: ${error.message}`,
      );

      const result = new Result();
      result.taskId = task.taskId!;
      result.data = JSON.stringify({
        message: error.message,
        stack: error.stack,
      });
      await this.resultRepository.save(result);

      task.resultId = result.resultId!;
      task.status = TaskStatus.Failed;
      task.progress = null;
      await this.taskRepository.save(task);

      throw error;
    }

    const currentWorkflow = await this.workflowRepository.findOne({
      where: { workflowId: task.workflow.workflowId },
      relations: ["tasks"],
    });

    if (currentWorkflow) {
      const allFinished = currentWorkflow.tasks.every(
        (t) =>
          t.status === TaskStatus.Completed || t.status === TaskStatus.Failed,
      );

      const anyFailed = currentWorkflow.tasks.some(
        (t) => t.status === TaskStatus.Failed,
      );

      if (!allFinished) {
        currentWorkflow.status = WorkflowStatus.InProgress;
      } else if (anyFailed) {
        currentWorkflow.status = WorkflowStatus.Failed;
      } else {
        currentWorkflow.status = WorkflowStatus.Completed;
      }

      await this.workflowRepository.save(currentWorkflow);
    }
  }
}
