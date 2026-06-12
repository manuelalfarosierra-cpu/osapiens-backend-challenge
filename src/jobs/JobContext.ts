import { TaskStatus } from "../workers/taskRunner";

export interface JobDependencyOutput {
  stepId: string;
  taskId: string;
  taskType: string;
  status: TaskStatus;
  output: unknown;
}

export interface JobContext {
  dependencies: JobDependencyOutput[];
}
