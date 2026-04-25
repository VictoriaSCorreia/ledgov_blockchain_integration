#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
NETWORK_DIR="${ROOT_DIR}/fabric-samples/test-network"
CHAINCODE_DIR="${ROOT_DIR}/chaincode-ledgov"
CHANNEL_NAME="${CHANNEL_NAME:-mychannel}"
CHAINCODE_NAME="${CHAINCODE_NAME:-ledgov}"
CHAINCODE_LANG="${CHAINCODE_LANG:-go}"

if [ ! -d "$NETWORK_DIR" ]; then
  echo "Error: network directory not found at $NETWORK_DIR"
  exit 1
fi

if [ ! -d "$CHAINCODE_DIR" ]; then
  echo "Error: chaincode directory not found at $CHAINCODE_DIR"
  exit 1
fi

if [ -x "${ROOT_DIR}/.codex-bin/docker" ]; then
  export PATH="${ROOT_DIR}/.codex-bin:$PATH"
fi

cd "$NETWORK_DIR"

echo "Shutting down previous network..."
./network.sh down

echo "Starting network and creating channel ${CHANNEL_NAME}..."
./network.sh up createChannel -c "$CHANNEL_NAME" -ca

echo "Deploying chaincode ${CHAINCODE_NAME}..."
./network.sh deployCC \
  -c "$CHANNEL_NAME" \
  -ccn "$CHAINCODE_NAME" \
  -ccp "$CHAINCODE_DIR" \
  -ccl "$CHAINCODE_LANG"

echo
echo "Deploy finished. Chaincode ${CHAINCODE_NAME} published on ${CHANNEL_NAME}."
