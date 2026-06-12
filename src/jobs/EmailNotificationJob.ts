import { Job } from "./Job";
import { Task } from "../models/Task";
import { JobContext } from "./JobContext";

export class EmailNotificationJob implements Job {
  async run(task: Task, _context?: JobContext): Promise<void> {
    console.log(`Sending email notification for task ${task.taskId}...`);
    // Perform notification work
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log("Email sent!");
  }
}

