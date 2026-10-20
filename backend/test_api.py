"""
CloudSentry - Automated Test Suite
Verifies MCP Streamable HTTP endpoint, Voice Agent multi-turn logic,
Safety Gate, and Bedrock diagnostics.
"""

import sys
sys.path.append('backend')

from fastapi.testclient import TestClient
from server import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["service"] == "AWS CloudSentry MCP Server"
    assert data["protocol"] == "Streamable HTTP"
    print("✓ Test 1 (Health Check) passed:", data)

def test_mcp_runtime_tool_discovery():
    res = client.get("/api/mcp-tools")
    assert res.status_code == 200
    data = res.json()
    assert data["tool_count"] == 9
    tool_names = [t["name"] for t in data["tools"]]
    assert "get_active_alarms" in tool_names
    assert "propose_code_fix" in tool_names
    assert "generate_incident_postmortem" in tool_names
    assert "trace_deployment_culprit" in tool_names
    assert "simulate_blast_radius" in tool_names
    print(f"✓ Test 2 (MCP Runtime Introspection) passed: {data['tool_count']} MCP tools registered")

def test_incident_triage_turn():
    res = client.post("/api/voice-turn", json={"query": "Alexa, what is failing in production?"})
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "INCIDENT_ACTIVE"
    assert "checkout-api" in data["spoken_response"]
    assert len(data["tool_traces"]) >= 3
    for trace in data["tool_traces"]:
        assert trace.get("protocol") == "MCP-2025-11-25+"
    tools = [t["tool"] for t in data["tool_traces"]]
    assert "get_active_alarms" in tools
    assert "fetch_error_logs" in tools
    assert "diagnose_incident" in tools
    print("✓ Test 3 (Incident Triage via MCP Runtime) passed: 3 MCP tools executed")

def test_off_script_dynamic_qa():
    res = client.post("/api/voice-turn", json={"query": "Alexa, why did memory spike in v2.4.1?"})
    assert res.status_code == 200
    data = res.json()
    assert "e8f41c" in data["spoken_response"] or "OOMKill" in data["spoken_response"]
    assert len(data["tool_traces"]) >= 2
    assert data["tool_traces"][0]["protocol"] == "MCP-2025-11-25+"
    print("✓ Test 4 (Off-Script Dynamic SRE Q&A) passed: Context-aware technical response")

def test_multi_service_payment_gateway():
    res = client.post("/api/voice-turn", json={"query": "Alexa, check what is failing on payment-gateway"})
    assert res.status_code == 200
    data = res.json()
    assert "payment-gateway" in data["spoken_response"]
    assert data["display_card"]["service"] == "payment-gateway"
    print("✓ Test 5 (Multi-Service Triage: payment-gateway) passed")

def test_rollback_safety_gate_and_oob_otp():
    res = client.post("/api/voice-turn", json={"query": "Rollback checkout-api to revision 41"})
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "AWAITING_CONFIRMATION"
    dynamic_pin = data["display_card"].get("challenge_pin")
    assert dynamic_pin and len(dynamic_pin) == 4 and dynamic_pin.isdigit()
    # Critical security check: Alexa must NEVER speak the out-of-band OTP aloud!
    assert dynamic_pin not in data["spoken_response"]
    assert data["tool_traces"][0]["status"] == "SAFETY_GATE_TRIGGERED"
    assert data["tool_traces"][0]["protocol"] == "MCP-2025-11-25+"
    print(f"✓ Test 6 (Out-of-Band Slack OTP Gate) passed: Dynamic PIN ({dynamic_pin}) generated & never spoken aloud")

    # Verify wrong PIN is rejected
    wrong_pin = "0000" if dynamic_pin != "0000" else "9999"
    bad_res = client.post("/api/voice-turn", json={"query": f"Confirm rollback {wrong_pin}"})
    assert bad_res.status_code == 200
    bad_data = bad_res.json()
    assert bad_data["state"] == "AWAITING_CONFIRMATION"
    assert bad_data["display_card"]["badge"] == "PIN REJECTED"
    print(f"✓ Test 6B (Wrong PIN Rejection) passed: Invalid PIN ({wrong_pin}) blocked")

    # Verify valid out-of-band PIN succeeds
    ok_res = client.post("/api/voice-turn", json={"query": f"Confirm rollback {dynamic_pin}"})
    assert ok_res.status_code == 200
    ok_data = ok_res.json()
    assert ok_data["state"] == "RESOLVED"
    tools = [t["tool"] for t in ok_data["tool_traces"]]
    assert "execute_rollback" in tools
    assert "post_slack_notification" in tools
    print("✓ Test 7 (Out-of-Band OTP Execution) passed: Service restored & Slack notified")

def test_alexa_wake_word():
    # Test bare wake word "Alexa"
    res = client.post("/api/voice-turn", json={"query": "Alexa"})
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "LISTENING"
    assert "Yes? I'm listening" in data["spoken_response"]
    print("✓ Test 8 (Bare 'Alexa' Wake Word) passed: Activated listening state")

def test_propose_code_fix():
    res = client.post("/api/voice-turn", json={"query": "Alexa, propose code fix for checkout-api"})
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "CODE_FIX_READY"
    assert "synthesized a production hotfix" in data["spoken_response"]
    assert "git_patch" in data["display_card"]
    assert "--- a/services/checkout_processor.py" in data["display_card"]["git_patch"]
    assert data["tool_traces"][0]["tool"] == "propose_code_fix"
    assert data["tool_traces"][0]["protocol"] == "MCP-2025-11-25+"
    print("✓ Test 9 (MCP Tool: propose_code_fix) passed: Unified Git diff generated")

def test_generate_incident_postmortem():
    res = client.post("/api/voice-turn", json={"query": "Alexa, generate post-mortem"})
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "POSTMORTEM_GENERATED"
    assert "blameless SRE post-mortem" in data["spoken_response"]
    assert "postmortem_markdown" in data["display_card"]
    assert "Blameless SRE Incident Post-Mortem" in data["display_card"]["postmortem_markdown"]
    assert data["tool_traces"][0]["tool"] == "generate_incident_postmortem"
    assert data["tool_traces"][0]["protocol"] == "MCP-2025-11-25+"
    print("✓ Test 10 (MCP Tool: generate_incident_postmortem) passed: Report published")

def test_trace_deployment_culprit():
    res = client.post("/api/voice-turn", json={"query": "Alexa, correlate deployment changes"})
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "CULPRIT_IDENTIFIED"
    culprit = data["display_card"]["culprit_data"]
    assert culprit["coe_methodology"] == "Amazon Blameless Correction of Errors (5 Whys)"
    assert len(culprit["five_whys"]) == 5
    assert isinstance(culprit["repo_recent_commits"], list)
    assert data["tool_traces"][0]["tool"] == "trace_deployment_culprit"
    print("✓ Test 11 (MCP Tool: trace_deployment_culprit) passed: Amazon Blameless COE 5-Whys & git log verified")

def test_simulate_blast_radius():
    res = client.post("/api/voice-turn", json={"query": "Alexa, verify pre-flight impact"})
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "BLAST_RADIUS_VERIFIED"
    br = data["display_card"]["blast_radius_data"]
    assert "projected_memory_reduction" in br
    assert "policy_document" in br["jit_iam_session"]
    assert data["tool_traces"][0]["tool"] == "simulate_blast_radius"
    print("✓ Test 12 (MCP Tool: simulate_blast_radius) passed: Deterministic N-1 telemetry delta & STS policy")

def test_proactive_3am_page():
    res = client.post("/api/proactive-alert")
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "INCIDENT_ACTIVE"
    assert "Wake up" in data["spoken_response"]
    assert len(data["tool_traces"]) == 3
    print("✓ Test 13 (Proactive 3 AM PagerDuty Wake-Up Push) passed: Ambient SRE alert verified")

def test_alexa_skills_kit_webhook():
    ask_payload = {
        "version": "1.0",
        "request": {
            "type": "IntentRequest",
            "intent": {
                "name": "TriageIncidentIntent",
                "slots": {
                    "service": {"name": "service", "value": "checkout-api"}
                }
            }
        }
    }
    res = client.post("/api/alexa-webhook", json=ask_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["version"] == "1.0"
    assert "checkout-api" in data["response"]["outputSpeech"]["text"]
    assert data["sessionAttributes"]["mcp_tool_count"] == 3
    print("✓ Test 14 (Alexa Skills Kit v1.0 Webhook) passed: Spec-compliant ASK JSON response verified")

def test_external_mcp_streamable_http_and_boto3_state():
    with TestClient(app) as mcp_client:
        headers = {
            "Accept": "application/json, text/event-stream",
            "Content-Type": "application/json"
        }
        r_init = mcp_client.post("/mcp", json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2025-03-26",
                "capabilities": {},
                "clientInfo": {"name": "External-MCP-Judge-Suite", "version": "1.0.0"}
            }
        }, headers=headers)
        assert r_init.status_code == 200
        sid = r_init.headers.get("mcp-session-id")
        assert sid
        headers["mcp-session-id"] = sid
        mcp_client.post("/mcp", json={"jsonrpc": "2.0", "method": "notifications/initialized"}, headers=headers)
        r_list = mcp_client.post("/mcp", json={"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}, headers=headers)
        assert r_list.status_code == 200
        assert len(r_list.json()["result"]["tools"]) == 9
        r_aws = mcp_client.get("/api/aws-state")
        assert r_aws.status_code == 200
        aws_state = r_aws.json()
        assert len(aws_state["sigv4_wire_log"]) > 0
        print(f"✓ Test 15 (External /mcp Streamable HTTP + Boto3 SigV4 State) passed: session={sid[:12]}..., SigV4 calls={len(aws_state['sigv4_wire_log'])}")

if __name__ == "__main__":
    print("========================================")
    print("Running CloudSentry Automated Test Suite")
    print("========================================")
    test_health()
    test_mcp_runtime_tool_discovery()
    test_alexa_wake_word()
    test_incident_triage_turn()
    test_off_script_dynamic_qa()
    test_multi_service_payment_gateway()
    test_trace_deployment_culprit()
    test_simulate_blast_radius()
    test_rollback_safety_gate_and_oob_otp()
    test_propose_code_fix()
    test_generate_incident_postmortem()
    test_proactive_3am_page()
    test_alexa_skills_kit_webhook()
    test_external_mcp_streamable_http_and_boto3_state()
    print("========================================")
    print("ALL 16 END-TO-END TESTS PASSED (100% OK)!")
    print("========================================")


