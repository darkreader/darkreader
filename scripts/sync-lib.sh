#!/usr/bin/env zsh
# Shared helpers for darkreader sync-via-worktree workflow.
set -euo pipefail

sync_repo_root() {
    git rev-parse --show-toplevel
}

# Main checkout root — works from the primary worktree or a linked sync worktree.
sync_main_repo_from_context() {
    local root
    root="$(sync_repo_root)"
    if [[ "$root" == *"/.sync-worktrees/"* ]]; then
        root="${root%%/.sync-worktrees/*}"
    fi
    printf '%s' "$root"
}

sync_worktree_root() {
    local root="${1:-$(sync_main_repo_from_context)}"
    printf '%s/.sync-worktrees' "$root"
}

sync_marker_path() {
    printf '%s/.sync-verify-marker' "$(sync_worktree_root)"
}

sync_meta_path() {
    printf '%s/.sync-meta' "$(sync_worktree_root)"
}

sync_worktree_path_for_branch() {
    local branch="$1"
    local root="${2:-$(sync_main_repo_from_context)}"
    local safe="${branch//\//--}"
    printf '%s/%s' "$(sync_worktree_root "$root")" "$safe"
}

# Git cannot check out the same branch in two worktrees; sync uses a temp branch.
sync_worktree_branch_for() {
    local branch="$1"
    local safe="${branch//\//--}"
    printf 'sync-wt/%s' "$safe"
}

sync_is_rebase_in_progress() {
    local git_dir
    git_dir="$(git rev-parse --absolute-git-dir)"
    [[ -d "$git_dir/rebase-merge" || -d "$git_dir/rebase-apply" ]]
}

sync_ensure_state_dir() {
    mkdir -p "$(sync_worktree_root "$1")"
}

sync_write_meta() {
    local main_repo="$1"
    local branch="$2"
    local worktree_path="$3"
    local pre_sync_head="$4"
    local sync_wt_branch="$5"
    sync_ensure_state_dir "$main_repo"
    cat >"$(sync_worktree_root "$main_repo")/.sync-meta" <<EOF
MAIN_REPO='$main_repo'
BRANCH='$branch'
WORKTREE_PATH='$worktree_path'
PRE_SYNC_HEAD='$pre_sync_head'
SYNC_WORKTREE_BRANCH='$sync_wt_branch'
EOF
}

sync_read_meta() {
    # shellcheck disable=SC1090
    source "$(sync_meta_path)"
}

sync_enable_verify_hook() {
    sync_ensure_state_dir "$(sync_main_repo_from_context)"
    touch "$(sync_marker_path)"
}

sync_disable_verify_hook() {
    local root
    root="$(sync_main_repo_from_context)"
    rm -f "$(sync_worktree_root "$root")/.sync-verify-marker" "$(sync_worktree_root "$root")/.sync-meta"
}

sync_ensure_hooks_installed() {
    local root hooks_path
    root="$(sync_main_repo_from_context)"
    hooks_path="$(git -C "$root" config --get core.hooksPath || true)"
    if [[ "$hooks_path" != "scripts/git-hooks" ]]; then
        git -C "$root" config core.hooksPath scripts/git-hooks
    fi
    chmod +x "$root/scripts/git-hooks/post-rewrite"
    chmod +x "$root/scripts/sync-finalize.sh"
    chmod +x "$root/scripts/sync-via-worktree.sh"
    chmod +x "$root/scripts/sync-abort.sh"
    chmod +x "$root/scripts/install-git-hooks.sh"
    chmod +x "$root/scripts/with-node.sh"
}

sync_delete_worktree_branch() {
    local main_repo="$1"
    local sync_wt_branch="$2"
    if git -C "$main_repo" show-ref --verify --quiet "refs/heads/$sync_wt_branch"; then
        git -C "$main_repo" branch -D "$sync_wt_branch" 2>/dev/null \
            || git -C "$main_repo" branch -d "$sync_wt_branch" 2>/dev/null \
            || true
    fi
}

sync_remove_worktree_at() {
    local worktree_path="$1"
    if [[ -d "$worktree_path" ]]; then
        if git worktree list --porcelain | grep -q "^worktree $worktree_path$"; then
            git worktree remove --force "$worktree_path"
        else
            rm -rf "$worktree_path"
        fi
    fi
}

sync_teardown_sync_worktree() {
    local main_repo="$1"
    local worktree_path="$2"
    local sync_wt_branch="$3"
    sync_remove_worktree_at "$worktree_path"
    sync_delete_worktree_branch "$main_repo" "$sync_wt_branch"
}

sync_log() {
    printf '%s\n' "$*"
}

sync_log_error() {
    printf '🚨 %s\n' "$*" >&2
}
