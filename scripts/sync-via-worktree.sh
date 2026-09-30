#!/usr/bin/env zsh
# Safe upstream sync: isolated worktree + post-rebase verify hook.
set -euo pipefail

script_dir="$(cd "$(dirname "${(%):-%x}")" && pwd)"
# shellcheck disable=SC1091
source "$script_dir/sync-lib.sh"

main_repo="$(sync_repo_root)"
branch="$(git -C "$main_repo" branch --show-current)"
worktree_path="$(sync_worktree_path_for_branch "$branch" "$main_repo")"
sync_wt_branch="$(sync_worktree_branch_for "$branch")"

if [[ -z "$branch" ]]; then
    sync_log_error "Detached HEAD — checkout a branch before running sync."
    exit 1
fi

if [[ -n "$(git -C "$main_repo" status --porcelain)" ]]; then
    sync_log_error "Working tree is not clean. Commit, stash, or discard changes first."
    git -C "$main_repo" status --short
    exit 1
fi

sync_ensure_hooks_installed

if [[ -f "$(sync_worktree_root "$main_repo")/.sync-verify-marker" ]]; then
    sync_log_error "A sync is already in progress (verify marker present)."
    sync_log "Finish conflict resolution in the sync worktree, or run:"
    sync_log "  $script_dir/sync-abort.sh"
    exit 1
fi

mkdir -p "$(sync_worktree_root "$main_repo")"
sync_teardown_sync_worktree "$main_repo" "$worktree_path" "$sync_wt_branch"

pre_sync_head="$(git -C "$main_repo" rev-parse HEAD)"
sync_log "🔍 Creating sync worktree at $worktree_path (branch $sync_wt_branch)"
git -C "$main_repo" worktree add -b "$sync_wt_branch" "$worktree_path" "$pre_sync_head"

cd "$worktree_path"
sync_write_meta "$main_repo" "$branch" "$worktree_path" "$pre_sync_head" "$sync_wt_branch"
sync_enable_verify_hook

sync_log "🔍 Syncing $branch onto main inside worktree..."
set +e
just --justfile "$main_repo/justfile" --working-directory "$worktree_path" sync-internal
sync_status=$?
set -e

if [[ "$sync_status" -eq 0 ]]; then
    # post-rewrite hook runs verify and calls sync-finalize.sh on success.
    if [[ -f "$(sync_marker_path)" ]]; then
        sync_log_error "Rebase finished but verify hook did not run — running verify manually."
        if just --justfile "$main_repo/justfile" --working-directory "$worktree_path" verify; then
            "$script_dir/sync-finalize.sh" success
        else
            git reset --hard ORIG_HEAD
            sync_disable_verify_hook
            "$script_dir/sync-finalize.sh" fail
            exit 1
        fi
    fi
    exit 0
fi

if sync_is_rebase_in_progress; then
    sync_log_error "Rebase paused with conflicts."
    sync_log "Resolve conflicts in the sync worktree, then run:"
    sync_log "  cd $worktree_path"
    sync_log "  git rebase --continue"
    sync_log ""
    sync_log "The post-rewrite hook will run just verify when the rebase completes."
    sync_log "On verify failure the rebase is rolled back and the worktree is removed."
    sync_log ""
    sync_log "To abandon: $script_dir/sync-abort.sh"
    exit 1
fi

# Rebase failed without leaving conflict state (hook rollback or hard error).
if [[ "$(git rev-parse HEAD)" == "$pre_sync_head" ]]; then
    sync_disable_verify_hook
    sync_teardown_sync_worktree "$main_repo" "$worktree_path" "$sync_wt_branch"
    sync_log_error "Sync failed and was rolled back to $pre_sync_head."
    exit 1
fi

sync_disable_verify_hook
sync_teardown_sync_worktree "$main_repo" "$worktree_path" "$sync_wt_branch"
sync_log_error "Sync failed unexpectedly (exit $sync_status)."
exit 1
