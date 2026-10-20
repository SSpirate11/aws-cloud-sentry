"""
CloudSentry - LocalStack Seeder Script
Uses standard boto3 to create real CloudWatch Alarms and push real
container stack traces to LocalStack running on http://localhost:4566.
"""

import time
import boto3
from datetime import datetime, timezone

LOCALSTACK_URL = "http://localhost:4566"

def seed():
    print(f"Connecting boto3 to LocalStack at {LOCALSTACK_URL}...")
    
    # Configure boto3 clients targeting LocalStack
    cw = boto3.client(
        "cloudwatch",
        endpoint_url=LOCALSTACK_URL,
        region_name="us-east-1",
        aws_access_key_id="test",
        aws_secret_access_key="test"
    )
    logs = boto3.client(
        "logs",
        endpoint_url=LOCALSTACK_URL,
        region_name="us-east-1",
        aws_access_key_id="test",
        aws_secret_access_key="test"
    )
    s3 = boto3.client(
        "s3",
        endpoint_url=LOCALSTACK_URL,
        region_name="us-east-1",
        aws_access_key_id="test",
        aws_secret_access_key="test"
    )

    # 0. Create S3 Bucket for Post-Mortem Archival
    bucket_name = "sre-postmortems-us-east-1"
    try:
        s3.create_bucket(Bucket=bucket_name)
        print(f"✓ Created S3 Bucket: s3://{bucket_name}")
    except Exception as e:
        print(f"• S3 Bucket {bucket_name} ready ({e})")

    # 1. Create CloudWatch Log Group
    log_group = "/ecs/checkout-api"
    log_stream = "checkout-api-task-42"

    try:
        logs.create_log_group(logGroupName=log_group)
        print(f"✓ Created Log Group: {log_group}")
    except logs.exceptions.ResourceAlreadyExistsException:
        print(f"• Log Group {log_group} already exists.")

    try:
        logs.create_log_stream(logGroupName=log_group, logStreamName=log_stream)
        print(f"✓ Created Log Stream: {log_stream}")
    except logs.exceptions.ResourceAlreadyExistsException:
        print(f"• Log Stream {log_stream} already exists.")

    # 2. Put Realistic Error Log Events
    now_ms = int(time.time() * 1000)
    log_events = [
        {"timestamp": now_ms - 4000, "message": f"{datetime.now(timezone.utc).isoformat()} [INFO]  [checkout-api-worker-42] Deployment v2.4.1 initialized from commit e8f41c"},
        {"timestamp": now_ms - 3000, "message": f"{datetime.now(timezone.utc).isoformat()} [WARN]  [checkout-api-worker-42] Rapid memory growth detected in /v2/checkout/session-cache: unmanaged buffer accumulation"},
        {"timestamp": now_ms - 2000, "message": f"{datetime.now(timezone.utc).isoformat()} [ERROR] [checkout-api-worker-42] Container runtime: FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory"},
        {"timestamp": now_ms - 1000, "message": f"{datetime.now(timezone.utc).isoformat()} [ERROR] [checkout-api-worker-42] Process exited with code 137 (SIGKILL - OOMKilled by Linux kernel cgroups)"},
        {"timestamp": now_ms, "message": f"{datetime.now(timezone.utc).isoformat()} [ERROR] [alb-ingress] 502 Bad Gateway upstream 10.0.4.12:8080 (Connection refused)"}
    ]

    try:
        logs.put_log_events(
            logGroupName=log_group,
            logStreamName=log_stream,
            logEvents=log_events
        )
        print(f"✓ Ingested {len(log_events)} stack trace events into {log_group}")
    except Exception as e:
        print(f"• Ingest log events notice: {e}")

    # 3. Create CloudWatch Metric Alarm
    alarm_name = "TargetResponseTime-checkout-api-High"
    print(f"Creating CloudWatch Metric Alarm: {alarm_name}...")
    
    cw.put_metric_alarm(
        AlarmName=alarm_name,
        AlarmDescription="Triggers when 5xx errors exceed 5% and p95 latency exceeds 2.5s",
        ActionsEnabled=True,
        MetricName="HTTPCode_Target_5XX_Count",
        Namespace="AWS/ApplicationELB",
        Statistic="Sum",
        Dimensions=[
            {"Name": "TargetGroup", "Value": "targetgroup/prod-checkout/88219fa"},
            {"Name": "LoadBalancer", "Value": "app/prod-alb/19a84b"}
        ],
        Period=60,
        EvaluationPeriods=2,
        Threshold=5.0,
        ComparisonOperator="GreaterThanThreshold"
    )

    # Force Alarm State to ALARM
    cw.set_alarm_state(
        AlarmName=alarm_name,
        StateValue="ALARM",
        StateReason="Threshold Breached: 5xx Error Rate = 14.8% (Threshold: 5.0%), p95 Latency = 4,210ms (Threshold: 2,500ms)"
    )
    print(f"✓ Alarm state set to ALARM successfully!")

    print("\n=======================================================")
    print("✨ LOCALSTACK SEEDING COMPLETE!")
    print(f"Targeting: {LOCALSTACK_URL}")
    print("Now run CloudSentry with: AWS_ENDPOINT_URL=http://localhost:4566")
    print("=======================================================")

if __name__ == "__main__":
    seed()

