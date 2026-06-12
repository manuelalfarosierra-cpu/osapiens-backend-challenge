import { Repository } from "typeorm";

import { Task } from "../models/Task";
import { Result } from "../models/Result";
import { Workflow } from "../models/Workflow";

export interface JobContext {
  taskRepository: Repository<Task>;
  resultRepository: Repository<Result>;
  workflowRepository: Repository<Workflow>;
}
