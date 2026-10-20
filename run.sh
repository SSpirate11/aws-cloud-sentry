#!/bin/bash
# ==============================================================================
# AWS CloudSentry — One-Click Development & Demo Launcher
# Launches the Python MCP Server (Port 8000) and the React Echo Simulator (Port 5173)
#
# Usage:
#   ./run.sh              # Standard launch (Mock fallback / Live AWS if creds exist)
#   ./run.sh --local-aws  # Launches with local AWS CloudWatch & Logs emulator ($0.00)
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "================================================================="
echo "🛡️  Starting AWS CloudSentry — Alexa+ Incident Commander"
echo "================================================================="

cd "$DIR/backend"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    venv/bin/pip install -r requirements.txt
    venv/bin/pip install mcp "moto[server]"
fi

source venv/bin/activate

# Optional: Launch local AWS emulator if --local-aws flag is passed
if [ "$1" == "--local-aws" ]; then
    echo "Starting Local AWS CloudWatch & Logs Emulator on port 4566 ($0.00 cost)..."
    moto_server -p 4566 >/dev/null 2>&1 &
    MOTO_PID=$!
    sleep 2
    echo "Seeding CloudWatch Alarms and Log streams..."
    LOCALSTACK_URL=http://127.0.0.1:4566 python3 seed_localstack.py
    export AWS_ENDPOINT_URL=http://127.0.0.1:4566
fi

# Clean up any stale processes holding port 8000 or 5173
fuser -k 8000/tcp >/dev/null 2>&1 || true
fuser -k 5173/tcp >/dev/null 2>&1 || true

# 1. Start Python MCP Backend
echo "[1/2] Launching Python MCP Server on http://localhost:8000..."
./venv/bin/uvicorn server:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

trap "echo 'Shutting down CloudSentry...'; kill $BACKEND_PID $MOTO_PID 2>/dev/null; exit" SIGINT SIGTERM EXIT

# 2. Start Frontend Vite Simulator
echo "[2/2] Launching Alexa+ Echo Simulator on http://localhost:5173..."
cd "$DIR/frontend"

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

echo ""
echo "✨ CloudSentry is LIVE!"
echo "👉 Open http://localhost:5173 in Google Chrome or Microsoft Edge"
echo "👉 MCP Streamable HTTP Endpoint: http://localhost:8000/mcp"
if [ "$1" == "--local-aws" ]; then
    echo "👉 Local AWS Endpoint: http://localhost:4566 (CloudWatch & Logs Connected)"
fi
echo ""

npm run dev
