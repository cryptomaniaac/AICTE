#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR/frontend"

echo "Starting AICTE Frontend Dev Server on http://localhost:5173..."
npm run dev
