import { describe, expect, it } from "vitest";

import { PolygonAreaJob } from "../PolygonAreaJob";
import { Task } from "../../models/Task";

const buildTask = (geoJson?: string): Task =>
  ({
    taskId: "task-123",
    geoJson,
  }) as Task;

describe("PolygonAreaJob", () => {
  it("returns the area in square meters for a valid polygon", async () => {
    const job = new PolygonAreaJob();
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

    const result = await job.run(task);

    expect(result).toEqual({
      areaSquareMeters: expect.any(Number),
    });
    expect(result.areaSquareMeters).toBeGreaterThan(1.2e10);
    expect(result.areaSquareMeters).toBeLessThan(1.3e10);
  });

  it("throws when geoJson is missing", async () => {
    const job = new PolygonAreaJob();

    await expect(job.run(buildTask())).rejects.toThrow("Missing geoJson in task");
  });

  it("throws a parse error when geoJson is not valid JSON", async () => {
    const job = new PolygonAreaJob();

    await expect(job.run(buildTask("{invalid json"))).rejects.toThrow(
      "Invalid GeoJSON: unable to parse JSON",
    );
  });

  it("throws a calculation error when the JSON is not a valid polygon feature", async () => {
    const job = new PolygonAreaJob();
    const task = buildTask(
      JSON.stringify({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      }),
    );

    await expect(job.run(task)).rejects.toThrow(
      "Invalid GeoJSON: unable to calculate polygon area",
    );
  });
});
