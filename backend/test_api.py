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

if __name__ == "__main__":
    print("========================================")
    print("Running CloudSentry Automated Test Suite")
    print("========================================")
    test_health()
    test_incident_triage_turn()
    test_rollback_safety_gate()
    test_rollback_confirmation()
    print("========================================")
    print("ALL 4 END-TO-END TESTS PASSED (100% OK)!")
    print("========================================")

