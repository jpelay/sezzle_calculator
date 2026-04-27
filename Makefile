BACKEND_DIR := backend
FRONTEND_DIR := frontend/calculator
BACKEND_COVERAGE_DIR := $(BACKEND_DIR)/coverage

.PHONY: dev dev-down prod-up prod-down coverage coverage-backend coverage-frontend

dev:
	docker compose -f docker-compose.dev.yml up

dev-down:
	docker compose -f docker-compose.dev.yml down

prod-up:
	docker compose -f docker-compose.prod.yml up --build -d

prod-down:
	docker compose -f docker-compose.prod.yml down

coverage: coverage-backend coverage-frontend

coverage-backend:
	mkdir -p $(BACKEND_COVERAGE_DIR)
	cd $(BACKEND_DIR) && go test ./... -covermode=atomic -coverprofile=coverage/coverage.out
	cd $(BACKEND_DIR) && go tool cover -func=coverage/coverage.out
	cd $(BACKEND_DIR) && go tool cover -html=coverage/coverage.out -o coverage/index.html

coverage-frontend:
	cd $(FRONTEND_DIR) && npm run test:coverage