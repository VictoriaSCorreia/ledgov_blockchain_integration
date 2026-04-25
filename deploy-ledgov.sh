#!/bin/bash
set -e

NETWORK_DIR="$HOME/ledgov/fabric-samples/test-network"
CHAINCODE_DIR="$HOME/ledgov/chaincode-ledgov"

cd "$NETWORK_DIR"

# Configuration
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/../config/
export CORE_PEER_KEEPALIVE_CLIENT_INTERVAL=60s
export CORE_PEER_KEEPALIVE_CLIENT_TIMEOUT=20s
export CORE_PEER_KEEPALIVE_MININTERVAL=60s

export ORDERER_CA=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
export PEER1_CA=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export PEER2_CA=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export ORG1_MSP=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export ORG2_MSP=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp

org1() {
  export CORE_PEER_TLS_ENABLED=true
  export CORE_PEER_LOCALMSPID="Org1MSP"
  export CORE_PEER_TLS_ROOTCERT_FILE=$PEER1_CA
  export CORE_PEER_MSPCONFIGPATH=$ORG1_MSP
  export CORE_PEER_ADDRESS=localhost:7051
}

org2() {
  export CORE_PEER_TLS_ENABLED=true
  export CORE_PEER_LOCALMSPID="Org2MSP"
  export CORE_PEER_TLS_ROOTCERT_FILE=$PEER2_CA
  export CORE_PEER_MSPCONFIGPATH=$ORG2_MSP
  export CORE_PEER_ADDRESS=localhost:9051
}

echo "📦 Empacotando chaincode..."
org1
peer lifecycle chaincode package ledgov.tar.gz \
  --path "$CHAINCODE_DIR" --lang golang --label ledgov_1.0

echo "⬆️  Instalando na Org1..."
peer lifecycle chaincode install ledgov.tar.gz

echo "⬆️  Instalando na Org2..."
org2
peer lifecycle chaincode install ledgov.tar.gz

echo "🔍 Obtendo Package ID..."
org1
PKG_ID=$(peer lifecycle chaincode queryinstalled | grep 'ledgov_1.0' | awk '{print $3}' | tr -d ',')
echo "Package ID: $PKG_ID"

echo "✅ Aprovando para Org1..."
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile "$ORDERER_CA" \
  --channelID mychannel --name ledgov --version 1.0 \
  --package-id "$PKG_ID" --sequence 1

echo "✅ Aprovando para Org2..."
org2
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile "$ORDERER_CA" \
  --channelID mychannel --name ledgov --version 1.0 \
  --package-id "$PKG_ID" --sequence 1

echo "🚀 Commitando no canal..."
peer lifecycle chaincode commit \
  -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile "$ORDERER_CA" \
  --channelID mychannel --name ledgov --version 1.0 --sequence 1 \
  --peerAddresses localhost:7051 --tlsRootCertFiles "$PEER1_CA" \
  --peerAddresses localhost:9051 --tlsRootCertFiles "$PEER2_CA"

echo ""
echo "🎉 Chaincode LEDGOV deployado com sucesso!"
peer lifecycle chaincode querycommitted --channelID mychannel --name ledgov
