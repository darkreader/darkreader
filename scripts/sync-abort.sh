#!/usr/bin/env zsh
# Abandon an in-progress sync worktree and restore the pre-sync branch tip.
set -euo pipefail

script_dir="$(cd "$(dirname "${(%):-%x}")" && pwd)"
# shellcheck disable=SC1091
source "$script_dir/sync-lib.sh"

main_repo="$(sync_main_repo_from_context)"
meta_path="$(sync_worktree_root "$main_repo")/.sync-meta"

if [[ ! -f "$meta_path" ]]; then
  branch="$(git -C "$main_repo" branch --show-current)"
  worktree_path="$(sync_worktree_path_for_branch "$branch" "$main_repo")"
  if [[ -d "$worktree_path" ]]; then
    sync_wt_branch="$(sync_worktree_branch_for "$branch")"
    sync_teardown_sync_worktree "$main_repo" "$worktree_path" "$sync_wt_branch"
    sync_log "Removed stale sync worktree at $worktree_path"
    exit 0
  fi
  sync_log "No sync in progress."
  exit 0
fi

# shellcheck disable=SC1090
source "$meta_path"

if sync_is_rebase_in_progress; then
  git -C "$WORKTREE_PATH" rebase --abort 2>/dev/null || true
fi

git -C "$MAIN_REPO" reset --hard "$PRE_SYNC_HEAD"
sync_teardown_sync_worktree "$MAIN_REPO" "$WORKTREE_PATH" "${SYNC_WORKTREE_BRANCH:-$(sync_worktree_branch_for "$BRANCH")}"
sync_disable_verify_hook
sync_log "✅ Sync aborted; $BRANCH reset to $PRE_SYNC_HEAD"
