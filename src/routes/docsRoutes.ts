import express from "express";

import { openApiSpec, openApiSpecYaml } from "../openapi/spec";

const router = express.Router();

const buildHtmlPage = (title: string, body: string) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f6f1e8;
        --panel: #fffaf2;
        --ink: #1d1b19;
        --accent: #bd4f2f;
        --accent-soft: #f1d9c8;
        --muted: #6a6257;
        --border: #e5d6c5;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, #f3ddc7 0, transparent 26rem),
          linear-gradient(180deg, #f7f2ea 0%, #efe4d5 100%);
      }

      .shell {
        min-height: 100vh;
      }

      .topbar {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: center;
        justify-content: space-between;
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid var(--border);
        background: rgba(255, 250, 242, 0.86);
        backdrop-filter: blur(12px);
        position: sticky;
        top: 0;
        z-index: 10;
      }

      .brand h1 {
        margin: 0;
        font-size: 1.3rem;
      }

      .brand p {
        margin: 0.2rem 0 0;
        color: var(--muted);
        font-size: 0.95rem;
      }

      .links {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .links a {
        color: var(--ink);
        text-decoration: none;
        border: 1px solid var(--border);
        background: var(--panel);
        padding: 0.7rem 0.9rem;
        border-radius: 999px;
        font-size: 0.95rem;
      }

      .content {
        padding: 0;
      }

      .frame {
        max-width: 1400px;
        margin: 0 auto;
        background: rgba(255, 250, 242, 0.78);
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <h1>osapiens Backend Challenge API</h1>
          <p>OpenAPI reference for the workflow analysis service</p>
        </div>
        <nav class="links">
          <a href="/docs">Redoc</a>
          <a href="/docs/swagger">Swagger UI</a>
          <a href="/openapi.json">openapi.json</a>
          <a href="/openapi.yaml">openapi.yaml</a>
        </nav>
      </header>
      <main class="content">
        <div class="frame">
          ${body}
        </div>
      </main>
    </div>
  </body>
</html>`;

router.get("/openapi.json", (_req, res) => {
  res.json(openApiSpec);
});

router.get("/openapi.yaml", (_req, res) => {
  res.type("application/yaml").send(openApiSpecYaml);
});

router.get("/docs", (_req, res) => {
  res.type("html").send(
    buildHtmlPage(
      "API Reference",
      `
        <redoc spec-url="/openapi.json"></redoc>
        <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
      `,
    ),
  );
});

router.get("/docs/swagger", (_req, res) => {
  res.type("html").send(
    buildHtmlPage(
      "Swagger UI",
      `
        <div id="swagger-ui"></div>
        <link
          rel="stylesheet"
          href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
        />
        <style>
          #swagger-ui {
            padding: 1rem;
          }

          .swagger-ui .topbar {
            display: none;
          }
        </style>
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script>
          window.ui = SwaggerUIBundle({
            url: "/openapi.json",
            dom_id: "#swagger-ui",
            deepLinking: true,
            persistAuthorization: true
          });
        </script>
      `,
    ),
  );
});

export default router;
