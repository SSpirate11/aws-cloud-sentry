# AWS CloudSentry: Developer Feedback and Friction Log

**Event:** Build, Ship, Shape: Amazon Developer Hackathon 2026  
**Primary Track:** Alexa+ (Self-Hosted MCP Server and Simulated Voice Experience)  
**Mini-Challenges:** AWS Builder and Open Source  
**Repository:** [https://github.com/SSpirate11/aws-cloud-sentry](https://github.com/SSpirate11/aws-cloud-sentry)

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

### Friction Log Entry 1: User Blindness on Ambient Voice 2FA PIN Delivery
* **Specific Task Attempted:** Executing a destructive ECS service rollback via voice on the physical Amazon Echo.
* **Steps Taken:**
  1. Spoke: *"Alexa, ask Cloud Sentry to rollback checkout-api."*
  2. Alexa responded: *"Destructive action detected. Please state your 4-digit security PIN to confirm."*
* **Expected Result:** Engineer immediately receives the dynamic 2FA PIN via a natural out-of-band channel and speaks it back to complete the rollback.
* **Actual Result:** The dynamic PIN was generated in backend memory, leaving the user standing in front of the Echo speaker without knowing where the PIN was sent or what to say (*"What's the 4-digit PIN?"*).
* **Severity Rating:** **Critical** (completely blocked incident remediation workflow).
* **Workaround Used:** Implemented multi-channel PIN synchronization in `backend/server.py` and `backend/aws_tools.py`:
  1. Rendered a high-contrast terminal banner on stdout with ASCII borders.
  2. Pushed an Alexa companion mobile app Card (`Card.Simple`) displaying the PIN directly on the engineer's phone screen.
  3. Added an emergency fallback default PIN (`4921`) for demo resilience.
* **Actionable Suggestion:** The Alexa Skills Kit should support native interactive visual notifications (or push-to-phone prompts) that can automatically pop up companion confirmation banners on the user's registered mobile device during voice-initiated high-security actions.

### Friction Log Entry 2: Skill Worked in Alexa Mobile App but Failed on Physical Echo Hardware
* **Specific Task Attempted:** Running the custom skill on a real physical Amazon Echo Dot/Show in the room.
* **Steps Taken:**
  1. Enabled the skill in Developer Mode and verified successful execution inside the Alexa Developer Console Simulator and Alexa Mobile App.
  2. Spoke the invocation phrase *"Alexa, open Cloud Sentry"* to the physical Echo speaker in the room.
* **Expected Result:** The physical Echo wakes up with a cyan ring and speaks the CloudSentry triage greeting.
* **Actual Result:** The physical Echo stated: *"I couldn't find a skill called Cloud Sentry"* or remained silent, despite working seamlessly in the software simulator.
* **Severity Rating:** **High** (delayed physical hardware validation).
* **Workaround Used:**
  1. Discovered that physical devices enforce strict device-account localization matching; the hardware language profile had to be explicitly unified to `en-US`.
  2. Re-toggled the skill's testing toggle from `Off` -> `Development` to force an immediate device manifest sync across Amazon's device registry.
  3. Re-established the Cloudflare Tunnel endpoint to ensure the live TLS socket was active.
* **Actionable Suggestion:** The Alexa Developer Console should provide a "Device Status & Sync" tab showing whether connected physical hardware has downloaded the latest interaction model revision and active endpoint URL.

### Friction Log Entry 3: Alexa Interaction Model Validator Rejection on "s3"
* **Specific Task Attempted:** Adding natural sample utterances for incident compliance (e.g., *"archive postmortem to s3"*).
* **Steps Taken:**
  1. Added `"archive postmortem to s3"` to `IncidentTriageIntent` in `alexa-skill/interactionModels/custom/en-US.json`.
  2. Triggered model compilation in the Alexa Developer Console.
* **Expected Result:** Model builds cleanly and accepts "s3" as a common technology phrase.
* **Actual Result:** Build failed with a blocking schema error: `Validation Error: "s3" is not a valid utterance word. Sample utterances cannot contain numbers or unspaced acronyms.`
* **Severity Rating:** **Medium** (broke build pipeline).
* **Workaround Used:** Replaced `"s3"` with phonetic spacing `"s. three"` and replaced `"post-mortem"` with `"postmortem"` in the interaction model JSON.
* **Actionable Suggestion:** Incorporate an AWS technical lexicon into the ASK NLU tokenizer that automatically recognizes cloud terms (`s3`, `ec2`, `ecs`, `vpc`, `iam`) and maps them to valid phonetic tokens without manual punctuation workarounds.

### Friction Log Entry 4: Ephemeral Tunnel Subdomains Slowing Rapid Hardware Iteration
* **Specific Task Attempted:** Iteratively updating FastAPI endpoints and testing changes live with the physical Echo.
* **Steps Taken:**
  1. Ran `cloudflared` to expose local port 8000 over HTTPS for Alexa Cloud callbacks.
  2. Restarted backend services during feature updates.
* **Expected Result:** Alexa continues routing requests to the developer environment smoothly.
* **Actual Result:** Every tunnel restart generated a new random subdomain (e.g., `ferry-specialty-perspectives-bridges.trycloudflare.com`), requiring manual navigation to the Alexa Developer Console to paste the new URL, re-save, and wait for endpoint propagation.
* **Severity Rating:** **Medium** (high developer friction during debugging).
* **Workaround Used:** Kept a persistent background daemon for Cloudflare Tunnel and established fixed webhook routing at `/api/alexa-webhook`.
* **Actionable Suggestion:** Amazon should offer an official `ask-cli tunnel` command that automatically sets up a persistent, secure reverse proxy from the developer machine to the Alexa skill endpoint during development.

### Friction Log Entry 5: Model Context Protocol (MCP) Multi-Tool Execution vs. Alexa 8-Second Voice Timeout
* **Specific Task Attempted:** Chaining CloudWatch alarm extraction, container log querying, and Amazon Bedrock Claude 3.5 Sonnet analysis in a single voice turn.
* **Steps Taken:**
  1. User asked: *"Alexa, ask Cloud Sentry what happened in production."*
  2. Backend sequentially awaited `get_active_alarms`, `fetch_error_logs`, and Bedrock `invoke_model`.
* **Expected Result:** Alexa waits for the full AI diagnosis and speaks the post-mortem.
* **Actual Result:** When Bedrock inference took > 7.5 seconds under high network load, Alexa timed out with: *"There was a problem with the requested skill's response."*
* **Severity Rating:** **Critical** (caused conversational dropouts during outages).
* **Workaround Used:** Decomposed the voice workflow into two rapid conversational phases: Phase 1 returns immediate diagnostic telemetry in < 1.2s while priming Bedrock; Phase 2 retrieves the deep root-cause synthesis upon follow-up inquiry.
* **Actionable Suggestion:** Add a native "progressive response" or ambient thinking audio chime to the Alexa+ SDK that automatically keeps the voice session alive while waiting for long-running LLM tool calls.
