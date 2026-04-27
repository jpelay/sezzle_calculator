package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCalculateSupportsExponentiation(t *testing.T) {
	response := performCalculationRequest(t, OperationRequest{
		Operand1: json.RawMessage(`"2"`),
		Operator: "^",
		Operand2: json.RawMessage(`"3"`),
	})

	if response.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, response.Code)
	}

	body := decodeOperationResponse(t, response)
	if body.Result != "8" {
		t.Fatalf("expected exponentiation result 8, got %q", body.Result)
	}
}

func TestCalculateSupportsSquareRoot(t *testing.T) {
	response := performCalculationRequest(t, OperationRequest{
		Operand1: json.RawMessage(`"9"`),
		Operator: "sqrt",
	})

	if response.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, response.Code)
	}

	body := decodeOperationResponse(t, response)
	if body.Result != "3" {
		t.Fatalf("expected square root result 3, got %q", body.Result)
	}
}

func TestCalculateSupportsPercentage(t *testing.T) {
	response := performCalculationRequest(t, OperationRequest{
		Operand1: json.RawMessage(`"25"`),
		Operator: "%",
	})

	if response.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, response.Code)
	}

	body := decodeOperationResponse(t, response)
	if body.Result != "0.25" {
		t.Fatalf("expected percentage result 0.25, got %q", body.Result)
	}
}

func TestCalculateRejectsNegativeSquareRoot(t *testing.T) {
	response := performCalculationRequest(t, OperationRequest{
		Operand1: json.RawMessage(`"-9"`),
		Operator: "sqrt",
	})

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, response.Code)
	}

	body := decodeOperationResponse(t, response)
	if body.Error != "Square root requires a non-negative operand" {
		t.Fatalf("unexpected error message %q", body.Error)
	}
}

func TestCalculateSupportsVeryLargeNumbers(t *testing.T) {
	response := performCalculationRequest(t, OperationRequest{
		Operand1: json.RawMessage(`"999999999999"`),
		Operator: "+",
		Operand2: json.RawMessage(`"1"`),
	})

	if response.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, response.Code)
	}

	body := decodeOperationResponse(t, response)
	if body.Result != "1.0000000000e+12" {
		t.Fatalf("expected scientific notation result, got %q", body.Result)
	}
}

func TestCalculateReturnsScientificNotationForLargeResult(t *testing.T) {
	response := performCalculationRequest(t, OperationRequest{
		Operand1: json.RawMessage(`"1e12"`),
		Operator: "*",
		Operand2: json.RawMessage(`"10"`),
	})

	if response.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, response.Code)
	}

	body := decodeOperationResponse(t, response)
	if body.Result != "1.0000000000e+13" {
		t.Fatalf("expected scientific notation for large result, got %q", body.Result)
	}
}

func TestCalculateRejectsNonNumericOperand(t *testing.T) {
	response := performCalculationRequest(t, OperationRequest{
		Operand1: json.RawMessage(`"abc"`),
		Operator: "+",
		Operand2: json.RawMessage(`"2"`),
	})

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, response.Code)
	}

	body := decodeOperationResponse(t, response)
	if body.Error != "operand1 must be a valid number" {
		t.Fatalf("unexpected error message %q", body.Error)
	}
}

func TestCalculateRejectsMissingOperandForBinaryOperator(t *testing.T) {
	response := performCalculationRequest(t, OperationRequest{
		Operand1: json.RawMessage(`"8"`),
		Operator: "/",
	})

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, response.Code)
	}

	body := decodeOperationResponse(t, response)
	if body.Error != "operand2 is required" {
		t.Fatalf("unexpected error message %q", body.Error)
	}
}

func TestCalculateRejectsUnsupportedOperator(t *testing.T) {
	response := performCalculationRequest(t, OperationRequest{
		Operand1: json.RawMessage(`"8"`),
		Operator: "foo",
		Operand2: json.RawMessage(`"2"`),
	})

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, response.Code)
	}

	body := decodeOperationResponse(t, response)
	if body.Error != "Unsupported operator" {
		t.Fatalf("unexpected error message %q", body.Error)
	}
}

func TestCalculateRejectsOperandOverflow(t *testing.T) {
	response := performCalculationRequest(t, OperationRequest{
		Operand1: json.RawMessage(`"1e309"`),
		Operator: "+",
		Operand2: json.RawMessage(`"2"`),
	})

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, response.Code)
	}

	body := decodeOperationResponse(t, response)
	if body.Error != "operand1 is too large" {
		t.Fatalf("unexpected error message %q", body.Error)
	}
}

func TestCalculateRejectsOverflowingResult(t *testing.T) {
	response := performCalculationRequest(t, OperationRequest{
		Operand1: json.RawMessage(`"1e308"`),
		Operator: "^",
		Operand2: json.RawMessage(`"2"`),
	})

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, response.Code)
	}

	body := decodeOperationResponse(t, response)
	if body.Error != "Result is out of supported numeric range" {
		t.Fatalf("unexpected error message %q", body.Error)
	}
}

func TestCalculateRejectsDivisionByZero(t *testing.T) {
	response := performCalculationRequest(t, OperationRequest{
		Operand1: json.RawMessage(`"8"`),
		Operator: "/",
		Operand2: json.RawMessage(`"0"`),
	})

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, response.Code)
	}

	body := decodeOperationResponse(t, response)
	if body.Error != "Division by zero" {
		t.Fatalf("unexpected error message %q", body.Error)
	}
}

func performCalculationRequest(t *testing.T, request OperationRequest) *httptest.ResponseRecorder {
	t.Helper()

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/calculate", calculate)

	payload, err := json.Marshal(request)
	if err != nil {
		t.Fatalf("failed to marshal request: %v", err)
	}

	response := httptest.NewRecorder()
	httpRequest := httptest.NewRequest(http.MethodPost, "/calculate", bytes.NewReader(payload))
	httpRequest.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(response, httpRequest)

	return response
}

func decodeOperationResponse(t *testing.T, response *httptest.ResponseRecorder) OperationResponse {
	t.Helper()

	var body OperationResponse
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}

	return body
}
