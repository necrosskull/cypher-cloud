#!/bin/sh
set -euo pipefail

VAULT_TOKEN_VALUE="${VAULT_DEV_ROOT_TOKEN_ID:-${VAULT_TOKEN:-}}"
LISTEN_ADDRESS="${VAULT_DEV_LISTEN_ADDRESS:-0.0.0.0:8200}"
ADMIN_USER="${VAULT_ADMIN_USERNAME:-}"
ADMIN_PASS="${VAULT_ADMIN_PASSWORD:-}"
ADMIN_POLICY="${VAULT_ADMIN_POLICY:-admin-ui}"
KV_MOUNT="${VAULT_KV_MOUNT:-secret}"

if [ -z "$VAULT_TOKEN_VALUE" ]; then
  echo "VAULT_DEV_ROOT_TOKEN_ID or VAULT_TOKEN must be provided" >&2
  exit 1
fi

echo "Starting Vault dev server on ${LISTEN_ADDRESS}"
vault server -dev -dev-root-token-id="$VAULT_TOKEN_VALUE" -dev-listen-address="$LISTEN_ADDRESS" &
VAULT_PID=$!

cleanup() {
  echo "Stopping Vault dev server"
  kill "$VAULT_PID"
}
trap cleanup INT TERM

export VAULT_ADDR="http://127.0.0.1:${LISTEN_ADDRESS##*:}"
export VAULT_TOKEN="$VAULT_TOKEN_VALUE"

echo "Waiting for Vault to become ready..."
until vault status >/dev/null 2>&1; do
  sleep 0.5
done

if [ -n "$ADMIN_USER" ] && [ -n "$ADMIN_PASS" ]; then
  echo "Configuring Vault UI credentials for user '${ADMIN_USER}'"
  if ! vault auth list -format=json | grep -q '"userpass/"'; then
    vault auth enable userpass >/dev/null
  fi

  POLICIES_LIST="default"
  if [ -n "$ADMIN_POLICY" ]; then
    POLICY_FILE="/tmp/vault-admin-policy.hcl"
    cat > "$POLICY_FILE" <<EOF
path "${KV_MOUNT}/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "${KV_MOUNT}/data/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "${KV_MOUNT}/metadata/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "sys/mounts" {
  capabilities = ["read", "list"]
}

path "sys/mounts/*" {
  capabilities = ["read", "list"]
}

path "sys/auth" {
  capabilities = ["read", "list"]
}

path "sys/auth/*" {
  capabilities = ["read", "list"]
}
EOF
    vault policy write "$ADMIN_POLICY" "$POLICY_FILE" >/dev/null
    POLICIES_LIST="$POLICIES_LIST,$ADMIN_POLICY"
  fi

  vault write auth/userpass/users/"$ADMIN_USER" \
    password="$ADMIN_PASS" \
    policies="$POLICIES_LIST" >/dev/null
else
  echo "VAULT_ADMIN_USERNAME/PASSWORD not set, skipping UI credentials setup"
fi

wait "$VAULT_PID"
