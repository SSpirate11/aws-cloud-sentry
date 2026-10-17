# AWS CloudSentry — Developer Feedback & Friction Log
*Submitted for the Build, Ship, Shape: Amazon Developer Hackathon 2026*  
*Track: Alexa+ (Self-Hosted MCP & Simulated Voice Agent)*  
*Mini-Challenges: AWS Builder & Open Source*

---

## 1. Product Feedback by Tool & SDK

### A. Model Context Protocol (MCP) Streamable HTTP Specification (Spec 2025-11-25+)
* **What we used it for:** Implementing the self-hosted MCP server (`/mcp` endpoint) that exposes CloudWatch alarms, error logs, Bedrock diagnostic models, and ECS rollback actions to Alexa+ and agentic orchestrators.
* **What worked well:**
  * Clean separation of concerns between tool declarations and execution handlers.
  * Native streaming support over Server-Sent Events (SSE) enables low-latency streaming of multi-step diagnostic traces.
  * Tool JSON Schema definitions allow language models to reliably structure parameters without hallucinating AWS API arguments.
* **What needs work:**
  * The transition from MCP 1.x (`FastMCP`) to MCP 2.x (`MCPServer`) in the Python SDK introduced breaking namespace shifts (`from mcp.server.mcpserver import MCPServer`) that lacked clear error hints for newcomers.
  * Bi-directional session handshake documentation over pure Streamable HTTP (as opposed to stdio) needs more production reference implementations.
* **Onboarding experience:** 8/10. Once the server spec is understood, building micro-tools for cloud ops is remarkably fast.
* **Would we build with it again?** Yes, absolutely. MCP is the superior open standard for voice-to-tool orchestration.

### B. AWS Bedrock (`anthropic.claude-3-5-sonnet` / Bedrock Runtime)
* **What we used it for:** Autonomous root-cause analysis on high-volume CloudWatch error logs, identifying container OOMKill patterns, correlated git commits, and suggesting precise task revision rollbacks.
* **What worked well:**
  * Zero-shot diagnostic accuracy on messy, raw stack traces. It correctly distinguished between upstream network timeouts and fatal Linux cgroup OOMKills (ExitCode 137).
  * Fast inference latency via Bedrock Converse / InvokeModel API (< 1.2s), essential for conversational voice interfaces where users expect rapid responses.
* **What needs work:**
  * Cold start latency on large prompt contexts can occasionally push voice response delays past the 2-second conversational threshold.
  * Streaming chunk handling in conjunction with MCP tool callbacks requires custom event loop management.
* **Onboarding experience:** 9/10. `boto3` integration with Bedrock is robust and well-documented.
* **Would we build with it again?** Yes. Bedrock is essential for enterprise SRE automation.

### C. Amazon CloudWatch & Amazon ECS SDKs (`boto3`)
* **What we used it for:** Polling active alarm states (`describe_alarms`), querying log groups (`filter_log_events`), and triggering container deployment updates (`update_service`).
* **What worked well:**
  * Battle-tested API reliability and granular IAM permission controls.
* **What needs work:**
  * Log filtering syntax in CloudWatch Logs Insights is somewhat rigid when seeking multi-line Java/Node stack traces in a single query.

---

## 2. Friction Log Entries (Judging Bonus)

### Friction Log #1: Voice Turn Latency vs. Deep Diagnostic Reasoning
* **Task Attempted:** Chaining CloudWatch log retrieval $\to$ Bedrock root-cause analysis $\to$ text-to-speech synthesis within a single synchronous voice turn.
* **Steps Taken:**
  1. User asks: *"Alexa, what just triggered the alarm in production?"*
  2. Orchestrator calls `get_active_alarms()`, then `fetch_error_logs()`, then calls Bedrock with a 500-token prompt.
  3. Synthesizes full response.
* **Expected vs. Actual:**
  * *Expected:* Voice response begins within 1.0 second.
  * *Actual:* Total round-trip latency exceeded 2.8 seconds due to serial Bedrock inference, causing voice dead-air.
* **Severity:** **High (Degrades Voice UX)**.
* **Workaround Applied:** Split the response architecture: Alexa immediately acknowledges the alert state in 400ms (*"Investigating alarm TargetResponseTime on checkout-api..."*) while streaming the Bedrock diagnostic trace to the visual Echo Show display in parallel.
* **Actionable Suggestion for Amazon/Alexa Teams:** Provide an official Alexa+ Ambient State Hook (e.g., `alexa.agent.streamInterimProgress()`) that enables audio filler sounds (like subtle thinking chimes) while background MCP tools execute heavy compute.

---

### Friction Log #2: Safety Protocol for Destructive Voice Actions
* **Task Attempted:** Executing an ECS container rollback via natural language voice command.
* **Steps Taken:**
  1. User speaks: *"Alexa, rollback checkout-api to revision 41."*
  2. Model detects intent and attempts direct execution of `execute_rollback`.
* **Expected vs. Actual:**
  * *Expected:* Voice agents must not unilaterally mutate or delete production infrastructure based on single-shot intent without confirmation.
  * *Actual:* Standard agent frameworks execute tool calls immediately upon LLM function emission.
* **Severity:** **Critical (Production Outage Risk)**.
* **Workaround Applied:** Engineered an explicit **Voice 2FA Protocol**:
  * Tools define a `safety_level: "DESTRUCTIVE_MUTATION"`.
  * The MCP server intercepts unconfirmed calls, returning status `AWAITING_VOICE_CONFIRMATION` with an orange warning state on the Echo screen.
  * The action is only executed if the user explicitly confirms (*"Confirm rollback"*).
* **Actionable Suggestion for Amazon/Alexa Teams:** Incorporate a native `requiresUserConfirmation: true` metadata flag in the Alexa+ MCP Tool Schema specification, handled natively at the device level with Echo biometric voiceprint matching.

---

### Friction Log #3: MCP Spec Over Streamable HTTP vs. Stdio in Serverless
* **Task Attempted:** Deploying an MCP server designed for Streamable HTTP in containerized or serverless cloud environments (AWS App Runner / Lambda).
* **Steps Taken:** Configured Starlette ASGI app with `MCPServer.streamable_http_app()`.
* **Expected vs. Actual:**
  * *Expected:* Automatic SSE connection management and keep-alives.
  * *Actual:* Certain reverse proxies and load balancers buffer HTTP responses, breaking Server-Sent Events unless `X-Accel-Buffering: no` and explicit chunked transfer encoding headers are configured.
* **Severity:** **Medium**.
* **Workaround Applied:** Configured explicit ASGI headers on the FastAPI proxy layer to prevent chunk buffering.
* **Actionable Suggestion for Amazon/Alexa Teams:** Add a reference CDK/SAM template for deploying Streamable HTTP MCP servers to AWS App Runner or ECS Fargate with verified ALB streaming rules.

---

## 3. Official Feature Requests

1. **Biometric Voice 2FA Verification for Critical MCP Tools**
   * *What:* Allow MCP tool definitions to require biometric speaker verification before execution (e.g., confirming the speaker is the authenticated on-call engineer's voice profile).
   * *Why it matters:* Prevents guests or unauthorized voices from triggering infrastructure or financial mutations.
   * *Urgency:* **Critical**.

2. **Native Echo Ambient Progress Rings for Multi-Step MCP Chaining**
   * *What:* An API to control the Echo light ring color/animation state directly from MCP response headers (e.g., pulsing amber during confirmation, pulsing purple during LLM tool invocation).
   * *Why it matters:* Enhances multi-modal feedback on Echo Show and Echo smart speakers.
   * *Urgency:* **Important**.

3. **Pre-Built AWS MCP Connector Pack for Alexa+**
   * *What:* First-party Amazon-maintained MCP servers for CloudWatch, AWS Systems Manager, and Health Dashboard.
   * *Why it matters:* Accelerates enterprise devops adoption of ambient voice assistants.
   * *Urgency:* **Nice-to-have**.
