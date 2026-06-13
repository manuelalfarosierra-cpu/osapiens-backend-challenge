import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Task } from "../../models/Task";
import { EmailNotificationJob } from "../EmailNotificationJob";

describe("EmailNotificationJob", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("waits for the notification delay and completes", async () => {
    const job = new EmailNotificationJob();
    const task = {
      taskId: "task-123",
    } as Task;

    const runPromise = job.run(task);

    expect(console.log).toHaveBeenCalledWith(
      "Sending email notification for task task-123...",
    );

    await vi.advanceTimersByTimeAsync(500);
    await expect(runPromise).resolves.toBeUndefined();
    expect(console.log).toHaveBeenCalledWith("Email sent!");
  });
});
