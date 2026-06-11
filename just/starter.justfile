#!/usr/bin/env just --justfile

# Notes:
# - Recipies annotated with [private] (or starting with _) aren't listed or callable from the CLI
# - Use the [script] annotation to allow multi-line scripts run by the shell set at the beginning
# - The @ toggles the printing of the command to the CLI before running it. [script] disables this by default
# - default recipe: If only `just` is run, then list the options in the order set in this file, not alphabetically

set shell := ["zsh", "-uc"]
set dotenv-filename := "just.env"
set dotenv-load
set script-interpreter := ["zsh", "-u"]

# ------ Variables ------

repo_root := justfile_directory()
call_dir := invocation_directory()
required_deps := env_var_or_default("REQUIRED_DEPS", "rg fd")
required_envs := env_var_or_default("REQUIRED_ENVS", "OPPFI_SECURITY_AUDIENCE_URI OPPFI_SECURITY_ISSUER_URI")

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
@pickDir prompt startDir="$HOME":
    osascript -e 'POSIX path of (choose folder with prompt "{{ prompt }}" default location "{{ startDir }}")'

[private]
[script]
testDep test_dep:
    printf "%*s> Confirming {{ test_dep }} is installed... " 2 ""
    whence -p {{ test_dep }} >/dev/null && just logsuccess "" || {
      just logerror "{{ test_dep }} not found!"
      just loginfo "To install: brew install {{ test_dep }}"
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
      just loginfo "You need to set {{ test_env }} in your environment before trying again"
      just exitone
    }
# Check that needed environment variables are set
[private]
[script]
check-envs:
    set -e
    printf "\n{{ BOLD }}Checking required environment variables:{{ NORMAL }}\n"
    envs=( {{ required_envs }} )
    for env_var ("$envs[@]") { just testEnv "$env_var" }

[private]
[script]
check-docker:
    printf "\n{{ BOLD }}Checking for running docker engine... {{ NORMAL }}"
    pgrep -q docker && just logsuccess "" || {
      just logerror "Docker is not running!"
      just loginfo "Please start docker before trying again"
      just exitone
    }

# Check if the ddd-metadata-registry service is running
[private]
[script]
check-metadata:
    set -e
    printf "\n{{ BOLD }}Checking for ddd-metadata-registry service on port 8001...{{ NORMAL }}\n"
    zmodload zsh/net/tcp && ztcp localhost 8001 2>/dev/null && {
      ztcp -c $REPLY
      echo "ddd-metadata-registry service is running."
    } || {
      just logerror " Error: The ddd-metadata-registry service is not running on port 8001."
      just loginfo "Please start the ddd-metadata-registry service and try again."
      just exitone
    }

# ------ Tooling Scripts ------

[private]
[script]
create-interactive:
    repo_dir="{{ repo_root }}"
    parent_dir="{{ clean(join(repo_root, '..')) }}"
    exec_class_file="$(fd -t f -e java 'CreateProjectFromTemplateCommandExecutor' "$repo_dir" | head -n 1)"
    templates=( ${(f)"$(rg -U 'validTemplates = Set\.of[^;]+' "$exec_class_file" | rg -o -r '$1' '"(\w+)"')"} )
    template=""
    prompt() {
      prompt_string="$1${2+ [$2]}: "
      read -r "REPLY?$prompt_string"
      print -r -- "${REPLY:-$2}"
    }
    project_name=$(prompt "Enter the root project name only")
    PS3=$'\n'"Select a template (enter a number): "
    select template in "${templates[@]}"; do
      [[ -n "$template" ]] && break || print -r "Invalid selection." >&2
    done
    directory=$(just pickDir "Enter the target directory" "$parent_dir")
    printf "\n{{ BLUE }}Ready to create a new project:{{ NORMAL }}\n"
    printf "  {{ BOLD }}Project:{{ NORMAL }}   %s\n" "$project_name"
    printf "  {{ BOLD }}Template:{{ NORMAL }}  %s\n" "$template"
    printf "  {{ BOLD }}Target:{{ NORMAL }}    %s\n\n" "$directory"
    read -q "?Press [Y] to continue or [N] to cancel: " || { print "\nCancelled."; exit 0 }
    print "\n"
    printf "{{ GREEN }}Generating project...{{ NORMAL }}\n"
    {{ repo_root }}/gradlew -q :ddd-cli-console:bootRun --args="-c CreateProjectFromTemplate -n \"$project_name\" -t \"$template\" -d \"$directory\""
    printf "\n{{ GREEN }}Done!{{ NORMAL }} Opening project directory...\n"
    open "$directory/$project_name"

[private]
[script]
@create-from-template name folder type:
    {{ repo_root }}/gradlew -q :ddd-cli-console:bootRun --args='-c CreateProjectFromTemplate -n "{{ name }}" -d "{{ folder }}" -t "{{ type }}"'

# ------ CLI Recipes ------

# run all checks
run-checks: check-envs check-deps check-metadata check-docker

# Build [clean] [--refresh-dependencies] (Run build with optional tasks/args)
[script]
build *args:
    args=( {{ args }} )
    filtered=( ${args:#clean} )
    cmd=( "{{ repo_root }}/gradlew" "--parallel" "--build-cache" )
    (( ${args[(I)clean]} )) && cmd+=( "clean" )
    "${cmd[@]}" bootJar "${filtered[@]}"

# Test [clean] [--info] ['--tests *MyTestClass'] (Run tests with optional tasks/args)
[script]
test *args: check-envs check-docker
    args=( {{ args }} )
    filtered=( ${args:#clean} )
    cmd=( "{{ repo_root }}/gradlew" "--parallel" "--build-cache" )
    (( ${args[(I)clean]} )) && cmd+=( "clean" )
    "${cmd[@]}" test "${filtered[@]}"

# Watch for file changes and auto-trigger tests (pass args like `--info` or `--tests *MyTest`)
[script]
watch *args: check-envs check-docker
    args=( {{ args }} )
    filtered=( ${args:#clean} )
    cmd=( "{{ repo_root }}/gradlew" "-t" "--parallel" "--build-cache" "--console=rich" "-Dorg.gradle.jvmargs=-Xmx2g" )
    (( ${args[(I)clean]} )) && cmd+=( "clean" )
    printf "\n{{ BOLD + BLUE }}👀 Native Gradle Watch started (Press Ctrl+C to stop)...{{ NORMAL }}\n"
    "${cmd[@]}" test "${filtered[@]}" 2>&1 | while read -r line; do
      print -r -- "$line"
      [[ "$line" == *"BUILD FAILED"* ]] && just notify "Gradle Watch" "❌ Tests Failed! Check terminal." "Basso"
      [[ "$line" == *"BUILD SUCCESSFUL"* ]] && just notify "Gradle Watch" "✅ All tests passed." "Glass"
    done

# Create a project interactively (`just create`); or provide a name, type and folder
[script]
create name="" folder="" type="": check-deps check-docker
    echo
    if [[ -z "{{ name }}" ]]; then
      just create-interactive
    else
      just create-from-template "{{ name }}" "{{ absolute_path(folder) }}" "{{ type }}"
    fi
