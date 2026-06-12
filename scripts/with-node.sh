#!/usr/bin/env zsh
set -euo pipefail
source "$(dirname "${(%):-%x}")/activate-node.sh"
exec "$@"
