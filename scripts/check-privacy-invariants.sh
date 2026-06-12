#!/usr/bin/env zsh
# Verify fork privacy invariants in a built Chrome MV3 debug bundle.
set -euo pipefail

background_js="${1:?usage: check-privacy-invariants.sh BACKGROUND_JS MANIFEST_JSON}"
manifest_json="${2:?usage: check-privacy-invariants.sh BACKGROUND_JS MANIFEST_JSON}"

failures=0

fail() {
    echo "FAIL: $1"
    failures=$((failures + 1))
}

pass() {
    echo "OK: $1"
}

if [[ ! -f "$background_js" ]]; then
    echo "Error: background bundle not found: $background_js"
    echo "Run 'just build' first."
    exit 1
fi

if [[ ! -f "$manifest_json" ]]; then
    echo "Error: manifest not found: $manifest_json"
    echo "Run 'just build' first."
    exit 1
fi

# Upstream regression: remote config fetched at runtime
if grep -E 'fetch\([^)]*githubusercontent' "$background_js" >/dev/null 2>&1; then
    fail "background fetches raw.githubusercontent.com at runtime"
else
    pass "no runtime fetch to raw.githubusercontent.com"
fi

if grep -E 'fetch\([^)]*remoteURL' "$background_js" >/dev/null 2>&1; then
    fail "background fetches remote config URLs at runtime"
else
    pass "no runtime fetch via remoteURL"
fi

# Manifest CSP: connect-src must not allow external origins
csp="$(python3 - <<'PY' "$manifest_json"
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    data = json.load(f)
print(data.get("content_security_policy", {}).get("extension_pages", ""))
PY
)"

if [[ -z "$csp" ]]; then
    fail "manifest missing extension_pages CSP"
elif echo "$csp" | grep -E "connect-src[^;]*https?://" >/dev/null 2>&1; then
    fail "manifest connect-src allows external HTTP origins"
elif echo "$csp" | grep -E "connect-src[^;]*'self'" >/dev/null 2>&1; then
    pass "manifest connect-src is local-only ('self')"
else
    fail "manifest connect-src does not restrict to 'self'"
fi

if [[ "$failures" -gt 0 ]]; then
    echo ""
    echo "$failures privacy invariant check(s) failed."
    echo "Review fork changes in src/background/config-manager.ts and src/utils/csp.ts."
    exit 1
fi

echo ""
echo "All privacy invariant checks passed."
