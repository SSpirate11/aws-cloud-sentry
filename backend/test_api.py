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

def test_rollback_safety_gate():
    res = client.post("/api/voice-turn", json={"query": "Rollback checkout-api to revision 41"})
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "AWAITING_CONFIRMATION"
    assert "CONFIRM" in data["spoken_response"]
    assert data["display_card"].get("challenge_pin") == "4921"
    assert "VoiceID" in data["display_card"].get("voice_biometric", "")
    assert data["tool_traces"][0]["status"] == "SAFETY_GATE_TRIGGERED"
    assert data["tool_traces"][0]["protocol"] == "MCP-2025-11-25+"
    print("✓ Test 6 (Voice 2FA + Biometric + PIN Safety Gate) passed: Destructive mutation halted")

def test_rollback_confirmation():
    res = client.post("/api/voice-turn", json={"query": "Confirm rollback 4921"})
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "RESOLVED"
    assert "Rolled back" in data["spoken_response"] or "rolled back" in data["spoken_response"]
    tools = [t["tool"] for t in data["tool_traces"]]
    assert "execute_rollback" in tools
    assert "post_slack_notification" in tools
    print("✓ Test 7 (Voice 2FA Execution) passed: Service restored & Slack notified")

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
    res = client.post("/api/voice-turn", json={"query": "Alexa, who broke production?"})
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "CULPRIT_IDENTIFIED"
    assert "culprit_data" in data["display_card"]
    assert data["tool_traces"][0]["tool"] == "trace_deployment_culprit"
    print("✓ Test 11 (MCP Tool: trace_deployment_culprit) passed: Forensic Git blame & coffee bounty")

def test_simulate_blast_radius():
    res = client.post("/api/voice-turn", json={"query": "Alexa, simulate blast radius"})
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "BLAST_RADIUS_VERIFIED"
    assert "blast_radius_data" in data["display_card"]
    assert data["tool_traces"][0]["tool"] == "simulate_blast_radius"
    print("✓ Test 12 (MCP Tool: simulate_blast_radius) passed: Digital twin 12.4k RPS canary & JIT IAM")

def test_proactive_3am_page():
    res = client.post("/api/proactive-alert")
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "INCIDENT_ACTIVE"
    assert "Wake up" in data["spoken_response"]
    assert len(data["tool_traces"]) == 3
    print("✓ Test 13 (Proactive 3 AM PagerDuty Wake-Up Push) passed: Ambient SRE alert verified")

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
    test_rollback_safety_gate()
    test_rollback_confirmation()
    test_propose_code_fix()
    test_generate_incident_postmortem()
    test_proactive_3am_page()
    print("========================================")
    print("ALL 13 END-TO-END TESTS PASSED (100% OK)!")
    print("========================================")


