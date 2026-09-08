#!/bin/sh
set -eu

MARKER="/home/node/.n8n/.kinfolk-workflows-imported"

if [ ! -f "$MARKER" ]; then
  echo "[kinfolk] Importing versioned n8n workflows..."
  n8n import:workflow --separate --input=/opt/kinfolk/workflows
  touch "$MARKER"
  echo "[kinfolk] Workflow bootstrap complete."
fi

exec n8n start
