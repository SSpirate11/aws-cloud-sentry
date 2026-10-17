"""
CloudSentry - Mock Incident Scenarios
Provides hyper-realistic AWS CloudWatch, ECS, and Bedrock diagnostic data
for offline demonstrations, local testing, and seamless judge evaluation.
"""

from datetime import datetime, timezone, timedelta

def get_current_time_iso():
    return datetime.now(timezone.utc).isoformat()

MOCK_SCENARIOS = {
    "checkout_api_oom": {
        "id": "INC-84920",
        "title": "High 502 Bad Gateway Rate & Memory Spike",
        "service": "checkout-api",
        "cluster": "production-us-east-1",
        "region": "us-east-1",
        "status": "ALARM",
        "severity": "CRITICAL (Sev-2)",
        "current_task_revision": "checkout-api:42",
        "previous_task_revision": "checkout-api:41",
        "deployment_id": "dep-049fa81bc",
        "deployment_version": "v2.4.1",
        "deployed_at": (datetime.now(timezone.utc) - timedelta(minutes=18)).isoformat(),
        "alarm": {
            "AlarmName": "TargetResponseTime-checkout-api-High",
            "AlarmDescription": "Triggers when 5xx errors exceed 5% and p95 latency exceeds 2.5s",
            "StateValue": "ALARM",
            "StateReason": "Threshold Breached: 5xx Error Rate = 14.8% (Threshold: 5.0%), p95 Latency = 4,210ms (Threshold: 2,500ms)",
            "MetricName": "HTTPCode_Target_5XX_Count",
            "Namespace": "AWS/ApplicationELB",
            "Dimensions": [
                {"Name": "TargetGroup", "Value": "targetgroup/prod-checkout/88219fa"},
                {"Name": "LoadBalancer", "Value": "app/prod-alb/19a84b"}
            ],
            "Metrics": {
                "MemoryUtilization": "99.4%",
                "CPUUtilization": "82.1%",
                "ActiveConnections": "4,120",
                "FailingTasksCount": 6,
                "DesiredTasksCount": 8
            }
        },
        "log_traces": [
            f"{get_current_time_iso()} [ERROR] [checkout-api-worker-42-a7x9] Container runtime: FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory",
            f"{get_current_time_iso()} [ERROR] [checkout-api-worker-42-a7x9] Process exited with code 137 (SIGKILL - OOMKilled by Linux kernel cgroups)",
            f"{get_current_time_iso()} [WARN]  [ecs-agent] Task checkout-api:42 container 'app' died unexpectedly. ExitCode: 137, Reason: OutOfMemoryError",
            f"{get_current_time_iso()} [ERROR] [alb-ingress] 502 Bad Gateway while connecting to upstream 10.0.4.12:8080 (Connection refused)",
            f"{get_current_time_iso()} [INFO]  [checkout-api-worker-42-b9c1] Memory leak detected in /v2/checkout/session-cache: unmanaged buffer accumulation since commit e8f41c ('feat: in-memory cart snapshot caching')"
        ],
        "bedrock_root_cause": (
            "AWS Bedrock Automated Root Cause Analysis:\n"
            "• Immediate Cause: Container memory exhausted (99.4% utilization) causing Linux Kernel OOMKill (ExitCode 137).\n"
            "• Correlated Change: Introduced in deployment v2.4.1 (commit e8f41c 'feat: in-memory cart snapshot caching') at 18 minutes ago.\n"
            "• Remediating Action: Roll back ECS task definition from revision 42 to stable revision 41."
        ),
        "remediation_plan": {
            "action": "ecs_rollback",
            "service": "checkout-api",
            "cluster": "production-us-east-1",
            "target_revision": "checkout-api:41",
            "requires_confirmation": True,
            "safety_level": "DESTRUCTIVE_MUTATION"
        }
    },
    
    "payments_db_pool_exhausted": {
        "id": "INC-84921",
        "title": "Database Connection Pool Starvation",
        "service": "payment-gateway",
        "cluster": "production-us-east-1",
        "region": "us-east-1",
        "status": "ALARM",
        "severity": "CRITICAL (Sev-2)",
        "current_task_revision": "payment-gateway:89",
        "previous_task_revision": "payment-gateway:88",
        "deployment_id": "dep-991ab34",
        "deployment_version": "v1.12.0",
        "deployed_at": (datetime.now(timezone.utc) - timedelta(minutes=45)).isoformat(),
        "alarm": {
            "AlarmName": "PaymentGateway-DBPool-Exhausted",
            "AlarmDescription": "HikariCP / Connection Pool active connections = max (100)",
            "StateValue": "ALARM",
            "StateReason": "Active DB connections at 100/100 for > 3 minutes. Request queue full.",
            "MetricName": "DBPoolWaitTime",
            "Namespace": "Custom/Payments",
            "Metrics": {
                "MemoryUtilization": "45.2%",
                "CPUUtilization": "31.0%",
                "ActiveConnections": "100/100",
                "BlockedThreads": 182
            }
        },
        "log_traces": [
            f"{get_current_time_iso()} [ERROR] [payment-gateway-89-zk2] org.postgresql.util.PSQLException: Connection pool exhausted. Timeout waiting for available connection after 30000ms",
            f"{get_current_time_iso()} [ERROR] [payment-gateway-89-zk2] Stripe Webhook listener failing: 504 Gateway Timeout processing transaction txn_948194",
            f"{get_current_time_iso()} [WARN]  [db-monitor] Aurora PostgreSQL read-replica latency spike: long-running unindexed query from analytics reporter"
        ],
        "bedrock_root_cause": (
            "AWS Bedrock Automated Root Cause Analysis:\n"
            "• Immediate Cause: HikariCP connection pool starvation caused by unclosed transaction leaks in v1.12.0.\n"
            "• Impact: 182 payment processing threads blocked; 504 timeouts to upstream Stripe webhooks.\n"
            "• Remediating Action: Roll back payment-gateway to revision 88 or restart tasks with connection pool reset."
        ),
        "remediation_plan": {
            "action": "ecs_rollback",
            "service": "payment-gateway",
            "cluster": "production-us-east-1",
            "target_revision": "payment-gateway:88",
            "requires_confirmation": True,
            "safety_level": "DESTRUCTIVE_MUTATION"
        }
    }
}

