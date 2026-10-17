#!/bin/bash
# ==============================================================================
# AWS CloudSentry — One-Click Development & Demo Launcher
# Launches the Python MCP Server (Port 8000) and the React Echo Simulator (Port 5173)
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "================================================================="
echo "🛡️  Starting AWS CloudSentry — Alexa+ Incident Commander"
echo "================================================================="

# 1. Start Python MCP Backend
echo "[1/2] Launching Python MCP Server on http://localhost:8000..."
cd "$DIR/backend"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    venv/bin/pip install -r requirements.txt
    venv/bin/pip install mcp
fi

source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

trap "echo 'Shutting down CloudSentry...'; kill $BACKEND_PID 2>/dev/null; exit" SIGINT SIGTERM EXIT

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
echo ""

npm run dev
