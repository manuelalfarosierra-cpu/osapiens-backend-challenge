import * as yaml from "js-yaml";

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "osapiens Backend Challenge API",
    version: "1.0.0",
    description:
      "API for creating workflows from YAML definitions and queuing analysis tasks.",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development server",
    },
  ],
  tags: [
    {
      name: "Analysis",
      description: "Create analysis workflows from predefined YAML files.",
    },
  ],
  paths: {
    "/analysis": {
      post: {
        tags: ["Analysis"],
        summary: "Create a workflow and queue its tasks",
        description:
          "Creates a workflow from a YAML definition and queues the corresponding tasks for background execution.",
        operationId: "createAnalysisWorkflow",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AnalysisRequest",
              },
              examples: {
                reportWorkflow: {
                  summary: "Report workflow request",
                  value: {
                    clientId: "client002",
                    workflow: "report_workflow",
                    geoJson: {
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
                  },
                },
              },
            },
          },
        },
        responses: {
          "202": {
            description: "Workflow created and tasks queued",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/WorkflowQueuedResponse",
                },
              },
            },
          },
          "404": {
            description: "Workflow file not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                example: {
                  message: "Workflow 'missing_workflow' not found",
                },
              },
            },
          },
          "400": {
            description: "Invalid workflow definition or request payload",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "500": {
            description: "Unexpected workflow creation error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                example: {
                  message: "Failed to create workflow",
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      AnalysisRequest: {
        type: "object",
        required: ["clientId", "geoJson"],
        properties: {
          clientId: {
            type: "string",
            description: "Client identifier used to associate the workflow.",
            example: "client002",
          },
          workflow: {
            type: "string",
            description:
              "Workflow file name without extension. Defaults to 'example_workflow'.",
            example: "report_workflow",
          },
          geoJson: {
            $ref: "#/components/schemas/PolygonGeoJson",
          },
        },
      },
      WorkflowQueuedResponse: {
        type: "object",
        required: ["workflowId", "workflow", "message"],
        properties: {
          workflowId: {
            type: "string",
            format: "uuid",
            example: "0ab26b35-682c-42ce-a842-d62cea585885",
          },
          workflow: {
            type: "string",
            example: "report_workflow",
          },
          message: {
            type: "string",
            example: "Workflow created and tasks queued from YAML definition.",
          },
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["message"],
        properties: {
          message: {
            type: "string",
          },
        },
      },
      PolygonGeoJson: {
        type: "object",
        required: ["type", "coordinates"],
        properties: {
          type: {
            type: "string",
            const: "Polygon",
          },
          coordinates: {
            type: "array",
            description:
              "GeoJSON polygon coordinates using [longitude, latitude] pairs.",
            items: {
              type: "array",
              items: {
                type: "array",
                minItems: 2,
                maxItems: 2,
                items: {
                  type: "number",
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

export const openApiSpecYaml = yaml.dump(openApiSpec, {
  noRefs: false,
  lineWidth: 120,
});
