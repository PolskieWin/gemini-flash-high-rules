#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_FILE="${SCRIPT_DIR}/GEMINI.md"
TARGET_GLOBAL="${HOME}/.gemini/GEMINI.md"

if [[ ! -f "${SOURCE_FILE}" ]]; then
  echo "Error: GEMINI.md not found at ${SOURCE_FILE}" >&2
  exit 1
fi

MODE="${1:-global}"

case "${MODE}" in
  global)
    mkdir -p "$(dirname "${TARGET_GLOBAL}")"
    cp "${SOURCE_FILE}" "${TARGET_GLOBAL}"
    echo "✓ Installed GEMINI.md to ${TARGET_GLOBAL}"
    ;;
  local)
    TARGET_LOCAL="$(pwd)/GEMINI.md"
    cp "${SOURCE_FILE}" "${TARGET_LOCAL}"
    echo "✓ Installed GEMINI.md to ${TARGET_LOCAL}"
    ;;
  workspace)
    TARGET_WORKSPACE="$(pwd)/.agents/rules/GEMINI.md"
    mkdir -p "$(dirname "${TARGET_WORKSPACE}")"
    cp "${SOURCE_FILE}" "${TARGET_WORKSPACE}"
    echo "✓ Installed GEMINI.md to ${TARGET_WORKSPACE}"
    ;;
  *)
    echo "Usage: $0 [global|local|workspace]" >&2
    echo "  global    : Installs to ~/.gemini/GEMINI.md (default, machine-wide)" >&2
    echo "  local     : Installs to ./GEMINI.md (current directory)" >&2
    echo "  workspace : Installs to ./.agents/rules/GEMINI.md (project workspace)" >&2
    exit 1
    ;;
esac
