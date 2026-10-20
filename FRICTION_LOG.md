# AWS CloudSentry: Developer Feedback and Friction Log

**Event:** Build, Ship, Shape: Amazon Developer Hackathon 2026  
**Primary Track:** Alexa+ (Self-Hosted MCP Server and Simulated Voice Experience)  
**Mini-Challenges:** AWS Builder and Open Source

---

## 1. Product Feedback by Tool and SDK

### A. Model Context Protocol (MCP) Streamable HTTP (Spec 2025-11-25+)
* **How we used it:** Built the self-hosted MCP server (`/mcp` endpoint in `backend/server.py`) exposing 9 operational tools across CloudWatch, ECS, S3, and Bedrock, invoked at runtime via `await mcp.call_tool(...)` and introspected via `await mcp.list_tools()`.
* **What worked well:**
  * Clean separation between tool schema declarations (`@mcp.tool`) and execution handlers.
  * Direct schema compatibility with Amazon Bedrock's `converse(toolConfig=...)` format made translating MCP tool definitions into Bedrock tool specs straightforward.
* **What needs improvement:**
  * In the Python `mcp` SDK (`1.2+` / `2.x`), the shift between `FastMCP` and `from mcp.server.mcpserver import MCPServer` is poorly documented in migration guides and trips up developers wiring custom FastAPI sub-mounts.
  * Mounting `mcp.streamable_http_app()` inside an existing FastAPI application requires careful lifecycle coordination when also exposing REST endpoints for a local web simulator.

### B. AWS Bedrock (`anthropic.claude-3-5-sonnet` and `converse` API)
* **How we used it:** Automated root-cause analysis over raw CloudWatch container logs, unified Git diff generation for hotfixes, and off-script SRE Q&A.
* **What worked well:**
  * High diagnostic precision on raw container logs (distinguishing between Linux cgroup `OOMKilled` exit code 137 and HikariCP PostgreSQL connection pool starvation).
  * The `converse` API `toolConfig` structure maps cleanly to JSON Schema inputs exported by `MCPServer`.
* **What needs improvement:**
  * When chaining `describe_alarms` -> `filter_log_events` -> Bedrock inference inside a single voice turn, cold-start latency can push total response time past 2.5 seconds, which feels slow on a voice device without an intermediate acoustic progress cue.

### C. Amazon CloudWatch, ECS, and S3 (`boto3` + LocalStack)
* **How we used it:** Polled alarm states (`describe_alarms`), fetched container error logs (`filter_log_events`), updated ECS task definitions (`update_service`), and archived markdown post-mortems (`put_object`).
* **What worked well:**
  * Being able to point standard `boto3` clients at LocalStack (`http://localhost:4566`) allowed us to seed realistic CloudWatch alarms, log streams, and S3 buckets locally without incurring AWS charges during rapid testing.

---

## 2. Detailed Friction Log Entries

### Friction Entry 1: Voice Turn Timeout vs. Multi-Call AWS Cold Starts
* **Task Attempted:** Chaining CloudWatch alarm inspection, log extraction, and Bedrock root-cause synthesis in one synchronous voice turn.
* **Observed Issue:** Serial execution of three `boto3` calls plus LLM inference takes 2.2 to 3.4 seconds on cold connections, creating noticeable silence before TTS playback starts.
* **Workaround Applied:** Added immediate visual state transitions (`THINKING` -> progressive tool trace streaming in the UI) and kept spoken responses under two sentences while pushing full stack traces and diffs to the Echo Show screen.
* **Recommendation for Alexa+ Team:** Provide a native MCP progress notification hook that triggers an ambient Echo Show "thinking chime" or brief filler acknowledgement whenever an MCP tool call exceeds 800ms.

### Friction Entry 2: No Native Confirmation Schema Directive for Destructive MCP Tools
* **Task Attempted:** Preventing single-turn voice commands (or background noise) from immediately executing destructive infrastructure changes like `execute_rollback`.
* **Observed Issue:** The current MCP tool specification treats read-only queries (`get_active_alarms`) and destructive mutations (`execute_rollback`) identically at the schema layer.
* **Workaround Applied:** Implemented a custom two-phase state machine in `execute_rollback` (`confirmed=False` returns `AWAITING_VOICE_CONFIRMATION` with a 4-digit PIN `4921`, VoiceID match metadata, and a 300-second JIT STS session policy).
* **Recommendation for Alexa+ Team:** Add a first-class `x-alexa-confirmation-required: true` and `x-alexa-voiceid-required: true` extension to the Alexa+ MCP tool schema so Echo hardware enforces biometric confirmation natively before invoking mutating endpoints.

### Friction Entry 3: Reverse Proxy Buffering on Streamable HTTP (`/mcp`)
* **Task Attempted:** Running the FastAPI + `MCPServer.streamable_http_app()` server behind local Vite dev proxies and container ingress.
* **Observed Issue:** Default proxy buffering can delay chunked JSON-RPC responses unless explicit headers and clean sub-path mounting are configured.
* **Workaround Applied:** Mounted `/mcp` directly on the ASGI application and exposed `/api/mcp-tools` for synchronous schema inspection by the simulator HUD.
* **Recommendation for Alexa+ Team:** Publish an official FastAPI + AWS App Runner / ECS Fargate reference template pre-configured for MCP Streamable HTTP (`2025-11-25+`).

### Friction Entry 4: Lack of a Local Desktop Simulator for Echo Show APL + MCP
* **Task Attempted:** Testing multimodal voice + screen cards alongside live MCP tool execution traces on a local developer machine.
* **Observed Issue:** Existing Alexa developer console simulators do not provide a unified view showing both the Echo Show display card and the underlying MCP JSON-RPC tool sequence.
* **Workaround Applied:** Built our own split-screen React simulator combining a 3D Echo hardware model, an Echo Show 10 display card, and a live MCP telemetry inspector.
* **Recommendation for Alexa+ Team:** Ship a local `alexa-mcp-inspector` desktop view that renders multimodal screen cards side-by-side with MCP tool execution logs.
