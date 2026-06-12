import * as fs from "fs";
import * as yaml from "js-yaml";
import { DataSource } from "typeorm";
import { Workflow } from "../models/Workflow";
import { Task } from "../models/Task";
import { TaskStatus } from "../workers/taskRunner";
import { BadRequestError } from "../shared/errors/BadRequestError";
import { hasJobForTaskType } from "../jobs/JobFactory";

export enum WorkflowStatus {
  Initial = "initial",
  InProgress = "in_progress",
  Completed = "completed",
  Failed = "failed",
}

interface WorkflowStep {
  stepId?: string;
  taskType: string;
  stepNumber: number;
  dependsOn?: string[];
}

interface WorkflowDefinition {
  name: string;
  steps: WorkflowStep[];
}

export class WorkflowFactory {
  constructor(private dataSource: DataSource) {}

  /**
   * Creates a workflow by reading a YAML file and constructing the Workflow and Task entities.
   * @param filePath - Path to the YAML file.
   * @param clientId - Client identifier for the workflow.
   * @param geoJson - The geoJson data string for tasks (customize as needed).
   * @returns A promise that resolves to the created Workflow.
   */
  async createWorkflowFromYAML(
    filePath: string,
    clientId: string,
    geoJson: string,
  ): Promise<Workflow> {
    const fileContent = fs.readFileSync(filePath, "utf8");
    const workflowDef = yaml.load(fileContent) as WorkflowDefinition;
    const workflowRepository = this.dataSource.getRepository(Workflow);
    const taskRepository = this.dataSource.getRepository(Task);
    const workflow = new Workflow();

    this.validateWorkflowSteps(workflowDef.steps);

    workflow.clientId = clientId;
    workflow.status = WorkflowStatus.Initial;
    workflow.workflowName = workflowDef.name;

    const savedWorkflow = await workflowRepository.save(workflow);

    const tasks: Task[] = workflowDef.steps.map((step) => {
      const task = new Task();
      task.clientId = clientId;
      task.geoJson = geoJson;
      task.status = TaskStatus.Queued;
      task.stepId = step.stepId;
      task.taskType = step.taskType;
      task.stepNumber = step.stepNumber;
      task.workflow = savedWorkflow;
      task.dependsOn = step.dependsOn ? JSON.stringify(step.dependsOn) : null;
      return task;
    });

    await taskRepository.save(tasks);

    return savedWorkflow;
  }

  private validateWorkflowSteps(steps: any[]) {
    const stepIds = new Set<string>();
    const stepNumbers = new Set<number>();

    for (const step of steps) {
      // StepId required
      if (!step.stepId) {
        throw new BadRequestError("Each workflow step must define an id");
      }

      // StepId no duplicated
      if (stepIds.has(step.stepId)) {
        throw new BadRequestError(`Duplicated workflow step id: ${step.id}`);
      }

      // StepNumber requited
      if (step.stepNumber === undefined || step.stepNumber === null) {
        throw new BadRequestError(
          `Step ${step.stepId} must define a stepNumber`,
        );
      }

      // StepNumber no duplicated
      if (stepNumbers.has(step.stepNumber)) {
        throw new BadRequestError(
          `Duplicated workflow stepNumber: ${step.stepNumber}`,
        );
      }

      // TaskType required
      if (!step.taskType) {
        throw new BadRequestError(`Step ${step.stepId} must define a taskType`);
      }

      // TaskType exist
      if (!hasJobForTaskType(step.taskType)) {
        throw new BadRequestError(
          `Unknown taskType '${step.taskType}' in step '${step.stepId}'`,
        );
      }

      // Validate dependsOn is an Array
      if (step.dependsOn) {
        if (!Array.isArray(step.dependsOn)) {
          throw new BadRequestError(
            `Step ${step.stepId} dependsOn must be an array`,
          );
        }
      }

      // Validate dependsOn duplicated
      if (step.dependsOn) {
        const uniqueDependencies = new Set(step.dependsOn);

        if (uniqueDependencies.size !== step.dependsOn.length) {
          throw new BadRequestError(
            `Step ${step.stepId} has duplicated dependencies`,
          );
        }
      }

      // Validate dependsOn jobs exists
      if (step.dependsOn) {
        for (const dependencyStepId of step.dependsOn) {
          if (!stepIds.has(dependencyStepId)) {
            throw new BadRequestError(
              `Step ${step.stepId} depends on '${dependencyStepId}', but it was not defined in a previous step`,
            );
          }
        }
      }

      stepNumbers.add(step.stepNumber);
      stepIds.add(step.stepId);
    }
  }
}
