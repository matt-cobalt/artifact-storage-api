#!/bin/bash

# Medical Vertical Validation Suite
# Runs all validation scripts in sequence

set -e  # Exit on any error

echo "═══════════════════════════════════════"
echo "MEDICAL VERTICAL VALIDATION SUITE"
echo "═══════════════════════════════════════"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../../.."

SCRIPTS=(
  "validate-schema.js"
  "test-m-otto.js"
  "test-hipaa-compliance.js"
  "test-cross-vertical-learning.js"
  "benchmark-performance.js"
  "simulate-week1-deployment.js"
)

PASSED=0
FAILED=0

for i in "${!SCRIPTS[@]}"; do
  SCRIPT="${SCRIPTS[$i]}"
  NAME="${SCRIPT%.js}"
  NAME="${NAME//-/ }"
  NAME=$(echo "$NAME" | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2));}1')
  
  echo ""
  echo "[$((i+1))/${#SCRIPTS[@]}] Running: $NAME"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  if node "src/medical/scripts/$SCRIPT"; then
    echo ""
    echo "✓ $NAME: PASSED"
    ((PASSED++))
  else
    echo ""
    echo "✗ $NAME: FAILED"
    ((FAILED++))
  fi
  
  echo ""
done

echo ""
echo "═══════════════════════════════════════"
echo "VALIDATION SUMMARY"
echo "═══════════════════════════════════════"
echo ""
echo "Total: ${#SCRIPTS[@]} tests"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "═══════════════════════════════════════"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "✓ ALL VALIDATIONS PASSED"
  echo "Medical vertical ready for Week 1 deployment"
  exit 0
else
  echo "⚠ $FAILED validation(s) failed"
  echo "Review errors above before deployment"
  exit 1
fi












