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
      const context = await this.buildJobContext(task);
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
    } finally {
      this.updateWorkflowStatusAndResult(task);
    }
  }

  private async buildJobContext(task: Task): Promise<JobContext> {
    const dependencies = task.dependsOn ? JSON.parse(task.dependsOn) : [];

    const dependencyOutputs = await Promise.all(
      dependencies.map(async (dependencyStepId: string) => {
        const dependencyTask = await this.taskRepository.findOne({
          where: {
            workflow: {
              workflowId: task.workflow.workflowId,
            },
            stepId: dependencyStepId,
          },
        });

        if (!dependencyTask) {
          throw new Error(`Dependency ${dependencyStepId} not found`);
        }

        if (
          dependencyTask.status !== TaskStatus.Completed &&
          dependencyTask.status !== TaskStatus.Failed
        ) {
          throw new Error(`Dependency ${dependencyStepId} is not completed`);
        }

        const result = dependencyTask.resultId
          ? await this.resultRepository.findOne({
              where: {
                resultId: dependencyTask.resultId,
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
          stepId: dependencyTask.stepId,
          taskId: dependencyTask.taskId,
          taskType: dependencyTask.taskType,
          status: dependencyTask.status,
          output,
        };
      }),
    );

    return {
      dependencies: dependencyOutputs,
    };
  }

  private async updateWorkflowStatusAndResult(task: Task): Promise<void> {
    const currentWorkflow = await this.workflowRepository.findOne({
      where: { workflowId: task.workflow.workflowId },
      relations: ["tasks"],
    });

    if (!currentWorkflow) {
      return;
    }

    const allFinished = currentWorkflow.tasks.every(
      (t) =>
        t.status === TaskStatus.Completed || t.status === TaskStatus.Failed,
    );

    const anyFailed = currentWorkflow.tasks.some(
      (t) => t.status === TaskStatus.Failed,
    );

    if (!allFinished) {
      currentWorkflow.status = WorkflowStatus.InProgress;
    } else {
      currentWorkflow.status = anyFailed
        ? WorkflowStatus.Failed
        : WorkflowStatus.Completed;

      currentWorkflow.finalResult =
        await this.buildWorkflowFinalResult(currentWorkflow);
    }

    await this.workflowRepository.save(currentWorkflow);
  }

  private async buildWorkflowFinalResult(workflow: Workflow): Promise<string> {
    const tasks = await Promise.all(
      workflow.tasks
        .sort((a, b) => a.stepNumber - b.stepNumber)
        .map(async (task) => {
          const result = task.resultId
            ? await this.resultRepository.findOne({
                where: { resultId: task.resultId },
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
            stepId: task.stepId,
            taskId: task.taskId,
            taskType: task.taskType,
            status: task.status,
            output,
          };
        }),
    );

    return JSON.stringify({
      workflowId: workflow.workflowId,
      workflowName: workflow.workflowName,
      status: workflow.status,
      tasks,
    });
  }
}
