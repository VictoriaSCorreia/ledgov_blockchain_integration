#!/bin/bash
set -e

cd "$HOME/ledgov/fabric-samples/test-network"

echo "🧹 Shutting down previous network..."
./network.sh down
docker volume prune -f
docker network prune -f

echo "⛓️  Starting the network..."
./network.sh up

echo "📡 Creating channel mychannel..."
./network.sh createChannel -c mychannel

echo "✅ Network ready!"
docker ps --format "table {{.Names}}\t{{.Status}}"
