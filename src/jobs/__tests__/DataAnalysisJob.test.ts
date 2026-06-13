import { beforeEach, describe, expect, it, vi } from "vitest";

import { Task } from "../../models/Task";
import { DataAnalysisJob } from "../DataAnalysisJob";

const buildTask = (geoJson: string): Task =>
  ({
    taskId: "task-123",
    geoJson,
  }) as Task;

describe("DataAnalysisJob", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  it("returns the country name when the polygon is within a mapped country", async () => {
    const job = new DataAnalysisJob();
    const task = buildTask(
      JSON.stringify({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-63.624885020050996, -10.311050368263523],
              [-63.624885020050996, -10.367865108370523],
              [-63.61278302732815, -10.367865108370523],
              [-63.61278302732815, -10.311050368263523],
              [-63.624885020050996, -10.311050368263523],
            ],
          ],
        },
      }),
    );

    await expect(job.run(task)).resolves.toBe("Brazil");
  });

  it("returns a fallback message when the polygon is not within any mapped country", async () => {
    const job = new DataAnalysisJob();
    const task = buildTask(
      JSON.stringify({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ],
          ],
        },
      }),
    );

    await expect(job.run(task)).resolves.toBe("No country found");
  });
});
