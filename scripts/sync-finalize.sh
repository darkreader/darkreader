#!/usr/bin/env zsh
# Finalize or tear down a sync worktree after verify passes/fails.
set -euo pipefail

mode="${1:-}"
if [[ "$mode" != "success" && "$mode" != "fail" ]]; then
    echo "usage: sync-finalize.sh <success|fail>" >&2
    exit 1
fi

script_dir="$(cd "$(dirname "${(%):-%x}")" && pwd)"
# shellcheck disable=SC1091
source "$script_dir/sync-lib.sh"

meta_path="$(sync_meta_path)"
if [[ ! -f "$meta_path" ]]; then
    sync_log_error "Missing sync metadata at $meta_path"
    exit 1
fi

# shellcheck disable=SC1090
source "$meta_path"

case "$mode" in
    success)
        if [[ ! -d "$WORKTREE_PATH" ]]; then
            sync_log_error "Sync worktree not found: $WORKTREE_PATH"
            exit 1
        fi
        new_head="$(git -C "$WORKTREE_PATH" rev-parse HEAD)"
        git -C "$MAIN_REPO" branch -f "$BRANCH" "$new_head"
        if [[ "$(git -C "$MAIN_REPO" branch --show-current)" == "$BRANCH" ]]; then
            git -C "$MAIN_REPO" reset --hard "$new_head"
        fi
        sync_teardown_sync_worktree "$MAIN_REPO" "$WORKTREE_PATH" "$SYNC_WORKTREE_BRANCH"
        sync_disable_verify_hook
        sync_log "✅ Sync complete: $BRANCH is now at $new_head"
        ;;
    fail)
        sync_teardown_sync_worktree "$MAIN_REPO" "$WORKTREE_PATH" "$SYNC_WORKTREE_BRANCH"
        sync_disable_verify_hook
        sync_log_error "Sync aborted: $BRANCH left at pre-sync commit in the main worktree."
        sync_log "Resolve upstream conflicts locally or run 'just sync' again when ready."
        exit 1
        ;;
esac
