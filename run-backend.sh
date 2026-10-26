#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR/backend"

# Activate virtualenv if present
if [ -d ".venv" ]; then
  source .venv/bin/activate
elif [ -d "../venv" ]; then
  source ../venv/bin/activate
fi

export DISABLE_SQLALCHEMY_CEXT="1"
echo "Starting AICTE FastAPI Backend on http://localhost:8000..."
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
