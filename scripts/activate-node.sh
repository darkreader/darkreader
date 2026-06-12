#!/usr/bin/env zsh
# Activate the Node version from .nvmrc in the *current* shell.
# Source this at the start of just [script] recipes before npm/npx/node.
#
# just runs non-interactive zsh (-uc / -u) without .zshrc, so `nvm use` often
# leaves system node (e.g. v26.3.0) ahead of the .nvmrc version on PATH.
# We pin PATH to the nvm install directory directly instead.
set -euo pipefail

nvmrc_path=".nvmrc"
if [[ ! -f "$nvmrc_path" ]]; then
    script_dir="$(cd "$(dirname "${(%):-%x}")" && pwd)"
    nvmrc_path="$script_dir/../.nvmrc"
fi

expected="$(tr -d '[:space:]' <"$nvmrc_path")"
version="${expected#v}"

nvm_dir="${NVM_DIR:-$HOME/.nvm}"
node_bin="$nvm_dir/versions/node/v${version}/bin/node"

if [[ ! -x "$node_bin" ]]; then
    if [[ -s "$nvm_dir/nvm.sh" ]]; then
        set +u
        # shellcheck source=/dev/null
        source "$nvm_dir/nvm.sh"
        set -u
        nvm install "$version" || true
    fi
fi

if [[ ! -x "$node_bin" ]]; then
    printf 'Node %s is not installed. Run: nvm install %s\n' "$expected" "$version" >&2
    exit 1
fi

export PATH="$(dirname "$node_bin"):$PATH"
hash -r 2>/dev/null || true

actual="$("$node_bin" -v)"
if [[ "$actual" != "$expected" ]]; then
    printf 'node is %s, expected %s (.nvmrc).\n' "$actual" "$expected" >&2
    exit 1
fi
