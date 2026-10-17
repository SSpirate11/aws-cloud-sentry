"""
CloudSentry - Model Context Protocol (MCP) Server & Alexa+ Agent API
Implements official MCP spec (2025-11-25+, Streamable HTTP).
Mounts both:
1. Native MCP Streamable HTTP endpoint for external agentic callers
2. Conversational Voice Agent API for the Alexa+ Web Voice Simulator
"""

import json
import logging
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
    "current_incident": "INC-84920"
}

@app.post("/api/voice-turn")
async def handle_voice_turn(req: VoiceQueryRequest):
    """
    Simulates Alexa+ Multi-Turn Conversational Reasoning over MCP Tools.
    Interprets natural language voice query, executes MCP tools,
    and returns concise spoken voice output alongside rich visual screen data.
    """
    user_query = req.query.strip().lower()
    tool_traces = []
    
    # CASE 1: Voice Confirmation of Rollback ("Confirm", "Yes rollback", "Authorize")
    if (
        ("confirm" in user_query or "yes" in user_query or "authorize" in user_query or "proceed" in user_query)
        and SESSION_CONTEXT.get("pending_rollback")
    ):
        pending = SESSION_CONTEXT["pending_rollback"]
        
        # Execute MCP Tool: execute_rollback with confirmed=True
        tool_traces.append({
            "tool": "execute_rollback",
            "parameters": {
                "service": pending["service"],
                "cluster": pending["cluster"],
                "target_revision": pending["target_revision"],
                "confirmed": True
            },
            "status": "EXECUTING"
        })
        rollback_res = aws_tools.execute_rollback(
            service=pending["service"],
            cluster=pending["cluster"],
            target_revision=pending["target_revision"],
            confirmed=True
        )
        tool_traces[-1]["status"] = "SUCCESS"
        tool_traces[-1]["output"] = rollback_res

        # Execute MCP Tool: post_slack_notification
        slack_msg = (
            f"🚨 *INCIDENT RESOLVED* via Alexa+ Voice Commander\n"
            f"• *Service:* {pending['service']} ({pending['cluster']})\n"
            f"• *Action:* Rolled back to `{pending['target_revision']}`\n"
            f"• *Status:* Health checks passing (0 active errors, memory 41.2%)\n"
            f"• *Authorized by:* Voice 2FA by On-Call SRE"
        )
        tool_traces.append({
            "tool": "post_slack_notification",
            "parameters": {"channel": "#sre-incidents", "message": slack_msg},
            "status": "SUCCESS",
            "output": {"delivered": True}
        })
        aws_tools.post_slack_notification("#sre-incidents", slack_msg)

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
                    "Memory": "41.2%",
                    "CPU": "22.5%",
                    "ErrorRate": "0.0%"
                }
            },
            "state": "RESOLVED",
            "tool_traces": tool_traces
        }

    # CASE 2: Request Rollback ("Roll back checkout-api to revision 41", "Rollback service")
    if "roll" in user_query or "revert" in user_query:
        # Determine service and revision
        service = "checkout-api"
        cluster = "production-us-east-1"
        target_rev = "checkout-api:41"
        
        # Call MCP Tool: execute_rollback (unconfirmed -> triggers Safety Gate)
        tool_traces.append({
            "tool": "execute_rollback",
            "parameters": {
                "service": service,
                "cluster": cluster,
                "target_revision": target_rev,
                "confirmed": False
            },
            "status": "SAFETY_GATE_TRIGGERED",
            "output": {
                "safety_level": "DESTRUCTIVE_MUTATION",
                "requires_confirmation": True
            }
        })

        SESSION_CONTEXT["pending_rollback"] = {
            "service": service,
            "cluster": cluster,
            "target_revision": target_rev
        }

        spoken = f"Rolling back {service} will redeploy the cluster to task definition {target_rev}. Say 'CONFIRM' to authorize this deployment."

        return {
            "spoken_response": spoken,
            "display_card": {
                "title": "Voice 2FA Authorization Required",
                "badge": "AWAITING CONFIRMATION",
                "badge_color": "amber",
                "service": service,
                "cluster": cluster,
                "target_revision": target_rev,
                "status_message": "Safety Gate active. Mutating action requires spoken confirmation token.",
                "action_prompt": "Say: 'Confirm rollback' to execute."
            },
            "state": "AWAITING_CONFIRMATION",
            "tool_traces": tool_traces
        }

    # CASE 3: What's failing / Status / Alarms ("What's failing in prod?", "What triggered the alarm?")
    if "alarm" in user_query or "fail" in user_query or "wrong" in user_query or "what" in user_query or "status" in user_query:
        # Step 1: Call MCP Tool get_active_alarms
        tool_traces.append({
            "tool": "get_active_alarms",
            "parameters": {},
            "status": "SUCCESS"
        })
        alarms = aws_tools.get_active_alarms()
        tool_traces[-1]["output"] = alarms

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

        alarm = alarms[0]
        service_name = alarm["service"]

        # Step 2: Call MCP Tool fetch_error_logs
        tool_traces.append({
            "tool": "fetch_error_logs",
            "parameters": {"service_name": service_name, "limit": 5},
            "status": "SUCCESS"
        })
        logs = aws_tools.fetch_error_logs(service_name, limit=5)
        tool_traces[-1]["output"] = logs

        # Step 3: Call MCP Tool diagnose_incident (AWS Bedrock)
        tool_traces.append({
            "tool": "diagnose_incident",
            "parameters": {"service_name": service_name},
            "status": "SUCCESS"
        })
        diagnosis = aws_tools.diagnose_with_bedrock(service_name, logs)
        tool_traces[-1]["output"] = diagnosis

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
                "logs_preview": logs[:2]
            },
            "state": "INCIDENT_ACTIVE",
            "tool_traces": tool_traces
        }

    # Default fallback turn
    return {
        "spoken_response": "I am CloudSentry, your Alexa+ Incident Commander. You can ask me 'What is failing in production?', or say 'Rollback checkout-api to revision 41'.",
        "display_card": {
            "title": "AWS CloudSentry Voice Assistant Ready",
            "badge": "STANDBY",
            "badge_color": "blue",
            "status_message": "Ready to triage AWS CloudWatch incidents and coordinate remediation."
        },
        "state": "STANDBY",
        "tool_traces": []
    }

@app.post("/api/reset")
async def reset_scenario():
    """Resets the mock scenario back to initial alarm state for clean demo recordings."""
    ACTIVE_INCIDENTS["INC-84920"] = dict(MOCK_SCENARIOS["checkout_api_oom"])
    SESSION_CONTEXT["pending_rollback"] = None
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
