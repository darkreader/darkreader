#!/usr/bin/env zsh
set -euo pipefail

root="$(cd "$(dirname "${(%):-%x}")/.." && pwd)"
git -C "$root" config core.hooksPath scripts/git-hooks
chmod +x "$root/scripts/git-hooks/post-rewrite"
chmod +x "$root/scripts/sync-finalize.sh"
chmod +x "$root/scripts/sync-via-worktree.sh"
chmod +x "$root/scripts/sync-abort.sh"
chmod +x "$root/scripts/with-node.sh"
echo "✅ Git hooks installed (core.hooksPath=scripts/git-hooks)"
