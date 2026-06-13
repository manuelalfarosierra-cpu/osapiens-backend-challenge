# Development Changelog

This document provides a detailed summary of the implementation work completed for each challenge exercise. It focuses on the reasoning behind the changes, the architectural improvements introduced along the way, and the validation and testing work used to support them.

## 1. Add a New Job to Calculate Polygon Area

- Reviewed the existing architecture to understand how `Workflow`, `Task`, `Result`, `JobFactory`, `TaskRunner`, and `TaskWorker` interact during execution.
- Analyzed the full `Workflow -> Task -> Result` lifecycle to understand how workflows create tasks, how those tasks are executed, and how outputs are persisted.
- Implemented `PolygonAreaJob` to calculate polygon area from the GeoJSON payload provided to a task.
- Registered the new job in `JobFactory` so it can be resolved dynamically from its `taskType`.
- Extended the workflow YAML configuration to include a new step for polygon area calculation.
- Verified that job outputs are stored correctly in the `Result` table following the existing persistence pattern.
- Validated job failure behavior to understand how execution errors affect task state transitions.
- Reviewed the full task lifecycle, including the transitions from `queued` to `in_progress`, then to `completed` or `failed`.
- Reviewed the workflow lifecycle to understand how overall workflow status depends on the states of its tasks.
- Performed end-to-end validation of the workflow flow: endpoint creation, task generation, worker execution, and result persistence.
- Identified design limitations in the initial implementation that were later addressed in Exercise 2, including missing YAML validation, lack of typed errors, incomplete error persistence, and the need for contextual job execution support.
- Left the architecture ready to support additional job types through the same `JobFactory` and `TaskRunner` execution model.

## 2. Add a Job to Generate a Report

- Added support for persisting the workflow `name` defined in YAML into the `Workflow` entity.
- Introduced structural YAML validation to ensure every step defines both `stepId` and `stepNumber`.
- Added uniqueness checks to prevent duplicate `stepId` and duplicate `stepNumber` values within the same workflow.
- Reused the `JobFactory` registry to validate that every YAML `taskType` maps to a real job implementation.
- Introduced typed errors such as `BadRequestError` to distinguish configuration problems from internal execution failures.
- Designed `JobContext` to inject extra dependencies and execution data into jobs when required.
- Added `requiresContext` support so each task can declare whether it needs contextual execution data.
- Implemented `ReportGenerationJob` to collect outputs from workflow tasks and produce a consolidated report.
- Added validation in `ReportGenerationJob` to ensure the report step is the final step in the workflow before it executes.
- Corrected workflow state management so a workflow can remain `in_progress` while pending tasks still exist, even if earlier tasks have failed. This allows the final report to execute and include failure information.
- Refactored `TaskWorker` to process complete workflows in `stepNumber` order, preventing out-of-order execution across different workflows.
- Prepared `Result` persistence to retain error details so the final report can include both successful outputs and failures.
- Laid the groundwork for `dependsOn` support in Exercise 3 by defining shared structures, validation rules, and controlled context access.

## 3. Support Interdependent Tasks in Workflows

- Added support for inter-task dependencies through a `dependsOn` field in the `Task` entity.
- Extended the YAML workflow format to allow explicit dependency declarations between workflow steps.
- Implemented validation to ensure `dependsOn` is a valid array whenever it is defined.
- Added validation to prevent duplicate dependencies inside the same task definition.
- Added validation to ensure every dependency references a previously defined `stepId` in the workflow.
- Enforced workflow rules so tasks can only depend on earlier steps, preventing circular dependencies and forward references.
- Updated the execution model so logical task order is driven by declared dependencies rather than by `stepNumber` alone.
- Initially designed a solution based on injecting repositories such as `TaskRepository`, `ResultRepository`, and `WorkflowRepository` through `JobContext`.
- Refined that design later to avoid leaking infrastructure concerns into jobs, using the context only to transport business-level data.
- Implemented automatic dependency resolution in `TaskRunner`, loading dependency outputs before executing the current job.
- Redefined `JobContext` so it contains only resolved dependency outputs.
- Updated `ReportGenerationJob` to consume only the outputs provided through `dependsOn`, without direct database access.
- Shifted the system toward a pipeline architecture in which each task consumes only the outputs generated by previous tasks.
- Enabled multiple partial or final reports within the same workflow through different dependency configurations.
- Preserved `stepNumber` validation so execution remains predictable while still benefiting from dependency-driven flexibility.

## 4. Ensure Final Workflow Results Are Properly Saved

- Added the `finalResult` field to the `Workflow` entity to persist the aggregated final workflow output.
- Refactored workflow update logic into a dedicated `updateWorkflowStatusAndResult` method to improve separation of concerns.
- Centralized workflow state transitions (`initial`, `in_progress`, `completed`, `failed`) in a single part of the system.
- Implemented workflow completion detection by verifying that every task has reached a terminal state (`completed` or `failed`).
- Implemented result aggregation across all workflow tasks after execution finishes.
- Added support for collecting both successful outputs and error information in the aggregated final result.
- Built `finalResult` using tasks ordered by `stepNumber` to preserve the logical workflow narrative.
- Reused the existing `Result` persistence layer to retrieve task outputs and construct the final aggregated response.
- Integrated workflow updates into a `finally` block so workflow state and final results are updated regardless of whether a task succeeds or fails.
- Improved `TaskRunner` maintainability by reducing responsibility overload and encapsulating workflow aggregation logic.
- Added tests to validate correct generation and persistence of `finalResult`.
- Added or updated OpenAPI documentation so the endpoints reflect the new fields and behavior introduced in this exercise.

## 5. Create an Endpoint for Retrieving Workflow Results

- Added the `GET /workflow/:id/results` endpoint to retrieve the final output of a workflow.
- Created `getWorkflowResults()` in `WorkflowService` to centralize the business logic for the endpoint.
- Implemented validation that returns `404 Not Found` when the workflow does not exist.
- Implemented validation that returns `400 Bad Request` when the workflow has not completed yet.
- Reused the typed error system (`NotFoundError`, `BadRequestError`) to keep API behavior consistent with the rest of the project.
- Added centralized route-level error handling through `handleRouteError`.
- Exposed the `finalResult` property from the `Workflow` entity in the endpoint response.
- Updated the `workflowRoutes` dependency interface to include `getWorkflowResults`.
- Registered the new route in the workflow router.
- Added OpenAPI and Swagger documentation for the results endpoint.
- Added response examples for completed workflows.
- Verified compliance with the functional requirements for this exercise: `404` when the workflow does not exist, `400` when it is not finished, and `finalResult` when it is completed.
- Updated the README with usage guidance and documentation for the new behavior.
- Added and updated tests to cover the new endpoints and workflow execution flows.
