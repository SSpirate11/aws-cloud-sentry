# AWS CloudSentry: 3 AM Voice Incident Commander for SREs

**Hackathon:** Build, Ship, Shape: Amazon Developer Hackathon 2026  
**Primary Track:** Alexa+ (Self-Hosted Model Context Protocol Server and Ambient Voice Simulator)  
**Mini-Challenges:** AWS Builder (Bedrock, CloudWatch, ECS, S3) and Open Source (MIT License)  
**Developer Feedback:** Full SDK review and friction log in [`FRICTION_LOG.md`](./FRICTION_LOG.md)

---

## Problem Statement

When a Sev-1 or Sev-2 alert fires at 3:15 AM, on-call engineers lose 15 to 20 minutes before any remediation starts:
1. Waking up, finding a laptop, and logging into corporate VPN with hardware MFA.
2. Navigating the AWS Console across CloudWatch alarms, ECS task definitions, and raw container log streams.
3. Identifying which deployment introduced the regression and manually rolling back the task definition.

During a high-traffic checkout outage, 18 minutes of downtime translates to over $150,000 in failed transactions.

---

## Solution Overview

**AWS CloudSentry** turns an Amazon Echo Show on the nightstand into a voice-driven incident console for on-call Site Reliability Engineers.

Built on a self-hosted **Model Context Protocol (MCP)** server over **Streamable HTTP** (spec `2025-11-25+`) and **AWS Bedrock**, CloudSentry lets an engineer triage an outage, verify the blast radius, execute a Voice 2FA rollback, generate a code patch, and archive a post-mortem to S3 in under 45 seconds.

```text
                       CLOUDSENTRY INCIDENT WORKFLOW

  [ 03:14 AM CloudWatch ALARM ]
               |
               v
  [ Proactive Echo Show Wake-Up Page ] -> "Alexa, what is failing in production?"
               |
               v
  [ MCP Runtime (mcp.call_tool) ]
    |-- 1. get_active_alarms        (CloudWatch Alarms + Dimensions)
    |-- 2. fetch_error_logs         (CloudWatch Logs /ecs/checkout-api)
    |-- 3. diagnose_incident        (AWS Bedrock Claude 3.5 Sonnet RCA)
    |-- 4. trace_deployment_culprit (Git Blame + PR Review Audit)
    |-- 5. simulate_blast_radius    (12.4k RPS Canary + JIT IAM Policy)
               |
               v
  "Alexa, rollback checkout-api" -> [ Voice 2FA + VoiceID + PIN 4921 Gate ]
               |
               v
  "Confirm rollback"             -> [ ECS Task Rolled Back + Slack Notified ]
               |
               v
  "Propose code fix / Postmortem"-> [ Bedrock Git Diff PR + S3 Archival ]
```

---

## Core Engineering Features

### 1. Native MCP Runtime Execution (9 Registered Tools)
The backend ([`backend/server.py`](./backend/server.py)) mounts an official `MCPServer` instance at `/mcp` using Streamable HTTP (`2025-11-25+`) and dispatches every voice turn through `await mcp.call_tool(...)`. Registered tools can be inspected live at `GET /api/mcp-tools`:

1. `get_active_alarms`: Queries CloudWatch `describe_alarms` and maps dimensions to affected ECS services (`checkout-api` and `payment-gateway`).
2. `fetch_error_logs`: Pulls trailing container stack traces (`OOMKilled`, `SQLTransientConnectionException`) from CloudWatch Logs.
3. `diagnose_incident`: Sends log traces to AWS Bedrock (`claude-3-5-sonnet`) to pinpoint the root cause and failing deployment revision.
4. `execute_rollback`: Updates the ECS service task definition after verifying the Voice 2FA safety interlock.
5. `post_slack_notification`: Broadcasts remediation audit trails to `#sre-incidents`.
6. `propose_code_fix`: Synthesizes a unified Git diff patch fixing the underlying memory leak or DB connection leak.
7. `generate_incident_postmortem`: Compiles a blameless SRE post-mortem (MTTA, MTTR, timeline, action items) and uploads it to Amazon S3 (`s3://sre-postmortems-us-east-1/2026/INC-84920.md`).
8. `trace_deployment_culprit`: Correlates the failing revision with commit history, PR review duration (e.g., an 11-second `"LGTM"` approval on Friday at 4:58 PM), and enforces a Friday deployment freeze.
9. `simulate_blast_radius`: Runs a 12,400 RPS digital twin canary simulation against the target rollback revision and issues a 300-second Just-In-Time (JIT) AWS STS IAM session policy.

### 2. Multi-Layer Security for Voice Infrastructure Mutations
To prevent accidental or unauthorized production changes by voice, CloudSentry enforces three guardrails before `execute_rollback` can mutate ECS:
* **Active Alarm Guardrail:** Rollbacks are only permitted when the target service has an active `ALARM` state in CloudWatch.
* **JIT Scoped IAM Session Policy:** Generates a 300-second STS session policy (`CloudSentry-JIT-RollbackRole`) restricted to `ecs:UpdateService` on the affected service ARN.
* **Voice 2FA + Biometric PIN Interlock:** Read-only tools run immediately, but mutating tools halt at `AWAITING_VOICE_CONFIRMATION`. The Echo Show displays the verified Alexa+ VoiceID profile (`99.4% match`) and requires the spoken confirmation phrase (`"Confirm rollback"`) or 4-digit challenge PIN (`4921`).

### 3. Proactive 3 AM Wake-Up Page and Real-Time Revenue Bleed Tracker
* **Proactive Wake-Up (`POST /api/proactive-alert`):** Instead of waiting passively while the on-call engineer sleeps through an outage, the **3 AM Page** trigger sounds a two-tone PagerDuty alert, queries CloudWatch via MCP, and has Alexa speak first to brief the engineer.
* **Live FinOps Burn-Rate Counter:** Tracks real-time checkout revenue loss (`-$142.50/sec`) in the top bar while the alarm is active, and locks in the total revenue saved (`$147,915 protected vs. 18-minute manual login`) the moment the rollback succeeds.

### 4. Triple-Tier Execution (Live AWS, LocalStack Docker, or Zero-Cred Mode)
1. **LocalStack AWS Emulation ($0 Cost):** Run `docker compose up -d` and `backend/seed_localstack.py` to execute real `boto3` calls against local CloudWatch, CloudWatch Logs, ECS, and S3 on port `4566`.
2. **Live AWS Account:** Automatically uses production `boto3` clients (`cloudwatch`, `logs`, `ecs`, `s3`, `bedrock-runtime`) when `AWS_ACCESS_KEY_ID` is set.
3. **Deterministic Fallback Mode:** Runs out of the box with `./run.sh` when no AWS credentials or Docker daemon are present, allowing immediate testing of both `INC-84920` (`checkout-api` OOM) and `INC-84921` (`payment-gateway` DB pool exhaustion).

---

## System Architecture

```mermaid
flowchart TD
    User["On-Call SRE (Voice / Echo Show)"] --> Simulator["Echo Show Cockpit (React + Web Speech API)"]
    Simulator -->|"HTTP / JSON-RPC 2.0"| MCP["CloudSentry MCP Server (FastAPI + MCPServer /mcp)"]

    subgraph AWS_Infrastructure ["AWS Cloud / LocalStack"]
        MCP -->|"DescribeAlarms"| CW["Amazon CloudWatch"]
        MCP -->|"FilterLogEvents"| CWL["CloudWatch Logs"]
        MCP -->|"Converse / toolConfig"| Bedrock["AWS Bedrock (Claude 3.5 Sonnet)"]
        MCP -->|"UpdateService (2FA Gate)"| ECS["Amazon ECS"]
        MCP -->|"PutObject"| S3["Amazon S3 (Post-Mortem Archive)"]
    end

    subgraph Ops_Audit ["Team Audit & CI/CD"]
        MCP -->|"Webhook"| Slack["Slack #sre-incidents"]
        MCP -->|"Commit Forensics"| Git["Git Blame & PR Drafts"]
    end
```

---

## Quickstart

### Prerequisites
* Python 3.10+
* Node.js 18+ and npm

### 1. Clone the Repository
```bash
git clone https://github.com/SSpirate11/aws-cloud-sentry.git
cd aws-cloud-sentry
```

### 2. Start with One Command
```bash
chmod +x run.sh
./run.sh
```
Open `http://localhost:5173` in Chrome or Edge.
* Backend MCP Endpoint: `http://localhost:8000/mcp`
* Runtime MCP Tool Registry: `http://localhost:8000/api/mcp-tools`
* Voice Turn API: `http://localhost:8000/api/voice-turn`

### 3. Optional: Run Against LocalStack (Real boto3 Calls)
```bash
docker compose up -d
./backend/venv/bin/python backend/seed_localstack.py
AWS_ENDPOINT_URL=http://localhost:4566 ./run.sh
```

---

## Walkthrough & Demo Flow

1. **Proactive 3 AM Wake-Up (Optional):** Click **3 AM Page** in the top bar to simulate an incoming Sev-1 page waking up the Echo Show.
2. **Triage the Outage:** Say or click `"Alexa, what is failing in production?"`
   * Executes `get_active_alarms`, `fetch_error_logs`, and `diagnose_incident` via MCP.
   * Displays the 99.4% memory spike on `checkout-api` (or ask `"Alexa, check payment-gateway"` to inspect the DB connection pool outage).
3. **Forensic Git Blame:** Say or click `"Alexa, who broke production?"`
   * Executes `trace_deployment_culprit` to inspect commit `e8f41c9`, the 11-second PR approval, and the Friday deploy freeze guardrail.
4. **Digital Twin Blast-Radius Check:** Say or click `"Alexa, simulate blast radius"`
   * Executes `simulate_blast_radius` at 12,400 RPS and arms the 300-second JIT IAM session policy.
5. **Voice 2FA Rollback:** Say or click `"Alexa, rollback checkout-api"` followed by `"Alexa, confirm rollback"` (or PIN `4921`).
   * Verifies VoiceID and PIN `4921`, rolls back ECS to `checkout-api:41`, stops the revenue bleed counter, and posts the audit log to Slack.
6. **Code Hotfix & S3 Post-Mortem:** Ask `"Alexa, propose code fix"` and `"Alexa, generate post-mortem"` to view the unified Git diff and S3-archived incident report.

---

## Automated Verification Suite

Run all 13 end-to-end tests:
```bash
PYTHONPATH=backend ./backend/venv/bin/python backend/test_api.py
```

```text
Test 1  (Health Check) passed
Test 2  (MCP Runtime Introspection) passed: 9 MCP tools registered
Test 8  (Bare 'Alexa' Wake Word) passed: Activated listening state
Test 3  (Incident Triage via MCP Runtime) passed: 3 MCP tools executed
Test 4  (Off-Script Dynamic SRE Q&A) passed: Context-aware technical response
Test 5  (Multi-Service Triage: payment-gateway) passed
Test 11 (MCP Tool: trace_deployment_culprit) passed: Forensic Git blame & coffee bounty
Test 12 (MCP Tool: simulate_blast_radius) passed: Digital twin 12.4k RPS canary & JIT IAM
Test 6  (Voice 2FA + Biometric + PIN Safety Gate) passed: Destructive mutation halted
Test 7  (Voice 2FA Execution) passed: Service restored & Slack notified
Test 9  (MCP Tool: propose_code_fix) passed: Unified Git diff generated
Test 10 (MCP Tool: generate_incident_postmortem) passed: Report published
Test 13 (Proactive 3 AM PagerDuty Wake-Up Push) passed: Ambient SRE alert verified
ALL 13 END-TO-END TESTS PASSED (100% OK)!
```

---

## License

Licensed under the [MIT License](./LICENSE).
