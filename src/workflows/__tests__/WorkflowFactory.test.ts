import * as fs from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Task } from "../../models/Task";
import { Workflow } from "../../models/Workflow";
import { TaskStatus } from "../../workers/taskRunner";
import {
  WorkflowFactory,
  WorkflowStatus,
} from "../WorkflowFactory";

describe("WorkflowFactory", () => {
  let tempDirectory: string | null = null;

  const workflowRepository = {
    save: vi.fn(),
  };
  const taskRepository = {
    save: vi.fn(),
  };
  const dataSource = {
    getRepository: vi.fn((entity) => {
      if (entity === Workflow) {
        return workflowRepository;
      }

      if (entity === Task) {
        return taskRepository;
      }

      throw new Error(`Unexpected entity: ${String(entity)}`);
    }),
  };

  beforeEach(() => {
    workflowRepository.save.mockReset();
    taskRepository.save.mockReset();
    dataSource.getRepository.mockClear();
  });

  afterEach(() => {
    if (tempDirectory) {
      fs.rmSync(tempDirectory, { recursive: true, force: true });
      tempDirectory = null;
    }

    vi.clearAllMocks();
  });

  const createYamlFile = (fileName: string, content: string) => {
    tempDirectory = fs.mkdtempSync(join(tmpdir(), "workflow-factory-"));
    const filePath = join(tempDirectory, fileName);
    fs.writeFileSync(filePath, content, "utf8");
    return filePath;
  };

  it("creates tasks from YAML and serializes report dependencies", async () => {
    const filePath = createYamlFile(
      "report_workflow.yml",
      `name: "report_workflow"
steps:
  - stepId: "polygon-area"
    taskType: "polygonArea"
    stepNumber: 1
  - stepId: "analysis"
    taskType: "analysis"
    stepNumber: 2
  - stepId: "report"
    taskType: "reportGeneration"
    stepNumber: 3
    dependsOn:
      - polygon-area
      - analysis
`,
    );

    workflowRepository.save.mockImplementation(async (workflow) => ({
      ...workflow,
      workflowId: "workflow-123",
    }));
    taskRepository.save.mockImplementation(async (tasks) => tasks);

    const factory = new WorkflowFactory(dataSource as any);
    const workflow = await factory.createWorkflowFromYAML(
      filePath,
      "client-123",
      '{"type":"Polygon"}',
    );

    expect(workflow).toMatchObject({
      workflowId: "workflow-123",
      clientId: "client-123",
      workflowName: "report_workflow",
      status: WorkflowStatus.Initial,
    });
    expect(taskRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        clientId: "client-123",
        geoJson: '{"type":"Polygon"}',
        status: TaskStatus.Queued,
        stepId: "polygon-area",
        taskType: "polygonArea",
        stepNumber: 1,
        dependsOn: null,
      }),
      expect.objectContaining({
        clientId: "client-123",
        status: TaskStatus.Queued,
        stepId: "analysis",
        taskType: "analysis",
        stepNumber: 2,
        dependsOn: null,
      }),
      expect.objectContaining({
        clientId: "client-123",
        status: TaskStatus.Queued,
        stepId: "report",
        taskType: "reportGeneration",
        stepNumber: 3,
        dependsOn: JSON.stringify(["polygon-area", "analysis"]),
      }),
    ]);
  });

  it("rejects dependencies declared as a non-array value", async () => {
    const filePath = createYamlFile(
      "invalid_workflow.yml",
      `name: "invalid_workflow"
steps:
  - stepId: "analysis"
    taskType: "analysis"
    stepNumber: 1
    dependsOn: "polygon-area"
`,
    );

    const factory = new WorkflowFactory(dataSource as any);

    await expect(
      factory.createWorkflowFromYAML(filePath, "client-123", "{}"),
    ).rejects.toThrow("Step analysis dependsOn must be an array");
  });

  it("rejects duplicated dependencies in a step", async () => {
    const filePath = createYamlFile(
      "invalid_workflow.yml",
      `name: "invalid_workflow"
steps:
  - stepId: "analysis"
    taskType: "analysis"
    stepNumber: 1
  - stepId: "report"
    taskType: "reportGeneration"
    stepNumber: 2
    dependsOn:
      - analysis
      - analysis
`,
    );

    const factory = new WorkflowFactory(dataSource as any);

    await expect(
      factory.createWorkflowFromYAML(filePath, "client-123", "{}"),
    ).rejects.toThrow("Step report has duplicated dependencies");
  });

  it("rejects dependencies that point to a later or missing step", async () => {
    const filePath = createYamlFile(
      "invalid_workflow.yml",
      `name: "invalid_workflow"
steps:
  - stepId: "report"
    taskType: "reportGeneration"
    stepNumber: 1
    dependsOn:
      - analysis
  - stepId: "analysis"
    taskType: "analysis"
    stepNumber: 2
`,
    );

    const factory = new WorkflowFactory(dataSource as any);

    await expect(
      factory.createWorkflowFromYAML(filePath, "client-123", "{}"),
    ).rejects.toThrow(
      "Step report depends on 'analysis', but it was not defined in a previous step",
    );
  });
});
