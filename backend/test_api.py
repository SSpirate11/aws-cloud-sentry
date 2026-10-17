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
    print("✓ Health check passed:", data)

def test_incident_triage_turn():
    res = client.post("/api/voice-turn", json={"query": "Alexa, what is failing in production?"})
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "INCIDENT_ACTIVE"
    assert "checkout-api" in data["spoken_response"]
    assert len(data["tool_traces"]) >= 3
    tools = [t["tool"] for t in data["tool_traces"]]
    assert "get_active_alarms" in tools
    assert "fetch_error_logs" in tools
    assert "diagnose_incident" in tools
    print("✓ Turn 1 (Incident Triage) passed: 3 MCP tools executed")

def test_rollback_safety_gate():
    res = client.post("/api/voice-turn", json={"query": "Rollback checkout-api to revision 41"})
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "AWAITING_CONFIRMATION"
    assert "CONFIRM" in data["spoken_response"]
    assert data["tool_traces"][0]["status"] == "SAFETY_GATE_TRIGGERED"
    print("✓ Turn 2 (Voice 2FA Safety Gate) passed: Destructive mutation halted")

def test_rollback_confirmation():
    res = client.post("/api/voice-turn", json={"query": "Confirm rollback"})
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "RESOLVED"
    assert "Rolled back" in data["spoken_response"] or "rolled back" in data["spoken_response"]
    tools = [t["tool"] for t in data["tool_traces"]]
    assert "execute_rollback" in tools
    assert "post_slack_notification" in tools
    print("✓ Turn 3 (Voice 2FA Execution) passed: Service restored & Slack notified")

def test_alexa_wake_word():
    # Test bare wake word "Alexa"
    res = client.post("/api/voice-turn", json={"query": "Alexa"})
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "LISTENING"
    assert "Yes? I'm listening" in data["spoken_response"]
    print("✓ Turn 0 (Bare 'Alexa' Wake Word) passed: Activated listening state")

def test_propose_code_fix():
    res = client.post("/api/voice-turn", json={"query": "Alexa, propose code fix for checkout-api"})
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "CODE_FIX_READY"
    assert "synthesized a production hotfix" in data["spoken_response"]
    assert "git_patch" in data["display_card"]
    assert "--- a/services/checkout_processor.py" in data["display_card"]["git_patch"]
    assert data["tool_traces"][0]["tool"] == "propose_code_fix"
    print("✓ Turn 4 (MCP Tool: propose_code_fix) passed: Unified Git diff generated")

def test_generate_incident_postmortem():
    res = client.post("/api/voice-turn", json={"query": "Alexa, generate post-mortem"})
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "POSTMORTEM_GENERATED"
    assert "blameless SRE post-mortem" in data["spoken_response"]
    assert "postmortem_markdown" in data["display_card"]
    assert "Blameless SRE Incident Post-Mortem" in data["display_card"]["postmortem_markdown"]
    assert data["tool_traces"][0]["tool"] == "generate_incident_postmortem"
    print("✓ Turn 5 (MCP Tool: generate_incident_postmortem) passed: Report published")

if __name__ == "__main__":
    print("========================================")
    print("Running CloudSentry Automated Test Suite")
    print("========================================")
    test_health()
    test_alexa_wake_word()
    test_incident_triage_turn()
    test_rollback_safety_gate()
    test_rollback_confirmation()
    test_propose_code_fix()
    test_generate_incident_postmortem()
    print("========================================")
    print("ALL 7 END-TO-END TESTS PASSED (100% OK)!")
    print("========================================")


