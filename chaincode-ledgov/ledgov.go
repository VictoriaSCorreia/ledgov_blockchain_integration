package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// Transaction stores a government payment record on the ledger.
type Transaction struct {
	ID               string  `json:"id"`
	Agency           string  `json:"agency"`
	Supplier         string  `json:"supplier"`
	Amount           float64 `json:"amount"`
	CommitmentNumber string  `json:"commitmentNumber"`
	DocumentHash     string  `json:"documentHash"`
	DigitalSignature string  `json:"digitalSignature"`
	Timestamp        string  `json:"timestamp"`
}

type transactionPayload struct {
	ID                     string  `json:"id"`
	Agency                 string  `json:"agency"`
	LegacyAgency           string  `json:"orgao"`
	Supplier               string  `json:"supplier"`
	LegacySupplier         string  `json:"fornecedor"`
	Amount                 float64 `json:"amount"`
	LegacyAmount           float64 `json:"valor"`
	CommitmentNumber       string  `json:"commitmentNumber"`
	LegacyCommitmentNumber string  `json:"num_empenho"`
	DocumentHash           string  `json:"documentHash"`
	LegacyDocumentHash     string  `json:"hash_documento"`
	DigitalSignature       string  `json:"digitalSignature"`
	LegacyDigitalSignature string  `json:"assinatura"`
	LegacyDescription      string  `json:"descricao"`
	Timestamp              string  `json:"timestamp"`
}

func (t *Transaction) UnmarshalJSON(data []byte) error {
	var payload transactionPayload
	if err := json.Unmarshal(data, &payload); err != nil {
		return err
	}

	t.ID = payload.ID
	t.Agency = firstNonEmpty(payload.Agency, payload.LegacyAgency)
	t.Supplier = firstNonEmpty(payload.Supplier, payload.LegacySupplier)
	t.Amount = payload.Amount
	if t.Amount == 0 {
		t.Amount = payload.LegacyAmount
	}
	t.CommitmentNumber = firstNonEmpty(payload.CommitmentNumber, payload.LegacyCommitmentNumber)
	t.DocumentHash = firstNonEmpty(payload.DocumentHash, payload.LegacyDocumentHash)
	t.DigitalSignature = firstNonEmpty(
		payload.DigitalSignature,
		payload.LegacyDigitalSignature,
		payload.LegacyDescription,
	)
	t.Timestamp = payload.Timestamp

	return nil
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}

	return ""
}

type LedgovContract struct {
	contractapi.Contract
}

// RecordTransaction writes a new transaction to the ledger.
func (c *LedgovContract) RecordTransaction(
	ctx contractapi.TransactionContextInterface,
	id string,
	agency string,
	supplier string,
	amountText string,
	commitmentNumber string,
	documentHash string,
	digitalSignature string,
) error {
	if commitmentNumber == "" {
		return fmt.Errorf("BLOCKED: transaction without commitment number")
	}

	if documentHash == "" {
		return fmt.Errorf("BLOCKED: document hash is required")
	}

	amount, err := strconv.ParseFloat(amountText, 64)
	if err != nil {
		return fmt.Errorf("BLOCKED: invalid amount (%s)", amountText)
	}

	if amount <= 0 {
		return fmt.Errorf("BLOCKED: amount must be positive")
	}

	existing, err := ctx.GetStub().GetState(id)
	if err != nil {
		return fmt.Errorf("failed to read ledger: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("BLOCKED: transaction '%s' already recorded", id)
	}

	transaction := Transaction{
		ID:               id,
		Agency:           agency,
		Supplier:         supplier,
		Amount:           amount,
		CommitmentNumber: commitmentNumber,
		DocumentHash:     documentHash,
		DigitalSignature: digitalSignature,
		Timestamp:        time.Now().UTC().Format(time.RFC3339),
	}

	transactionJSON, err := json.Marshal(transaction)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, transactionJSON)
}

// GetTransaction returns one transaction by ID.
func (c *LedgovContract) GetTransaction(
	ctx contractapi.TransactionContextInterface,
	id string,
) (*Transaction, error) {
	transactionJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read ledger: %v", err)
	}
	if transactionJSON == nil {
		return nil, fmt.Errorf("transaction '%s' not found", id)
	}

	var transaction Transaction
	if err := json.Unmarshal(transactionJSON, &transaction); err != nil {
		return nil, err
	}

	return &transaction, nil
}

// ListAllTransactions returns every transaction in the ledger.
func (c *LedgovContract) ListAllTransactions(
	ctx contractapi.TransactionContextInterface,
) ([]*Transaction, error) {
	iterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer iterator.Close()

	var transactions []*Transaction

	for iterator.HasNext() {
		result, err := iterator.Next()
		if err != nil {
			return nil, err
		}

		var transaction Transaction
		if err := json.Unmarshal(result.Value, &transaction); err != nil {
			return nil, err
		}

		transactions = append(transactions, &transaction)
	}

	return transactions, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&LedgovContract{})
	if err != nil {
		fmt.Printf("failed to create chaincode: %v\n", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("failed to start chaincode: %v\n", err)
	}
}
