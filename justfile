#!/usr/bin/env just --justfile

# Notes:
# - Recipes annotated with [private] (or starting with _) aren't listed or callable from the CLI
# - Use the [script] annotation to allow multi-line scripts run by the shell set at the beginning
# - The @ toggles the printing of the command to the CLI before running it. [script] disables this by default
# - default recipe: If only `just` is run, then list the options in the order set in this file, not alphabetically

set shell := ["zsh", "-uc"]
set dotenv-filename := "just.env"
set dotenv-load
set script-interpreter := ["zsh", "-u"]

# ------ Variables ------

repo_root := justfile_directory()
upstream_remote := "origin"
upstream_branch := "main"
node_version := trim(`cat .nvmrc`)
chrome_debug_dir := repo_root / "build/debug/chrome-mv3"
firefox_debug_dir := repo_root / "build/debug/firefox"
privacy_script := repo_root / "scripts/check-privacy-invariants.sh"
activate_node_script := repo_root / "scripts/activate-node.sh"
required_deps := env_var_or_default("REQUIRED_DEPS", "node npm")
required_envs := env_var_or_default("REQUIRED_ENVS", "")

# ------ Helper Recipes ------

[private]
@default:
    just --justfile {{ justfile() }} --list --unsorted

[private]
@exitone:
    echo "" && exit 1

[private]
@logerror msg:
    printf "{{ BOLD + UNDERLINE + RED }}🚨 {{ msg + NORMAL }}\n\n"

[private]
@logwarn msg:
    printf "{{ BOLD + YELLOW }}⚠️ {{ msg + NORMAL }}\n\n"

[private]
@loginfo msg:
    printf "{{ BLUE }}🔍 {{ msg + NORMAL }}\n"

[private]
@logsuccess msg:
    printf "{{ BOLD + GREEN }}✅ {{ msg + NORMAL }}\n"

[private]
[script]
testDep test_dep:
    printf "%*s> Confirming {{ test_dep }} is installed... " 2 ""
    whence -p {{ test_dep }} >/dev/null && just logsuccess "" || {
      just logerror "{{ test_dep }} not found!"
      just loginfo "Install Node.js {{ node_version }} (see .nvmrc) and ensure npm is on PATH."
      just exitone
    }

[private]
[script]
check-deps:
    set -e
    printf "\n{{ BOLD }}Checking required dependencies:{{ NORMAL }}\n"
    deps=( {{ required_deps }} )
    for dep ("$deps[@]") { just testDep "$dep" }

[private]
[script]
testEnv test_env:
    printf "%*s> Confirming {{ test_env }} is set... " 2 ""
    target="{{ test_env }}"
    [[ -n "${(P)target-}" ]] && just logsuccess "" || {
      just logerror "{{ test_env }} is not set!"
      just loginfo "Set {{ test_env }} in your environment before trying again."
      just exitone
    }

[private]
[script]
check-envs:
    set -e
    envs=( {{ required_envs }} )
    (( ${#envs[@]} == 0 )) && exit 0
    printf "\n{{ BOLD }}Checking required environment variables:{{ NORMAL }}\n"
    for env_var ("$envs[@]") { just testEnv "$env_var" }

[private]
[script]
check-node verbose="":
    set -euo pipefail
    source "{{ activate_node_script }}"
    if [[ -n "{{ verbose }}" ]]; then
        just logsuccess "Node OK ($(node -v))."
    fi

[private]
[script]
preflight:
    set -e
    deps=( {{ required_deps }} )
    for dep ("$deps[@]") {
      whence -p "$dep" >/dev/null || {
        just logerror "$dep not found!"
        just loginfo "Install Node.js {{ node_version }} (see .nvmrc) and ensure npm is on PATH."
        just exitone
      }
    }
    source "{{ activate_node_script }}"

[private]
[script]
check-clean:
    set -euo pipefail
    if [[ -n "$(git status --porcelain)" ]]; then
        just logerror "Working tree is not clean. Commit, stash, or discard changes first."
        git status --short
        just exitone
    fi

[private]
[script]
print-load-instructions:
    printf "\n{{ BOLD }}Load extension (debug build):{{ NORMAL }}\n\n"
    printf "{{ BOLD }}Chrome (MV3){{ NORMAL }}\n"
    printf "  chrome://extensions → Developer mode → Load unpacked\n"
    printf "  → {{ BLUE }}{{ chrome_debug_dir }}/{{ NORMAL }}\n\n"
    printf "{{ BOLD }}Firefox{{ NORMAL }}\n"
    printf "  about:debugging#/runtime/this-firefox → Load Temporary Add-on\n"
    printf "  → {{ BLUE }}{{ firefox_debug_dir }}/manifest.json{{ NORMAL }}\n\n"
    printf "Disable the store Dark Reader first to avoid conflicts.\n\n"

[private]
[script]
print-release-artifacts:
    printf "\n{{ BOLD }}Release artifacts:{{ NORMAL }}\n"
    printf "  {{ BLUE }}{{ repo_root }}/build/release/darkreader-chrome-mv3.zip{{ NORMAL }}\n"
    printf "  {{ BLUE }}{{ repo_root }}/build/release/darkreader-firefox.xpi{{ NORMAL }}\n\n"

[private]
[script]
build-release-run:
    set -euo pipefail
    source "{{ activate_node_script }}"
    npm run build:chrome-mv3 && npm run build:firefox

[private]
[script]
build-debug:
    set -euo pipefail
    source "{{ activate_node_script }}"
    npm run debug -- --chrome-mv3 --firefox

[private]
[script]
check:
    set -euo pipefail
    source "{{ activate_node_script }}"
    npm run lint
    npx tsc --noEmit -p src/tsconfig.json

[private]
[script]
check-privacy:
    set -euo pipefail
    source "{{ activate_node_script }}"
    bg="{{ chrome_debug_dir }}/background/index.js"
    manifest="{{ chrome_debug_dir }}/manifest.json"
    if [[ ! -f "$bg" || ! -f "$manifest" ]]; then
        just logerror "Debug build missing. Run 'just build debug' first."
        just exitone
    fi
    "{{ privacy_script }}" "$bg" "$manifest"
    just logsuccess "Privacy invariants passed"

[private]
[script]
update-main: check-clean
    set -euo pipefail
    branch="$(git branch --show-current)"
    just loginfo "Updating {{ upstream_branch }} from {{ upstream_remote }}..."
    git fetch {{ upstream_remote }}
    git checkout {{ upstream_branch }}
    git merge --ff-only {{ upstream_remote }}/{{ upstream_branch }}
    git checkout "$branch"
    just logsuccess "{{ upstream_branch }} is up to date."

[private]
[script]
rebase-on-main: check-clean
    set -euo pipefail
    branch="$(git branch --show-current)"
    just loginfo "Rebasing $branch onto {{ upstream_branch }}..."
    if ! git rebase {{ upstream_branch }}; then
        just logerror "Rebase failed. Resolve conflicts, then run: git rebase --continue"
        just loginfo "Fork-sensitive files to review:"
        just loginfo "  src/background/config-manager.ts"
        just loginfo "  src/background/newsmaker.ts"
        just loginfo "  src/background/utils/extension-api.ts"
        just loginfo "  src/manifest.json, src/manifest-chrome-mv3.json, src/utils/csp.ts"
        just loginfo "  src/inject/dynamic-theme/image.ts, src/inject/dynamic-theme/network.ts"
        just loginfo "  src/ui/popup/, src/ui/options/"
        just exitone
    fi
    just logsuccess "Rebase complete."

# ------ CLI Recipes ------

# Verbose environment doctor: deps + envs + Node/.nvmrc
doctor: check-deps check-envs
    @just check-node verbose=1

# Release build (default); debug or all for unpacked local loading
[script]
build target="":
    set -euo pipefail
    source "{{ activate_node_script }}"
    case "{{ target }}" in
      ""|release)
        just build-release-run
        just print-release-artifacts
        just logsuccess "Release build complete"
        ;;
      debug)
        just build-debug
        just print-load-instructions
        just logsuccess "Debug build complete"
        ;;
      all)
        npm run debug
        just print-load-instructions
        just logsuccess "Debug build (all platforms) complete"
        ;;
      *)
        just logerror "Unknown build target: {{ target }} (expected: debug, all, release)"
        just exitone
        ;;
    esac

# Browser harness preflight: ports 8891-8894, test build, manifest CSP (no browser launch)
[script]
test-browser-preflight product="chrome-mv3":
    set -euo pipefail
    source "{{ activate_node_script }}"
    node scripts/browser-test-preflight.js "{{ product }}"

# Run test suites (default: all)
[script]
test suite="all":
    set -euo pipefail
    source "{{ activate_node_script }}"
    case "{{ suite }}" in
      all)     npm run test:all ;;
      unit)    npm run test:unit ;;
      inject)  npm run test:inject ;;
      browser) npm run test:browser ;;
      *)
        just logerror "Unknown test suite: {{ suite }} (expected: unit, inject, browser, all)"
        just exitone
        ;;
    esac

# Lint, typecheck, all tests, debug build, and privacy checks
[script]
verify:
    set -euo pipefail
    just loginfo "Running full verification gate..."
    just loginfo "Lint + typecheck"
    just check
    just loginfo "Tests"
    just test
    just loginfo "Debug build"
    just build-debug
    just loginfo "Privacy invariants"
    just check-privacy
    just logsuccess "Verification complete"

# Fetch upstream main and rebase the current branch onto it
sync:
    just update-main
    just rebase-on-main

# Install npm dependencies after clone or package-lock changes
[script]
install:
    set -euo pipefail
    source "{{ activate_node_script }}"
    npm install

# MV3 debug rebuild on file changes
[script]
watch:
    set -euo pipefail
    source "{{ activate_node_script }}"
    just print-load-instructions
    printf "\n{{ BOLD + BLUE }}👀 MV3 debug watch started (Press Ctrl+C to stop)...{{ NORMAL }}\n"
    npm run debug:watch:mv3
