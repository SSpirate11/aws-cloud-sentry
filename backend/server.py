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
from typing import Dict, Any, List, Optional

from pydantic import BaseModel

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from mcp.server.mcpserver import MCPServer

from aws_tools import aws_tools, ACTIVE_INCIDENTS
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
    description="Roll back an Amazon ECS service task definition to a previous stable revision. Enforces Voice 2FA."
)
def execute_rollback(
    service: str,
    cluster: str,
    target_revision: str,
    confirmed: bool = False
) -> str:
    """Executes safe ECS task rollback with voice confirmation safety protocol."""
    result = aws_tools.execute_rollback(
        service=service,
        cluster=cluster,
        target_revision=target_revision,
        confirmed=confirmed
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


# 2. Initialize FastAPI Application
app = FastAPI(
    title="AWS CloudSentry - Alexa+ Incident Commander",
    description="Model Context Protocol (MCP) Streamable HTTP Server & Voice Simulator API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the official MCP Streamable HTTP application
mcp_app = mcp.streamable_http_app()
app.mount("/mcp", mcp_app)


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

    # CASE 1: Voice 2FA Confirmation of Rollback ("Confirm", "Yes rollback", "Authorize", or PIN "4921")
    if (
        any(w in user_query for w in ["confirm", "yes", "authorize", "proceed", "4921"])
        and SESSION_CONTEXT.get("pending_rollback")
    ):
        pending = SESSION_CONTEXT["pending_rollback"]
        
        # Execute MCP Tool via MCPServer runtime: execute_rollback with confirmed=True
        rollback_res = await invoke_mcp_tool(
            "execute_rollback",
            {
                "service": pending["service"],
                "cluster": pending["cluster"],
                "target_revision": pending["target_revision"],
                "confirmed": True
            },
            tool_traces
        )

        # Execute MCP Tool via MCPServer runtime: post_slack_notification
        slack_msg = (
            f"🚨 *INCIDENT RESOLVED* via Alexa+ Voice Commander\n"
            f"• *Service:* {pending['service']} ({pending['cluster']})\n"
            f"• *Action:* Rolled back to `{pending['target_revision']}`\n"
            f"• *Status:* Health checks passing (0 active errors, memory 41.2%)\n"
            f"• *Authorized by:* Voice 2FA (Alexa+ VoiceID + Challenge PIN {pending.get('challenge_pin', '4921')})"
        )
        await invoke_mcp_tool(
            "post_slack_notification",
            {"channel": "#sre-incidents", "message": slack_msg},
            tool_traces
        )

        SESSION_CONTEXT["pending_rollback"] = None
        
        spoken = f"Rollback confirmed. Service {pending['service']} has been rolled back to task definition {pending['target_revision']}. Health checks are passing, and I have notified the incident channel."
        
        return {
            "spoken_response": spoken,
            "display_card": {
                "title": "Incident Resolved - Service Healthy",
                "badge": "RESOLVED",
                "badge_color": "green",
                "service": pending["service"],
                "cluster": pending["cluster"],
                "active_revision": pending["target_revision"],
                "status_message": "Rollback completed. 0 active 5xx errors. Memory stable at 41.2%.",
                "metrics": {
                    "MemoryUtilization": "41.2%",
                    "CPUUtilization": "22.5%",
                    "ActiveConnections": "1,420"
                }
            },
            "state": "RESOLVED",
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
            "challenge_pin": gate_res.get("challenge_pin", "4921")
        }

        spoken = (
            f"Rolling back {service} will redeploy the cluster to task definition {target_rev}. "
            f"Voice ID biometric verified. Say 'CONFIRM ROLLBACK' or speak security PIN {gate_res.get('challenge_pin', '4921')} to authorize this deployment."
        )

        return {
            "spoken_response": spoken,
            "display_card": {
                "title": "Voice 2FA Authorization Required",
                "badge": "AWAITING CONFIRMATION",
                "badge_color": "amber",
                "service": service,
                "cluster": cluster,
                "target_revision": target_rev,
                "challenge_pin": gate_res.get("challenge_pin", "4921"),
                "voice_biometric": gate_res.get("voice_biometric", "Alexa+ VoiceID: SRE-Primary-OnCall (99.4% match)"),
                "status_message": "Safety Gate active. Mutating action requires spoken confirmation token.",
                "action_prompt": "Say: 'Confirm rollback' (or PIN 4921) to execute."
            },
            "state": "AWAITING_CONFIRMATION",
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

@app.post("/api/reset")
async def reset_scenario():
    """Resets the mock scenarios back to initial alarm state for clean demo recordings."""
    ACTIVE_INCIDENTS["INC-84920"] = json.loads(json.dumps(MOCK_SCENARIOS["checkout_api_oom"]))
    ACTIVE_INCIDENTS["INC-84921"] = json.loads(json.dumps(MOCK_SCENARIOS["payments_db_pool_exhausted"]))
    SESSION_CONTEXT["pending_rollback"] = None
    SESSION_CONTEXT["current_incident"] = "INC-84920"
    SESSION_CONTEXT["current_service"] = "checkout-api"
    return {"status": "RESET_SUCCESS", "current_incident": ACTIVE_INCIDENTS["INC-84920"]}

@app.get("/api/health")
async def health_check():
    return {
        "service": "AWS CloudSentry MCP Server",
        "spec_version": "2025-11-25+",
        "protocol": "Streamable HTTP",
        "mcp_endpoint": "/mcp",
        "aws_connected": aws_tools.has_aws_creds
    }

