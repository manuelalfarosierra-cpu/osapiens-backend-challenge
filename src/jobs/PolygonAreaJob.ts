import { area } from "@turf/turf";
import { Feature, Polygon, MultiPolygon } from "geojson";

import { Job } from "./Job";
import { Task } from "../models/Task";

export class PolygonAreaJob implements Job {
  async run(task: Task): Promise<any> {
    console.log(`Running polygon area calculation for task ${task.taskId}...`);

    if (!task.geoJson) {
      throw new Error("Missing geoJson in task");
    }

    let inputGeometry: Feature<Polygon | MultiPolygon>;

    try {
      inputGeometry = JSON.parse(task.geoJson) as Feature<Polygon | MultiPolygon>;
    } catch {
      throw new Error("Invalid GeoJSON: unable to parse JSON");
    }

    try {
      const polygonArea = area(inputGeometry);

      if (!Number.isFinite(polygonArea) || polygonArea <= 0) {
        throw new Error("Invalid GeoJSON: unable to calculate polygon area");
      }

      return {
        areaSquareMeters: polygonArea,
      };
    } catch {
      throw new Error("Invalid GeoJSON: unable to calculate polygon area");
    }
  }
}
