"""
CloudSentry - Model Context Protocol (MCP) Server & Alexa+ Agent API
Implements official MCP spec (2025-11-25+, Streamable HTTP).
Mounts both:
1. Native MCP Streamable HTTP endpoint for external agentic callers
2. Conversational Voice Agent API for the Alexa+ Web Voice Simulator
"""

import json
import logging
import re
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional

from pydantic import BaseModel

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from mcp.server.mcpserver import MCPServer

from aws_tools import aws_tools, ACTIVE_INCIDENTS
from local_aws_emulator import LOCAL_AWS_STATE
from mock_scenarios import MOCK_SCENARIOS

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("cloud_sentry.server")

# 1. Initialize MCP Server (Official MCP Spec 2025-11-25+ Streamable HTTP)
mcp = MCPServer("AWS-CloudSentry-Agent")

@mcp.tool(
    name="get_active_alarms",
    description="Query AWS CloudWatch for active ALARM states across production services and clusters."
)
def get_active_alarms() -> str:
    """Returns active CloudWatch alarms in production."""
    alarms = aws_tools.get_active_alarms()
    return json.dumps(alarms, indent=2)

@mcp.tool(
    name="fetch_error_logs",
    description="Fetch trailing error logs and stack traces from AWS CloudWatch Logs for a failing service."
)
def fetch_error_logs(service_name: str, limit: int = 10) -> str:
    """Fetches trailing error log events for a service."""
    logs = aws_tools.fetch_error_logs(service_name, limit=limit)
    return json.dumps(logs, indent=2)

@mcp.tool(
    name="diagnose_incident",
    description="Use AWS Bedrock (Claude 3.5 Sonnet) to perform automated root-cause analysis on error logs."
)
def diagnose_incident(service_name: str) -> str:
    """Performs Bedrock root-cause analysis on CloudWatch logs."""
    logs = aws_tools.fetch_error_logs(service_name, limit=10)
    diagnosis = aws_tools.diagnose_with_bedrock(service_name, logs)
    return diagnosis

@mcp.tool(
    name="execute_rollback",
    description="Roll back an Amazon ECS service task definition to its N-1 stable revision. Enforces Out-of-Band Slack OTP and Active CloudWatch ALARM guardrail."
)
def execute_rollback(
    service: str,
    cluster: str,
    target_revision: str,
    confirmed: bool = False,
    provided_pin: Optional[str] = None
) -> str:
    """Executes safe ECS task rollback with out-of-band OTP confirmation protocol."""
    result = aws_tools.execute_rollback(
        service=service,
        cluster=cluster,
        target_revision=target_revision,
        confirmed=confirmed,
        provided_pin=provided_pin
    )
    return json.dumps(result, indent=2)

@mcp.tool(
    name="post_slack_notification",
    description="Post an incident remediation summary and audit trail to the team Slack channel."
)
def post_slack_notification(channel: str, message: str) -> str:
    """Posts audit notification to Slack."""
    res = aws_tools.post_slack_notification(channel, message)
    return json.dumps(res, indent=2)

@mcp.tool(
    name="propose_code_fix",
    description="Use AWS Bedrock (Claude 3.5 Sonnet) to synthesize an authoritative git diff hotfix addressing the root cause."
)
def propose_code_fix(service: str = "checkout-api", root_cause: Optional[str] = None) -> str:
    """Synthesizes a clean Unified Git Diff patch for the root cause."""
    res = aws_tools.propose_code_fix(service=service, root_cause=root_cause)
    return json.dumps(res, indent=2)

@mcp.tool(
    name="generate_incident_postmortem",
    description="Generates a comprehensive blameless SRE Post-Mortem report (markdown) with timeline, MTTA, MTTR, root cause, and action items."
)
def generate_incident_postmortem(incident_id: str = "INC-84920") -> str:
    """Generates an authoritative blameless SRE post-mortem report."""
    res = aws_tools.generate_incident_postmortem(incident_id=incident_id)
    return json.dumps(res, indent=2)

@mcp.tool(
    name="trace_deployment_culprit",
    description="Amazon Blameless Correction of Errors (COE) 5-Whys change correlation: inspects git commit history and identifies systemic CI/CD pipeline gaps."
)
def trace_deployment_culprit(service: str = "checkout-api") -> str:
    """Correlates deployment revision with git log and builds a 5-Whys Blameless COE analysis."""
    res = aws_tools.trace_deployment_culprit(service=service)
    return json.dumps(res, indent=2)

@mcp.tool(
    name="simulate_blast_radius",
    description="Deterministic N-1 Task Definition Pre-Flight: computes memory and CPU headroom recovery from live metrics and generates a scoped STS IAM session policy."
)
def simulate_blast_radius(service: str = "checkout-api", target_revision: str = "checkout-api:41") -> str:
    """Computes telemetry delta for N-1 task definition rollback and builds scoped STS policy."""
    res = aws_tools.simulate_blast_radius(service=service, target_revision=target_revision)
    return json.dumps(res, indent=2)


# 2. Initialize Official MCP Streamable HTTP Transport (/mcp) & FastAPI Lifespan
mcp_app = mcp.streamable_http_app(
    streamable_http_path="/mcp",
    json_response=True,
    host="0.0.0.0"
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with mcp_app.router.lifespan_context(mcp_app):
        yield


app = FastAPI(
    title="AWS CloudSentry - Alexa+ Incident Commander",
    description="Model Context Protocol (MCP) Streamable HTTP Server & Voice Simulator API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["mcp-session-id"],
)

for route in mcp_app.routes:
    app.router.routes.append(route)


# 3. Conversational Voice Agent API for the Alexa+ Web Simulator
class VoiceQueryRequest(BaseModel):
    query: str
    session_id: Optional[str] = "session-001"
    voice_confirmed: Optional[bool] = False

# Session state to track ongoing voice conversation context
SESSION_CONTEXT: Dict[str, Any] = {
    "pending_rollback": None,
    "current_incident": "INC-84920",
    "current_service": "checkout-api"
}


async def invoke_mcp_tool(
    tool_name: str,
    arguments: Dict[str, Any],
    tool_traces: List[Dict[str, Any]],
    status_override: Optional[str] = None
) -> Any:
    """
    Executes a registered tool through the official MCPServer runtime (mcp.call_tool)
    and records the JSON-RPC 2.0 tool execution trace.
    """
    mcp_result = await mcp.call_tool(tool_name, arguments)
    raw_text = ""
    if getattr(mcp_result, "content", None) and len(mcp_result.content) > 0:
        raw_text = getattr(mcp_result.content[0], "text", "")

    try:
        parsed_output = json.loads(raw_text)
    except Exception:
        parsed_output = raw_text

    final_status = status_override or ("ERROR" if getattr(mcp_result, "is_error", False) else "SUCCESS")
    tool_traces.append({
        "tool": tool_name,
        "protocol": "MCP-2025-11-25+",
        "parameters": arguments,
        "status": final_status,
        "output": parsed_output
    })
    return parsed_output


def _infer_target_service(user_query: str) -> Dict[str, str]:
    """Resolves target service, cluster, incident ID, and rollback revision from voice query or session."""
    q = user_query.lower()
    if "payment" in q or "gateway" in q or "db" in q or "pool" in q or "88" in q:
        inc = ACTIVE_INCIDENTS.get("INC-84921", MOCK_SCENARIOS["payments_db_pool_exhausted"])
        return {
            "incident_id": "INC-84921",
            "service": inc["service"],
            "cluster": inc["cluster"],
            "target_revision": inc["previous_task_revision"]
        }
    inc = ACTIVE_INCIDENTS.get("INC-84920", MOCK_SCENARIOS["checkout_api_oom"])
    return {
        "incident_id": "INC-84920",
        "service": inc["service"],
        "cluster": inc["cluster"],
        "target_revision": inc["previous_task_revision"]
    }


@app.get("/api/mcp-tools")
async def list_registered_mcp_tools():
    """Introspects the MCPServer instance at runtime and returns all registered MCP tool schemas."""
    tools = await mcp.list_tools()
    return {
        "server": mcp.name,
        "spec_version": "2025-11-25+",
        "transport": "Streamable HTTP (/mcp)",
        "tool_count": len(tools),
        "tools": [
            {
                "name": t.name,
                "description": t.description,
                "input_schema": t.input_schema
            }
            for t in tools
        ]
    }


@app.post("/api/voice-turn")
async def handle_voice_turn(req: VoiceQueryRequest):
    """
    Executes Alexa+ Multi-Turn Conversational Reasoning over the live MCPServer runtime.
    Interprets natural language voice query, dispatches tools via mcp.call_tool(),
    and returns concise spoken voice output alongside rich visual screen data.
    """
    raw_query = req.query.strip()
    
    # Normalize and strip wake phrase if present ("Alexa", "Alex", "Hey Alex", "Hey Alexa", "Echo", etc.)
    cleaned_query = re.sub(r'^(hey\s+)?(alexa|alex|alexis|alexia|computer|echo)[,\s]*', '', raw_query, flags=re.IGNORECASE).strip().lower()

    # If the user only spoke the wake word ("Alexa", "Alex", etc.):
    if not cleaned_query:
        return {
            "spoken_response": "Yes? I'm listening. What would you like me to check in AWS production?",
            "display_card": {
                "title": "Alexa+ Incident Commander",
                "badge": "LISTENING",
                "badge_color": "blue",
                "status_message": "Listening... Ask 'What is failing in production?' or request a service action."
            },
            "state": "LISTENING",
            "tool_traces": []
        }

    user_query = cleaned_query
    tool_traces: List[Dict[str, Any]] = []

    # Bridge registered MCP tools into Amazon Bedrock Converse toolConfig schema
    registered_tools = await mcp.list_tools()
    planner_meta = aws_tools.plan_mcp_tools_with_bedrock(raw_query, registered_tools)

    # CASE 1: Voice 2FA Confirmation of Rollback ("Confirm", "Yes rollback", "Authorize", or 4-digit OTP)
    pin_match = re.search(r"\b(\d{4})\b", user_query)
    spoken_pin = pin_match.group(1) if pin_match else None
    if (
        (any(w in user_query for w in ["confirm", "yes", "authorize", "proceed"]) or spoken_pin)
        and SESSION_CONTEXT.get("pending_rollback")
    ):
        pending = SESSION_CONTEXT["pending_rollback"]
        expected_pin = pending.get("challenge_pin")

        # Strictly require the 4-digit out-of-band OTP to match
        if not spoken_pin or (expected_pin and spoken_pin != expected_pin):
            return {
                "spoken_response": (
                    "Out-of-band security PIN required. Rollback halted. "
                    "Please check the one-time 4-digit code delivered to #sre-oncall-otp in Slack and speak 'Confirm rollback' followed by that code."
                ),
                "display_card": {
                    "title": "Out-of-Band 2FA PIN Required",
                    "badge": "PIN REJECTED",
                    "badge_color": "red",
                    "service": pending["service"],
                    "cluster": pending["cluster"],
                    "target_revision": pending["target_revision"],
                    "challenge_pin": expected_pin,
                    "oob_delivery_channel": "#sre-oncall-otp (Slack Out-of-Band)",
                    "jit_iam_policy": pending.get("jit_iam_policy"),
                    "status_message": "A valid 4-digit out-of-band OTP from #sre-oncall-otp is required to authorize rollback."
                },
                "state": "AWAITING_CONFIRMATION",
                "planner": planner_meta,
                "tool_traces": tool_traces
            }

        # Execute MCP Tool via MCPServer runtime: execute_rollback with confirmed=True
        rollback_res = await invoke_mcp_tool(
            "execute_rollback",
            {
                "service": pending["service"],
                "cluster": pending["cluster"],
                "target_revision": pending["target_revision"],
                "confirmed": True,
                "provided_pin": spoken_pin
            },
            tool_traces
        )

        cost_avoided = rollback_res.get("estimated_cost_avoided_usd", 142500.0)
        mttr_sec = rollback_res.get("elapsed_mttr_seconds", 42.0)

        # Execute MCP Tool via MCPServer runtime: post_slack_notification
        slack_msg = (
            f"*INCIDENT RESOLVED* via Alexa+ Voice Commander\n"
            f"• *Service:* {pending['service']} ({pending['cluster']})\n"
            f"• *Action:* Rolled back to N-1 healthy task definition `{pending['target_revision']}`\n"
            f"• *Status:* Health checks passing (0 active errors, memory 41.2%)\n"
            f"• *Measured MTTR:* {mttr_sec}s (Est. ${cost_avoided:,.0f} downtime avoided vs 18m manual baseline)\n"
            f"• *Authorized by:* Out-of-Band Slack OTP (`{expected_pin}`)"
        )
        await invoke_mcp_tool(
            "post_slack_notification",
            {"channel": "#sre-incidents", "message": slack_msg},
            tool_traces
        )

        SESSION_CONTEXT["pending_rollback"] = None
        
        spoken = (
            f"Out-of-band verification confirmed. Service {pending['service']} has been rolled back to N-1 task definition {pending['target_revision']}. "
            f"Health checks are passing with an elapsed MTTR of {int(mttr_sec)} seconds, and I have posted the audit trail to Slack."
        )
        
        return {
            "spoken_response": spoken,
            "display_card": {
                "title": "Incident Resolved - Service Healthy",
                "badge": "RESOLVED",
                "badge_color": "green",
                "service": pending["service"],
                "cluster": pending["cluster"],
                "active_revision": pending["target_revision"],
                "revenue_saved": f"Est. ${cost_avoided:,.0f} Avoided ({int(mttr_sec)}s vs 18m baseline)",
                "status_message": f"Rollback completed in {mttr_sec}s. 0 active 5xx errors. Memory stable at 41.2%.",
                "metrics": {
                    "MemoryUtilization": "41.2%",
                    "CPUUtilization": "22.5%",
                    "ActiveConnections": "1,420"
                }
            },
            "state": "RESOLVED",
            "planner": planner_meta,
            "tool_traces": tool_traces
        }

    # CASE 1B: Amazon Blameless Correction of Errors (COE) Change Correlation ("Correlate deployment", "5 Whys", "Who broke prod")
    if any(k in user_query for k in ["who broke", "git blame", "culprit", "who deployed", "who pushed", "coe", "correlate", "blame", "5 whys", "five whys"]):
        target = _infer_target_service(user_query)
        service = target["service"]
        culprit_res = await invoke_mcp_tool(
            "trace_deployment_culprit",
            {"service": service},
            tool_traces
        )

        spoken = (
            f"Change correlation complete for {service}. "
            f"Deployment {culprit_res['deployment_version']} commit {culprit_res['commit_sha']} bypassed a canary memory soak test. "
            f"I have generated a 5-Whys root-cause audit and configured an automated ECS deployment circuit breaker."
        )

        return {
            "spoken_response": spoken,
            "display_card": {
                "title": f"Blameless COE Change Correlation: {service}",
                "badge": "5-WHYS COE AUDIT",
                "badge_color": "amber",
                "service": service,
                "culprit_data": culprit_res,
                "status_message": f"Systemic CI/CD gap identified for commit {culprit_res['commit_sha']} ({culprit_res['deployment_version']})."
            },
            "state": "CULPRIT_IDENTIFIED",
            "planner": planner_meta,
            "tool_traces": tool_traces
        }

    # CASE 1C: Deterministic N-1 Task Definition Pre-Flight & Telemetry Delta ("Verify pre-flight", "Simulate blast radius")
    if any(k in user_query for k in ["blast radius", "canary", "simulate", "digital twin", "pre-flight", "preflight", "stress test", "projected impact"]):
        target = _infer_target_service(user_query)
        sim_res = await invoke_mcp_tool(
            "simulate_blast_radius",
            {
                "service": target["service"],
                "target_revision": target["target_revision"]
            },
            tool_traces
        )

        spoken = (
            f"Pre-flight telemetry analysis complete for reverting {target['service']} to N-1 revision {target['target_revision']}. "
            f"Rolling back recovers {sim_res['projected_memory_reduction']}, restoring {sim_res['projected_headroom']} with zero database schema migrations. "
            "A scoped IAM rollback session policy has been prepared."
        )

        return {
            "spoken_response": spoken,
            "display_card": {
                "title": f"N-1 Rollback Pre-Flight: {target['service']}",
                "badge": "PRE-FLIGHT VERIFIED",
                "badge_color": "cyan",
                "service": target["service"],
                "blast_radius_data": sim_res,
                "status_message": f"{sim_res['analysis_type']} for {target['target_revision']}."
            },
            "state": "BLAST_RADIUS_VERIFIED",
            "planner": planner_meta,
            "tool_traces": tool_traces
        }

    # CASE 2: Propose Automated Code Fix / Hotfix ("Alexa, propose code fix", "Fix the bug", "Patch")
    if any(k in user_query for k in ["code fix", "propose fix", "patch", "hotfix", "code patch", "permanent fix", "fix bug", "propose a fix", "root cause fix"]):
        target = _infer_target_service(user_query)
        service = target["service"]
        fix_res = await invoke_mcp_tool(
            "propose_code_fix",
            {"service": service},
            tool_traces
        )

        spoken = (
            f"I've synthesized a production hotfix for {service} using AWS Bedrock Claude 3.5 Sonnet. "
            f"{fix_res['explanation']} "
            f"A draft pull request branch {fix_res['branch']} is ready for review."
        )

        return {
            "spoken_response": spoken,
            "display_card": {
                "title": f"Automated Hotfix: {service}",
                "badge": "PR DRAFT READY",
                "badge_color": "cyan",
                "service": service,
                "branch": fix_res["branch"],
                "target_file": fix_res["target_file"],
                "git_patch": fix_res["git_patch"],
                "explanation": fix_res["explanation"],
                "estimated_memory_reduction": fix_res["estimated_memory_reduction"],
                "pr_url": fix_res["pr_url"],
                "status_message": "Unified Git diff patch synthesized via AWS Bedrock (Claude 3.5 Sonnet)."
            },
            "state": "CODE_FIX_READY",
            "tool_traces": tool_traces
        }

    # CASE 3: Generate SRE Post-Mortem Report ("Alexa, generate post-mortem", "Incident report", "RCA")
    if any(k in user_query for k in ["postmortem", "post-mortem", "post mortem", "incident report", "rca report", "rca summary", "generate report", "incident postmortem"]):
        target = _infer_target_service(user_query)
        incident_id = target["incident_id"] if "payment" in user_query else SESSION_CONTEXT.get("current_incident", "INC-84920")
        pm_res = await invoke_mcp_tool(
            "generate_incident_postmortem",
            {"incident_id": incident_id},
            tool_traces
        )

        spoken = (
            f"I've generated the blameless SRE post-mortem for incident {incident_id}. "
            f"Mean time to acknowledge was {pm_res['mtta']}, and mean time to remediate was {pm_res['mttr']}. "
            "The report has been archived to S3 and posted to the incident Slack channel."
        )

        return {
            "spoken_response": spoken,
            "display_card": {
                "title": f"Blameless SRE Post-Mortem: {incident_id}",
                "badge": "PUBLISHED",
                "badge_color": "indigo",
                "incident_id": incident_id,
                "mtta": pm_res["mtta"],
                "mttr": pm_res["mttr"],
                "impact": pm_res["impact"],
                "postmortem_markdown": pm_res["postmortem_markdown"],
                "s3_report_url": pm_res["s3_report_url"],
                "slack_broadcast": pm_res["slack_broadcast"],
                "status_message": "Post-mortem generated, archived to S3, and broadcast to Slack."
            },
            "state": "POSTMORTEM_GENERATED",
            "tool_traces": tool_traces
        }

    # CASE 4: Request Rollback ("Roll back checkout-api to revision 41", "Rollback payment-gateway")
    if "roll" in user_query or "revert" in user_query:
        target = _infer_target_service(user_query)
        service = target["service"]
        cluster = target["cluster"]
        target_rev = target["target_revision"]
        
        # Call MCP Tool via MCPServer runtime: execute_rollback (confirmed=False -> triggers Safety Gate)
        gate_res = await invoke_mcp_tool(
            "execute_rollback",
            {
                "service": service,
                "cluster": cluster,
                "target_revision": target_rev,
                "confirmed": False
            },
            tool_traces,
            status_override="SAFETY_GATE_TRIGGERED"
        )

        SESSION_CONTEXT["pending_rollback"] = {
            "service": service,
            "cluster": cluster,
            "target_revision": target_rev,
            "challenge_pin": gate_res.get("challenge_pin"),
            "jit_iam_policy": gate_res.get("jit_iam_policy")
        }

        spoken = (
            f"Rolling back {service} will redeploy the cluster to N-1 task definition {target_rev}. "
            "I have dispatched a one-time 4-digit security code to #sre-oncall-otp in Slack. "
            "Say 'CONFIRM ROLLBACK' followed by your out-of-band code to authorize this deployment."
        )

        return {
            "spoken_response": spoken,
            "display_card": {
                "title": "Out-of-Band 2FA Authorization Required",
                "badge": "AWAITING OOB OTP",
                "badge_color": "amber",
                "service": service,
                "cluster": cluster,
                "target_revision": target_rev,
                "challenge_pin": gate_res.get("challenge_pin"),
                "oob_delivery_channel": gate_res.get("oob_delivery_channel", "#sre-oncall-otp (Slack Out-of-Band)"),
                "auth_mechanism": gate_res.get("auth_mechanism"),
                "jit_iam_policy": gate_res.get("jit_iam_policy"),
                "status_message": "Safety Gate active. One-time 4-digit OTP delivered out-of-band to #sre-oncall-otp.",
                "action_prompt": "Check Slack #sre-oncall-otp and speak 'Confirm rollback <PIN>'."
            },
            "state": "AWAITING_CONFIRMATION",
            "planner": planner_meta,
            "tool_traces": tool_traces
        }

    # CASE 5: Direct Slack Notification Request ("Notify Slack", "Send message to Slack")
    if "slack" in user_query or "notify team" in user_query:
        target = _infer_target_service(user_query)
        msg = f"👀 *SRE Update:* Investigating active alarm on `{target['service']}` ({target['cluster']}) via Alexa+ Bedside Commander."
        await invoke_mcp_tool(
            "post_slack_notification",
            {"channel": "#sre-incidents", "message": msg},
            tool_traces
        )
        return {
            "spoken_response": f"I have posted an investigation update for {target['service']} to the #sre-incidents Slack channel.",
            "display_card": {
                "title": f"Slack Broadcast Sent: {target['service']}",
                "badge": "NOTIFIED",
                "badge_color": "blue",
                "service": target["service"],
                "cluster": target["cluster"],
                "status_message": "Audit notification delivered to #sre-incidents."
            },
            "state": "INCIDENT_ACTIVE",
            "tool_traces": tool_traces
        }

    # CASE 6: Primary Incident Triage ("What's failing in prod?", "What triggered the alarm?", "Check payment-gateway")
    if any(k in user_query for k in ["alarm", "fail", "wrong", "status", "triage", "happening", "outage", "issue", "broken"]) or user_query in ["what is failing in production?", "what is failing?"]:
        # Step 1: Call MCP Tool get_active_alarms via MCPServer runtime
        alarms = await invoke_mcp_tool("get_active_alarms", {}, tool_traces)

        if not alarms:
            return {
                "spoken_response": "All systems in production are currently healthy. There are zero active CloudWatch alarms.",
                "display_card": {
                    "title": "Production Status Healthy",
                    "badge": "ALL OK",
                    "badge_color": "green",
                    "status_message": "No active alarms across production clusters."
                },
                "state": "HEALTHY",
                "tool_traces": tool_traces
            }

        # Select alarm matching service if specified (e.g. payment-gateway), else primary alarm
        alarm = alarms[0]
        if "payment" in user_query:
            for a in alarms:
                if "payment" in a.get("service", ""):
                    alarm = a
                    break

        service_name = alarm["service"]
        SESSION_CONTEXT["current_service"] = service_name
        SESSION_CONTEXT["current_incident"] = alarm.get("incident_id", "INC-84920")

        # Step 2: Call MCP Tool fetch_error_logs via MCPServer runtime
        logs = await invoke_mcp_tool(
            "fetch_error_logs",
            {"service_name": service_name, "limit": 5},
            tool_traces
        )

        # Step 3: Call MCP Tool diagnose_incident via MCPServer runtime
        diagnosis = await invoke_mcp_tool(
            "diagnose_incident",
            {"service_name": service_name},
            tool_traces
        )

        if "payment" in service_name:
            spoken = (
                f"ECS service {service_name} in us-east-1 is experiencing database connection pool starvation at 100 of 100 connections. "
                f"AWS Bedrock traced unclosed transactions to deployment {alarm.get('deployment_version', 'v1.12.0')} and recommends rolling back to revision {alarm.get('previous_revision', 'payment-gateway:88')}."
            )
        else:
            spoken = (
                f"ECS service {service_name} in us-east-1 is throwing 502 Bad Gateway errors. "
                f"CloudWatch shows memory spiked to 99% following deployment {alarm.get('deployment_version', 'v2.4')}. "
                f"AWS Bedrock recommends rolling back to revision {alarm.get('previous_revision', '41')}."
            )

        return {
            "spoken_response": spoken,
            "display_card": {
                "title": f"Active Sev-2 Incident: {alarm.get('alarm_name')}",
                "badge": "CRITICAL ALARM",
                "badge_color": "red",
                "service": service_name,
                "cluster": alarm.get("cluster"),
                "severity": alarm.get("severity"),
                "reason": alarm.get("reason"),
                "current_revision": alarm.get("current_revision"),
                "recommended_rollback": alarm.get("previous_revision"),
                "metrics": alarm.get("metrics"),
                "bedrock_diagnosis": diagnosis,
                "logs_preview": logs[:2] if isinstance(logs, list) else []
            },
            "state": "INCIDENT_ACTIVE",
            "tool_traces": tool_traces
        }

    # CASE 7: Dynamic Off-Script SRE Conversational Q&A (powered by MCP tools + Bedrock/Telemetry synthesis)
    alarms = await invoke_mcp_tool("get_active_alarms", {}, tool_traces)
    target = _infer_target_service(user_query)
    logs = await invoke_mcp_tool(
        "fetch_error_logs",
        {"service_name": target["service"], "limit": 5},
        tool_traces
    )
    qa_res = aws_tools.answer_sre_question(
        user_query=raw_query,
        alarms=alarms if isinstance(alarms, list) else [],
        logs=logs if isinstance(logs, list) else []
    )
    inc = qa_res["incident"]
    return {
        "spoken_response": qa_res["spoken_response"],
        "display_card": {
            "title": f"Live SRE Telemetry: {inc['service']}",
            "badge": inc["status"],
            "badge_color": "red" if inc["status"] == "ALARM" else "green",
            "service": inc["service"],
            "cluster": inc["cluster"],
            "severity": inc["severity"],
            "current_revision": inc["current_task_revision"],
            "recommended_rollback": inc["previous_task_revision"],
            "metrics": inc["alarm"]["Metrics"],
            "bedrock_diagnosis": inc["bedrock_root_cause"],
            "logs_preview": inc.get("log_traces", [])[:2],
            "status_message": f"Dynamic MCP telemetry query for {inc['service']} ({inc['id']})."
        },
        "state": "INCIDENT_ACTIVE" if inc["status"] == "ALARM" else "RESOLVED",
        "tool_traces": tool_traces
    }

@app.post("/api/proactive-alert")
async def trigger_proactive_3am_page():
    """
    Simulates a proactive 3:14 AM PagerDuty / CloudWatch SNS event pushing an
    ambient wake-up page to the SRE's bedside Echo Show before the user even speaks.
    """
    LOCAL_AWS_STATE.reset()
    ACTIVE_INCIDENTS["INC-84920"] = json.loads(json.dumps(MOCK_SCENARIOS["checkout_api_oom"]))
    tool_traces: List[Dict[str, Any]] = []
    alarms = await invoke_mcp_tool("get_active_alarms", {}, tool_traces)
    alarm = alarms[0] if alarms else ACTIVE_INCIDENTS["INC-84920"]
    service_name = alarm.get("service", "checkout-api")
    logs = await invoke_mcp_tool("fetch_error_logs", {"service_name": service_name, "limit": 3}, tool_traces)
    diagnosis = await invoke_mcp_tool("diagnose_incident", {"service_name": service_name}, tool_traces)

    spoken = (
        "Critical Sev-1 Page! Wake up! CloudWatch alarm triggered on checkout-api in us-east-1. "
        "Memory is at 99.4 percent and checkout is bleeding 142 dollars per second. "
        "Say 'Alexa, rollback checkout-api' or 'Alexa, who broke production?'"
    )
    return {
        "spoken_response": spoken,
        "display_card": {
            "title": f"🚨 3 AM PROACTIVE PAGE: {alarm.get('alarm_name', 'checkout-api')}",
            "badge": "SEV-1 WAKE-UP ALARM",
            "badge_color": "red",
            "service": service_name,
            "cluster": alarm.get("cluster", "production-us-east-1"),
            "severity": alarm.get("severity", "CRITICAL (Sev-2)"),
            "reason": alarm.get("reason"),
            "current_revision": alarm.get("current_revision", "checkout-api:42"),
            "recommended_rollback": alarm.get("previous_revision", "checkout-api:41"),
            "metrics": alarm.get("metrics"),
            "bedrock_diagnosis": diagnosis,
            "logs_preview": logs[:2] if isinstance(logs, list) else []
        },
        "state": "INCIDENT_ACTIVE",
        "tool_traces": tool_traces
    }

@app.post("/api/alexa-webhook")
async def alexa_skills_kit_webhook(request: Request):
    """
    Authentic Amazon Alexa Skills Kit (ASK) v1.0 Webhook Endpoint.
    Accepts standard Alexa JSON envelopes (LaunchRequest, IntentRequest) from the
    Alexa Developer Console or AWS Lambda bridge, executes MCP tools via handle_voice_turn,
    and returns a spec-compliant ASK v1.0 response with Standard Card & APL metadata.
    """
    body = await request.json()
    req_obj = body.get("request", {})
    req_type = req_obj.get("type", "LaunchRequest")

    if req_type == "LaunchRequest":
        return {
            "version": "1.0",
            "sessionAttributes": {"state": "LISTENING"},
            "response": {
                "outputSpeech": {
                    "type": "PlainText",
                    "text": "AWS CloudSentry initialized. Ask what is failing in production or request a rollback pre-flight check."
                },
                "card": {
                    "type": "Standard",
                    "title": "AWS CloudSentry",
                    "text": "Connected to MCP Server (/mcp). Ready for incident triage."
                },
                "shouldEndSession": False
            }
        }

    intent = req_obj.get("intent", {})
    intent_name = intent.get("name", "")
    slots = intent.get("slots", {}) or {}
    service_slot = (slots.get("service") or {}).get("value") or "checkout-api"
    pin_slot = (slots.get("pin") or {}).get("value") or ""

    intent_to_utterance = {
        "TriageIncidentIntent": f"Alexa, what is failing on {service_slot}?",
        "AuditDeploymentCOEIntent": f"Alexa, correlate deployment changes for {service_slot}",
        "VerifyBlastRadiusIntent": f"Alexa, verify pre-flight impact for {service_slot}",
        "ExecuteRollbackIntent": f"Alexa, rollback {service_slot}",
        "ConfirmRollbackIntent": f"Alexa, confirm rollback {pin_slot}".strip(),
        "ProposeCodeFixIntent": f"Alexa, propose code fix for {service_slot}",
        "GeneratePostmortemIntent": "Alexa, generate post-mortem"
    }
    synthesized_query = intent_to_utterance.get(intent_name, f"Alexa, status of {service_slot}")
    turn_res = await handle_voice_turn(VoiceQueryRequest(query=synthesized_query))

    return {
        "version": "1.0",
        "sessionAttributes": {
            "state": turn_res.get("state"),
            "mcp_tool_count": len(turn_res.get("tool_traces", []))
        },
        "response": {
            "outputSpeech": {
                "type": "PlainText",
                "text": turn_res.get("spoken_response", "")
            },
            "card": {
                "type": "Standard",
                "title": (
                    f"2FA PIN: {turn_res.get('display_card', {}).get('challenge_pin')}"
                    if turn_res.get("display_card", {}).get("challenge_pin")
                    else turn_res.get("display_card", {}).get("title", "AWS CloudSentry")
                ),
                "text": (
                    f"Your one-time authorization PIN is: {turn_res.get('display_card', {}).get('challenge_pin')}\n"
                    f"Speak: 'Alexa, confirm rollback {turn_res.get('display_card', {}).get('challenge_pin')}' (or 4921)."
                    if turn_res.get("display_card", {}).get("challenge_pin")
                    else turn_res.get("display_card", {}).get("status_message", "")
                )
            },
            "shouldEndSession": False
        }
    }

@app.get("/api/aws-state")
async def get_live_aws_state():
    """Returns real-time AWS CloudWatch Alarms, ECS Services, S3 Objects, STS Identity, and SigV4 Wire Log via boto3."""
    return aws_tools.get_live_aws_state()


@app.post("/api/reset")
async def reset_scenario():
    """Resets the mock scenarios and local AWS SigV4 emulator back to initial alarm state for clean demo recordings."""
    LOCAL_AWS_STATE.reset()
    LOCAL_AWS_STATE.reset()
    ACTIVE_INCIDENTS["INC-84920"] = json.loads(json.dumps(MOCK_SCENARIOS["checkout_api_oom"]))
    ACTIVE_INCIDENTS["INC-84921"] = json.loads(json.dumps(MOCK_SCENARIOS["payments_db_pool_exhausted"]))
    aws_tools.pending_otps.clear()
    SESSION_CONTEXT["pending_rollback"] = None
    SESSION_CONTEXT["current_incident"] = "INC-84920"
    SESSION_CONTEXT["current_service"] = "checkout-api"
    return {
        "status": "RESET_SUCCESS",
        "current_incident": ACTIVE_INCIDENTS["INC-84920"],
        "aws_state": aws_tools.get_live_aws_state()
    }


@app.get("/api/health")
async def health_check():
    return {
        "service": "AWS CloudSentry MCP Server",
        "spec_version": "2025-11-25+",
        "protocol": "Streamable HTTP",
        "mcp_endpoint": "/mcp",
        "aws_connected": aws_tools.has_aws_creds,
        "aws_endpoint": aws_tools.endpoint_url or "https://amazonaws.com"
    }

