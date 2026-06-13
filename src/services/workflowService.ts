import { Repository } from "typeorm";

import { Workflow } from "../models/Workflow";
import { Task } from "../models/Task";
import { TaskStatus } from "../workers/TaskStatus";
import { NotFoundError } from "../shared/errors/NotFoundError";

export class WorkflowService {
  constructor(private workflowRepository: Repository<Workflow>) {}

  async getWorkflowStatus(workflowId: string) {
    const workflow = await this.workflowRepository.findOne({
      where: { workflowId },
      relations: ["tasks"],
    });

    if (!workflow) {
      throw new NotFoundError(`Workflow ${workflowId} not found`);
    }

    const completedTasks = workflow.tasks.filter(
      (task: Task) => task.status === TaskStatus.Completed,
    ).length;

    return {
      workflowId: workflow.workflowId,
      status: workflow.status,
      completedTasks,
      totalTasks: workflow.tasks.length,
    };
  }
}
