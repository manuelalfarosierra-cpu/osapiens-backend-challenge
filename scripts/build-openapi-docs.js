const fs = require("fs");
const path = require("path");

const { openApiSpec, openApiSpecYaml } = require("../src/openapi/spec");

const docsDir = path.join(__dirname, "..", "docs");
const publicSpec = {
  ...openApiSpec,
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development server",
    },
  ],
};

const swaggerHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta
      name="description"
      content="Swagger UI for the osapiens Backend Challenge API"
    />
    <title>Swagger UI</title>
    <link
      rel="stylesheet"
      href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
    />
    <style>
      :root {
        color-scheme: light;
      }

      body {
        margin: 0;
        background: #f5efe4;
        font-family: "Segoe UI", sans-serif;
      }

      #swagger-ui {
        padding: 1rem;
      }

      .swagger-ui .topbar {
        display: none;
      }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: "./openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        persistAuthorization: true
      });
    </script>
  </body>
</html>
`;

const redocHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta
      name="description"
      content="ReDoc for the osapiens Backend Challenge API"
    />
    <title>API Reference</title>
    <style>
      body {
        margin: 0;
      }
    </style>
  </head>
  <body>
    <redoc spec-url="./openapi.json"></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  </body>
</html>
`;

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(
  path.join(docsDir, "openapi.json"),
  `${JSON.stringify(publicSpec, null, 2)}\n`,
);
fs.writeFileSync(path.join(docsDir, "openapi.yaml"), openApiSpecYaml);
fs.writeFileSync(path.join(docsDir, "index.html"), swaggerHtml);
fs.writeFileSync(path.join(docsDir, "redoc.html"), redocHtml);
