import type { NextFunction, Request, Response } from "express";
import { describe, expect, it } from "vitest";

import docsRoutes from "../docsRoutes";

type MockResponse = Pick<Response, "json" | "send" | "type"> & {
  body?: unknown;
  contentType?: string;
};

const invokeGetRoute = async (url: string) => {
  const req = {
    method: "GET",
    url,
  } as Request;
  const res: MockResponse = {
    json(payload) {
      res.body = payload;
      return res;
    },
    send(payload) {
      res.body = payload;
      return res;
    },
    type(value) {
      res.contentType = value;
      return res;
    },
  };

  await new Promise<void>((resolve, reject) => {
    docsRoutes.handle(req, res as Response, ((error?: unknown) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    }) as NextFunction);

    setImmediate(resolve);
  });

  return res;
};

describe("docsRoutes", () => {
  it("serves the OpenAPI spec as JSON", async () => {
    const response = await invokeGetRoute("/openapi.json");

    expect(response.body).toMatchObject({
      openapi: "3.1.0",
      info: {
        title: "osapiens Backend Challenge API",
      },
      paths: {
        "/analysis": {
          post: {
            operationId: "createAnalysisWorkflow",
          },
        },
      },
    });
  });

  it("serves the OpenAPI spec as YAML", async () => {
    const response = await invokeGetRoute("/openapi.yaml");

    expect(response.contentType).toBe("application/yaml");
    expect(response.body).toContain("openapi: 3.1.0");
    expect(response.body).toContain("/analysis:");
  });

  it("renders the Redoc reference page", async () => {
    const response = await invokeGetRoute("/docs");

    expect(response.contentType).toBe("html");
    expect(response.body).toContain("<redoc spec-url=\"/openapi.json\"></redoc>");
    expect(response.body).toContain("osapiens Backend Challenge API");
  });

  it("renders the Swagger UI page", async () => {
    const response = await invokeGetRoute("/docs/swagger");

    expect(response.contentType).toBe("html");
    expect(response.body).toContain("SwaggerUIBundle");
    expect(response.body).toContain("url: \"/openapi.json\"");
  });
});
