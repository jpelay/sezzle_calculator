package main

import (
	"encoding/json"
	"errors"
	"math"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// OperationRequest represents the expected JSON structure for calculation requests.
type OperationRequest struct {
	Operator string          `json:"operator"`
	Operand1 json.RawMessage `json:"operand1"`
	Operand2 json.RawMessage `json:"operand2"`
}

// OperationResponse represents the JSON structure for calculation responses.
type OperationResponse struct {
	Result string `json:"result,omitempty"`
	Error  string `json:"error,omitempty"`
}

func main() {
	router := newRouter()
	host := getEnv("HOST", "0.0.0.0")
	port := getEnv("PORT", "8080")

	if err := router.Run(host + ":" + port); err != nil {
		panic(err)
	}
}

// Since the operations are so simple and atomic, we can just expose them as a single endpoint
func newRouter() *gin.Engine {
	router := gin.Default()
	router.Use(cors.Default())
	router.POST("/calculate", calculate)

	return router
}

func getEnv(name string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return fallback
	}

	return value
}

// calculate responds with the result of the calculation as JSON.
func calculate(c *gin.Context) {
	var req OperationRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, OperationResponse{Error: "Invalid request"})
		return
	}

	op1, err := parseOperand(req.Operand1, "operand1")
	if err != nil {
		c.JSON(http.StatusBadRequest, OperationResponse{Error: err.Error()})
		return
	}

	var result float64
	switch req.Operator {
	case "+":
		op2, err := parseOperand(req.Operand2, "operand2")
		if err != nil {
			c.JSON(http.StatusBadRequest, OperationResponse{Error: err.Error()})
			return
		}
		result = op1 + op2
	case "-":
		op2, err := parseOperand(req.Operand2, "operand2")
		if err != nil {
			c.JSON(http.StatusBadRequest, OperationResponse{Error: err.Error()})
			return
		}
		result = op1 - op2
	case "*":
		op2, err := parseOperand(req.Operand2, "operand2")
		if err != nil {
			c.JSON(http.StatusBadRequest, OperationResponse{Error: err.Error()})
			return
		}
		result = op1 * op2
	case "/":
		op2, err := parseOperand(req.Operand2, "operand2")
		if err != nil {
			c.JSON(http.StatusBadRequest, OperationResponse{Error: err.Error()})
			return
		}
		if op2 == 0 {
			c.JSON(http.StatusBadRequest, OperationResponse{Error: "Division by zero"})
			return
		}
		result = op1 / op2
	case "^":
		op2, err := parseOperand(req.Operand2, "operand2")
		if err != nil {
			c.JSON(http.StatusBadRequest, OperationResponse{Error: err.Error()})
			return
		}
		result = math.Pow(op1, op2)
	case "sqrt":
		if op1 < 0 {
			c.JSON(http.StatusBadRequest, OperationResponse{Error: "Square root requires a non-negative operand"})
			return
		}
		result = math.Sqrt(op1)
	case "%":
		result = op1 / 100
	default:
		c.JSON(http.StatusBadRequest, OperationResponse{Error: "Unsupported operator"})
		return
	}

	if math.IsInf(result, 0) || math.IsNaN(result) {
		c.JSON(http.StatusBadRequest, OperationResponse{Error: "Result is out of supported numeric range"})
		return
	}

	c.JSON(http.StatusOK, OperationResponse{Result: formatResult(result)})
}

// The operands come as strings, possibly as numbers formmatted in scientific notation
// We need to parse them into float64 for the calculations, but also handle various edge cases and provide clear error messages
func parseOperand(raw json.RawMessage, field string) (float64, error) {
	if len(raw) == 0 {
		return 0, &operandError{field: field, message: "is required"}
	}

	var valueStr string
	if string(raw) == "null" {
		return 0, &operandError{field: field, message: "is required"}
	}

	if raw[0] == '"' {
		if err := json.Unmarshal(raw, &valueStr); err != nil {
			return 0, &operandError{field: field, message: "must be a valid number"}
		}
	} else {
		valueStr = string(raw)
	}

	valueStr = strings.TrimSpace(valueStr)
	if valueStr == "" {
		return 0, &operandError{field: field, message: "must not be empty"}
	}

	value, err := strconv.ParseFloat(valueStr, 64)
	if err != nil {
		var numErr *strconv.NumError
		if errors.As(err, &numErr) && numErr.Err == strconv.ErrRange {
			return 0, &operandError{field: field, message: "is too large"}
		}
		return 0, &operandError{field: field, message: "must be a valid number"}
	}

	if math.IsInf(value, 0) || math.IsNaN(value) {
		return 0, &operandError{field: field, message: "is out of supported numeric range"}
	}

	return value, nil
}

type operandError struct {
	field   string
	message string
}

func (e *operandError) Error() string {
	return e.field + " " + e.message
}

func formatResult(value float64) string {
	if value == 0 {
		return "0"
	}

	abs := math.Abs(value)
	if abs >= 1e12 || abs < 1e-9 {
		return strconv.FormatFloat(value, 'e', 10, 64)
	}

	return strconv.FormatFloat(value, 'f', -1, 64)
}
