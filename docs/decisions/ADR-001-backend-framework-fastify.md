# ADR-001: Selection of Fastify over Express/NestJS for Control Plane & Local Panel APIs

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** Garvix Principal Systems & Cloud Architecture Team
- **Applies To:** `apps/cloud-api` (Plane A), `apps/local-panel-api` (Plane B)

---

## 1. Context and Problem Statement

Garvix Hosting Manager runs two mission-critical HTTP API servers:
1. **`apps/local-panel-api` (Plane B):** Runs directly on customer hosting servers (baseline 4 vCPU, 16 GB RAM) where every megabyte of RAM and CPU cycle saved by the control plane translates directly into more capacity for customer websites and databases (`Plane D`).
2. **`apps/cloud-api` (Plane A):** Processes high-frequency mTLS license heartbeats, telemetry ingestion, and Razorpay billing webhooks across the entire fleet of enrolled Garvix servers.

Both services require strict request/response schema validation, first-class TypeScript type inference, deterministic error handling, correlation-ID propagation, and high-throughput structured JSON logging with secret redaction.

## 2. Considered Options

1. **Fastify (v4/v5) + Zod / JSON Schema + Pino**
2. **Express.js + Custom Middleware Stack**
3. **NestJS (on Express or Fastify adapter)**

## 3. Decision Outcome

Chosen option: **Option 1 — Fastify with strict schema validation and native Pino logging**.

### Rationale
1. **Low Memory Footprint & High Throughput on Customer Nodes:** On the reference 4 vCPU / 16 GB RAM server, the entire Plane B control stack (`local-panel-api` + worker + local DB/Redis) is budgeted within `1,024 MB` RAM. Fastify's low allocation overhead and `fast-json-stringify` serialization achieve 3x–4x higher throughput and significantly lower GC pressure than Express or heavy reflection-based DI containers.
2. **Defense-in-Depth Input Validation:** Fastify compiles request body, query, params, and header schemas ahead of time (`ajv` + `@garvix/validation` Zod schemas), rejecting malformed or oversized payloads before route handlers execute.
3. **Built-In Structured Pino Logging with Zero-Cost Redaction:** Fastify natively integrates `pino`, enabling path-based redaction of sensitive fields (`password`, `authorization`, `privateKey`, `razorpaySignature`) and automatic propagation of `X-Request-Id` (`correlationId`) into `garvix-agentd` IPC calls.
4. **In-Memory `fastify.inject()` Testing:** Enables fast, deterministic HTTP integration and RBAC security tests in CI without binding ephemeral TCP ports.

## 4. Consequences

- **Positive:** Sub-5ms framework overhead, unified request lifecycle hooks (`onRequest`, `preValidation`, `preHandler`, `onSend`), native TypeScript generics, and built-in `fastify.inject()` testability.
- **Negative / Mitigation:** Fastify plugins require explicit encapsulation awareness (`fastify-plugin`); mitigated by standardizing route registration and security preHandlers (`requireAuth`, `requireRole`, `requireStepUpMfa`, `requireIdempotencyKey`) in shared core plugins.
