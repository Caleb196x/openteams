#!/usr/bin/env bash
# Task 10 shortcut acceptance suite.
# Run after code-review gate passes.
#
# Usage:
#   bash scripts/run-shortcut-acceptance.sh
#
# Or from the repo root:
#   pnpm -C frontend exec tsx src/shortcuts/shortcutAcceptance.test.ts

set -euo pipefail

echo "=== Task 10: Shortcut Acceptance Suite ==="
echo ""

echo "[1/4] shortcutAcceptance ..."
pnpm -C frontend exec tsx src/shortcuts/shortcutAcceptance.test.ts
echo ""

echo "[2/4] bindingResolver ..."
pnpm -C frontend exec tsx src/shortcuts/bindingResolver.test.ts
echo ""

echo "[3/4] contextRules ..."
pnpm -C frontend exec tsx src/shortcuts/contextRules.test.ts
echo ""

echo "[4/4] platform ..."
pnpm -C frontend exec tsx src/shortcuts/platform.test.ts
echo ""

echo "=== All shortcut acceptance tests PASSED ==="
