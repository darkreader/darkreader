#!/usr/bin/env just --justfile

# Golden justfile template for Dark Reader fork maintenance.
# Copy patterns from here into the root justfile; keep domain recipes in the root file.

set shell := ["zsh", "-uc"]
set dotenv-filename := "just.env"
set dotenv-load
set script-interpreter := ["zsh", "-u"]

# ------ Variables ------

repo_root := justfile_directory()
call_dir := invocation_directory()
node_version := trim(`cat .nvmrc`)
with_node_script := repo_root / "scripts/with-node.sh"
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
@notify title msg sound="Pop":
    osascript -e 'display notification "{{ msg }}" with title "{{ title }}" sound name "{{ sound }}"'

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

# ------ Tooling Scripts ------

[private]
[script]
check:
    set -euo pipefail
    "{{ with_node_script }}" npm run lint
    "{{ with_node_script }}" npx tsc --noEmit -p src/tsconfig.json

[private]
[script]
build-debug:
    set -euo pipefail
    "{{ with_node_script }}" npm run debug -- --chrome-mv3 --firefox

# ------ CLI Recipes ------

doctor: check-deps check-envs
    @just check-node verbose=1

[script]
build target="": doctor
    set -euo pipefail
    case "{{ target }}" in
      ""|release) just build-debug ;;
      debug) just build-debug ;;
      *) just logerror "Unknown build target: {{ target }}"; just exitone ;;
    esac

[script]
test suite="all": doctor
    set -euo pipefail
    case "{{ suite }}" in
      unit) "{{ with_node_script }}" npm run test:unit ;;
      all)  "{{ with_node_script }}" npm run test:all ;;
      *) just logerror "Unknown test suite: {{ suite }}"; just exitone ;;
    esac

[script]
verify: doctor
    set -euo pipefail
    just check
    just test
    just build-debug

[script]
watch: doctor
    set -euo pipefail
    printf "\n{{ BOLD + BLUE }}👀 MV3 debug watch started (Press Ctrl+C to stop)...{{ NORMAL }}\n"
    "{{ with_node_script }}" npm run debug:watch:mv3 2>&1 | while read -r line; do
      print -r -- "$line"
      [[ "$line" == *"MISSION FAILED!"* ]] && just notify "Dark Reader Watch" "Build error — check terminal." "Basso"
    done
