import { AppDataSource } from "../data-source";
import { Task } from "../models/Task";
import { Workflow } from "../models/Workflow";
import { Result } from "../models/Result";
import { TaskRunner, TaskStatus } from "./taskRunner";
import { WorkflowStatus } from "../workflows/WorkflowFactory";

export async function taskWorker() {
  const workflowRepository = AppDataSource.getRepository(Workflow);
  const taskRepository = AppDataSource.getRepository(Task);
  const resultRepository = AppDataSource.getRepository(Result);
  const taskRunner = new TaskRunner(
    workflowRepository,
    taskRepository,
    resultRepository,
  );

  while (true) {
    const workflow = await workflowRepository.findOne({
      where: [
        {
          status: WorkflowStatus.Initial,
        },
        {
          status: WorkflowStatus.InProgress,
        },
      ],
      relations: ["tasks"],
    });

    if (!workflow) {
      continue;
    }

    const nextTask = workflow.tasks
      .filter((task) => task.status === TaskStatus.Queued)
      .sort((a, b) => a.stepNumber - b.stepNumber)[0];

    if (!nextTask) {
      continue;
    }

    try {
      nextTask.workflow = workflow;
      await taskRunner.run(nextTask);
    } catch (error) {
      console.error(
        "[ERROR] Task execution failed. Task status has already been updated by TaskRunner.",
      );
    }

    // Wait before checking for the next task again
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
