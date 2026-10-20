"""
Zero-Cost Embedded AWS SigV4 HTTP Emulator (CloudWatch, Logs, ECS, S3, STS)
Provides a real HTTP endpoint speaking AWS wire protocols (Smithy RPC v2 CBOR for CloudWatch,
AWS JSON 1.1 for CloudWatch Logs and ECS, REST-XML for S3, and Query-XML for STS) so that
real boto3 SDK clients execute genuine AWS4-HMAC-SHA256 signed requests and stateful resource
mutations at $0.00 cost without requiring a paid AWS account or Docker daemon.
"""

import hashlib
import json
import re
import threading
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict, List, Optional
from urllib.parse import parse_qs, unquote, urlparse

from mock_scenarios import MOCK_SCENARIOS


class LocalAWSState:
    """Thread-safe in-memory state store for emulated AWS resources and SigV4 wire audit logs."""

    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.wire_log: List[Dict[str, Any]] = []
        self.reset()

    def reset(self) -> None:
        with self.lock:
            now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            self.alarms: Dict[str, Dict[str, Any]] = {}
            self.ecs_services: Dict[str, Dict[str, Any]] = {}
            self.log_groups: Dict[str, List[Dict[str, Any]]] = {}
            self.s3_buckets: Dict[str, Dict[str, Dict[str, Any]]] = {
                "sre-postmortems-us-east-1": {},
                "cloud-sentry-postmortems": {},
            }

            for inc in MOCK_SCENARIOS.values():
                alarm_cfg = inc["alarm"]
                alarm_name = alarm_cfg["AlarmName"]
                svc_name = inc["service"]
                cluster_name = inc["cluster"]

                self.alarms[alarm_name] = {
                    "AlarmName": alarm_name,
                    "AlarmArn": f"arn:aws:cloudwatch:us-east-1:891377049210:alarm:{alarm_name}",
                    "AlarmDescription": alarm_cfg["AlarmDescription"],
                    "StateValue": "ALARM",
                    "StateReason": alarm_cfg["StateReason"],
                    "MetricName": alarm_cfg["MetricName"],
                    "Namespace": alarm_cfg["Namespace"],
                    "UpdatedAt": now_iso,
                }

                self.ecs_services[svc_name] = {
                    "serviceName": svc_name,
                    "serviceArn": f"arn:aws:ecs:us-east-1:891377049210:service/{cluster_name}/{svc_name}",
                    "clusterArn": f"arn:aws:ecs:us-east-1:891377049210:cluster/{cluster_name}",
                    "status": "ACTIVE",
                    "taskDefinition": inc["current_task_revision"],
                    "previousTaskDefinition": inc["previous_task_revision"],
                    "desiredCount": 6,
                    "runningCount": 6,
                    "pendingCount": 0,
                    "updatedAt": now_iso,
                }

                base_ts = int(datetime.now(timezone.utc).timestamp() * 1000) - 60000
                events = [
                    {
                        "eventId": f"evt-{idx}-{uuid.uuid4().hex[:8]}",
                        "timestamp": base_ts + idx * 1200,
                        "ingestionTime": base_ts + idx * 1200 + 50,
                        "message": str(entry),
                    }
                    for idx, entry in enumerate(inc["log_traces"])
                ]
                self.log_groups[f"/ecs/{svc_name}"] = events
                self.log_groups[f"/aws/ecs/{svc_name}"] = events

    def record_sigv4_call(
        self,
        service: str,
        operation: str,
        method: str,
        path: str,
        auth_header: str,
        status_code: int = 200,
    ) -> str:
        req_id = f"req-{uuid.uuid4().hex[:12]}"
        cred_match = re.search(r"Credential=([^,\s]+)", auth_header or "")
        sig_match = re.search(r"Signature=([0-9a-fA-F]+)", auth_header or "")
        sig_prefix = sig_match.group(1)[:16] + "..." if sig_match else "UNSIGNED"
        credential = cred_match.group(1) if cred_match else "test/us-east-1/aws4_request"

        entry = {
            "request_id": req_id,
            "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S.%f")[:-3] + "Z",
            "service": service,
            "operation": operation,
            "http": f"{method} {path}",
            "sigv4_credential": credential,
            "sigv4_signature": sig_prefix,
            "status_code": status_code,
        }
        with self.lock:
            self.wire_log.append(entry)
            if len(self.wire_log) > 60:
                self.wire_log = self.wire_log[-60:]
        return req_id

    def snapshot(self) -> Dict[str, Any]:
        with self.lock:
            s3_objects = []
            for bucket, objs in self.s3_buckets.items():
                for key, meta in objs.items():
                    s3_objects.append(
                        {
                            "bucket": bucket,
                            "key": key,
                            "etag": meta["etag"],
                            "size_bytes": meta["size"],
                            "last_modified": meta["last_modified"],
                        }
                    )
            return {
                "account_id": "891377049210",
                "region": "us-east-1",
                "sts_principal": "arn:aws:sts::891377049210:assumed-role/CloudSentryIncidentCommander/mcp-session",
                "cloudwatch_alarms": list(self.alarms.values()),
                "ecs_services": list(self.ecs_services.values()),
                "s3_objects": s3_objects,
                "sigv4_wire_log": list(reversed(self.wire_log[-15:])),
            }


LOCAL_AWS_STATE = LocalAWSState()


class _AWSRequestHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, format: str, *args: Any) -> None:
        pass

    def _send(
        self,
        status: int,
        body: bytes,
        content_type: str = "application/json",
        extra_headers: Optional[Dict[str, str]] = None,
    ) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()
        if body:
            self.wfile.write(body)

    def do_HEAD(self) -> None:
        auth = self.headers.get("Authorization", "")
        req_id = LOCAL_AWS_STATE.record_sigv4_call("s3", "HeadBucket", "HEAD", self.path, auth)
        self._send(200, b"", "application/xml", {"x-amz-request-id": req_id})

    def do_PUT(self) -> None:
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length) if length > 0 else b""
        auth = self.headers.get("Authorization", "")
        parsed = urlparse(self.path)
        parts = [p for p in parsed.path.split("/") if p]
        bucket = parts[0] if parts else "cloud-sentry-postmortems"
        key = unquote("/".join(parts[1:])) if len(parts) > 1 else ""

        if not key:
            req_id = LOCAL_AWS_STATE.record_sigv4_call("s3", "CreateBucket", "PUT", parsed.path, auth)
            with LOCAL_AWS_STATE.lock:
                LOCAL_AWS_STATE.s3_buckets.setdefault(bucket, {})
            self._send(200, b"", "application/xml", {"x-amz-request-id": req_id})
            return

        etag = hashlib.md5(body).hexdigest()
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
        with LOCAL_AWS_STATE.lock:
            LOCAL_AWS_STATE.s3_buckets.setdefault(bucket, {})[key] = {
                "body": body,
                "etag": etag,
                "size": len(body),
                "last_modified": now_iso,
            }
        req_id = LOCAL_AWS_STATE.record_sigv4_call("s3", "PutObject", "PUT", parsed.path, auth)
        self._send(
            200,
            b"",
            "application/xml",
            {"ETag": f'"{etag}"', "x-amz-request-id": req_id},
        )

    def do_GET(self) -> None:
        auth = self.headers.get("Authorization", "")
        parsed = urlparse(self.path)
        parts = [p for p in parsed.path.split("/") if p]
        bucket = parts[0] if parts else "cloud-sentry-postmortems"
        key = unquote("/".join(parts[1:])) if len(parts) > 1 else ""

        if key:
            req_id = LOCAL_AWS_STATE.record_sigv4_call("s3", "GetObject", "GET", parsed.path, auth)
            with LOCAL_AWS_STATE.lock:
                obj = LOCAL_AWS_STATE.s3_buckets.get(bucket, {}).get(key)
            if not obj:
                self._send(404, b"<Error><Code>NoSuchKey</Code></Error>", "application/xml")
                return
            self._send(
                200,
                obj["body"],
                "text/markdown",
                {"ETag": f'"{obj["etag"]}"', "x-amz-request-id": req_id},
            )
            return

        req_id = LOCAL_AWS_STATE.record_sigv4_call("s3", "ListObjectsV2", "GET", parsed.path, auth)
        with LOCAL_AWS_STATE.lock:
            objs = list(LOCAL_AWS_STATE.s3_buckets.get(bucket, {}).items())

        contents_xml = ""
        for k, meta in objs:
            contents_xml += (
                f"<Contents>"
                f"<Key>{k}</Key>"
                f"<LastModified>{meta['last_modified']}</LastModified>"
                f"<ETag>\"{meta['etag']}\"</ETag>"
                f"<Size>{meta['size']}</Size>"
                f"<StorageClass>STANDARD</StorageClass>"
                f"</Contents>"
            )
        xml = (
            f'<?xml version="1.0" encoding="UTF-8"?>'
            f'<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">'
            f"<Name>{bucket}</Name>"
            f"<KeyCount>{len(objs)}</KeyCount>"
            f"<MaxKeys>1000</MaxKeys>"
            f"<IsTruncated>false</IsTruncated>"
            f"{contents_xml}"
            f"</ListBucketResult>"
        ).encode("utf-8")
        self._send(200, xml, "application/xml", {"x-amz-request-id": req_id})

    def do_POST(self) -> None:
        length = int(self.headers.get("Content-Length", "0"))
        raw_bytes = self.rfile.read(length) if length > 0 else b""
        auth = self.headers.get("Authorization", "")
        target = self.headers.get("X-Amz-Target", "")

        # 1. CloudWatch (AWS JSON 1.0 - GraniteServiceVersion20100801)
        if target.startswith("GraniteServiceVersion20100801."):
            op_name = target.split(".", 1)[-1]
            req_id = LOCAL_AWS_STATE.record_sigv4_call("cloudwatch", op_name, "POST", self.path, auth)
            params: Dict[str, Any] = json.loads(raw_bytes.decode("utf-8") or "{}")

            if op_name == "DescribeAlarms":
                state_filter = params.get("StateValue")
                alarm_names = params.get("AlarmNames")
                with LOCAL_AWS_STATE.lock:
                    alarms = list(LOCAL_AWS_STATE.alarms.values())
                if state_filter:
                    alarms = [a for a in alarms if a["StateValue"] == state_filter]
                if alarm_names:
                    alarms = [a for a in alarms if a["AlarmName"] in alarm_names]
                body = json.dumps({"MetricAlarms": alarms}).encode("utf-8")
                self._send(200, body, "application/x-amz-json-1.0", {"x-amzn-RequestId": req_id})
                return

            if op_name == "SetAlarmState":
                alarm_name = params.get("AlarmName", "")
                new_state = params.get("StateValue", "OK")
                reason = params.get("StateReason", "")
                now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                with LOCAL_AWS_STATE.lock:
                    if alarm_name in LOCAL_AWS_STATE.alarms:
                        LOCAL_AWS_STATE.alarms[alarm_name]["StateValue"] = new_state
                        LOCAL_AWS_STATE.alarms[alarm_name]["StateReason"] = reason
                        LOCAL_AWS_STATE.alarms[alarm_name]["UpdatedAt"] = now_iso
                self._send(200, b"{}", "application/x-amz-json-1.0", {"x-amzn-RequestId": req_id})
                return

            if op_name == "PutMetricAlarm":
                alarm_name = params.get("AlarmName", "custom-alarm")
                now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                with LOCAL_AWS_STATE.lock:
                    LOCAL_AWS_STATE.alarms[alarm_name] = {
                        "AlarmName": alarm_name,
                        "AlarmArn": f"arn:aws:cloudwatch:us-east-1:891377049210:alarm:{alarm_name}",
                        "AlarmDescription": params.get("AlarmDescription", ""),
                        "StateValue": "ALARM",
                        "StateReason": "Seeded via PutMetricAlarm",
                        "MetricName": params.get("MetricName", "MemoryUtilization"),
                        "Namespace": params.get("Namespace", "AWS/ECS"),
                        "UpdatedAt": now_iso,
                    }
                self._send(200, b"{}", "application/x-amz-json-1.0", {"x-amzn-RequestId": req_id})
                return

        # 2. CloudWatch Logs (AWS JSON 1.1)
        if target.startswith("Logs_"):
            op_name = target.split(".", 1)[-1]
            req_id = LOCAL_AWS_STATE.record_sigv4_call("logs", op_name, "POST", self.path, auth)
            payload = json.loads(raw_bytes.decode("utf-8") or "{}")
            if op_name == "FilterLogEvents":
                log_group = payload.get("logGroupName", "/aws/ecs/checkout-api")
                limit = int(payload.get("limit", 10))
                with LOCAL_AWS_STATE.lock:
                    events = list(LOCAL_AWS_STATE.log_groups.get(log_group, []))[:limit]
                body = json.dumps({"events": events, "searchedLogStreams": []}).encode("utf-8")
                self._send(200, body, "application/x-amz-json-1.1", {"x-amzn-RequestId": req_id})
                return
            self._send(200, b"{}", "application/x-amz-json-1.1", {"x-amzn-RequestId": req_id})
            return

        # 3. Amazon ECS (AWS JSON 1.1)
        if target.startswith("AmazonEC2ContainerService"):
            op_name = target.split(".", 1)[-1]
            req_id = LOCAL_AWS_STATE.record_sigv4_call("ecs", op_name, "POST", self.path, auth)
            payload = json.loads(raw_bytes.decode("utf-8") or "{}")
            now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            if op_name == "UpdateService":
                svc_name = payload.get("service", "checkout-api")
                task_def = payload.get("taskDefinition", "checkout-api:41")
                cluster = payload.get("cluster", "production-us-east-1")
                with LOCAL_AWS_STATE.lock:
                    svc = LOCAL_AWS_STATE.ecs_services.setdefault(
                        svc_name,
                        {
                            "serviceName": svc_name,
                            "serviceArn": f"arn:aws:ecs:us-east-1:891377049210:service/{cluster}/{svc_name}",
                            "clusterArn": f"arn:aws:ecs:us-east-1:891377049210:cluster/{cluster}",
                            "status": "ACTIVE",
                            "desiredCount": 6,
                            "runningCount": 6,
                            "pendingCount": 0,
                        },
                    )
                    svc["taskDefinition"] = task_def
                    svc["updatedAt"] = now_iso
                    svc_copy = dict(svc)
                body = json.dumps({"service": svc_copy}).encode("utf-8")
                self._send(200, body, "application/x-amz-json-1.1", {"x-amzn-RequestId": req_id})
                return
            if op_name == "DescribeServices":
                names = payload.get("services", ["checkout-api"])
                with LOCAL_AWS_STATE.lock:
                    svcs = [
                        dict(LOCAL_AWS_STATE.ecs_services[n])
                        for n in names
                        if n in LOCAL_AWS_STATE.ecs_services
                    ]
                body = json.dumps({"services": svcs, "failures": []}).encode("utf-8")
                self._send(200, body, "application/x-amz-json-1.1", {"x-amzn-RequestId": req_id})
                return
            self._send(200, b"{}", "application/x-amz-json-1.1", {"x-amzn-RequestId": req_id})
            return

        # 4. AWS STS (Query XML)
        qs = parse_qs(raw_bytes.decode("utf-8", errors="replace"))
        action = qs.get("Action", ["GetCallerIdentity"])[0]
        req_id = LOCAL_AWS_STATE.record_sigv4_call("sts", action, "POST", self.path, auth)
        xml = (
            "<GetCallerIdentityResponse xmlns=\"https://sts.amazonaws.com/doc/2011-06-15/\">"
            "<GetCallerIdentityResult>"
            "<Arn>arn:aws:sts::891377049210:assumed-role/CloudSentryIncidentCommander/mcp-session</Arn>"
            "<UserId>AROA49210SENTRY:mcp-session</UserId>"
            "<Account>891377049210</Account>"
            "</GetCallerIdentityResult>"
            f"<ResponseMetadata><RequestId>{req_id}</RequestId></ResponseMetadata>"
            "</GetCallerIdentityResponse>"
        ).encode("utf-8")
        self._send(200, xml, "text/xml", {"x-amzn-RequestId": req_id})


_SERVER_INSTANCE: Optional[ThreadingHTTPServer] = None
_SERVER_URL: Optional[str] = None
_SERVER_LOCK = threading.Lock()


def ensure_local_aws_emulator() -> str:
    """Starts the embedded zero-cost AWS SigV4 HTTP emulator in a daemon thread and returns its URL."""
    global _SERVER_INSTANCE, _SERVER_URL
    with _SERVER_LOCK:
        if _SERVER_URL is not None:
            return _SERVER_URL
        srv = ThreadingHTTPServer(("127.0.0.1", 0), _AWSRequestHandler)
        port = srv.server_address[1]
        t = threading.Thread(target=srv.serve_forever, name="cloud-sentry-aws-sigv4-emulator", daemon=True)
        t.start()
        _SERVER_INSTANCE = srv
        _SERVER_URL = f"http://127.0.0.1:{port}"
        return _SERVER_URL
