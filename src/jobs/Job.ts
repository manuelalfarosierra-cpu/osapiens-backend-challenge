import { Task } from "../models/Task";
import { JobContext } from "./JobContext";

export interface Job {
  run(task: Task, context?: JobContext): Promise<any>;
}

