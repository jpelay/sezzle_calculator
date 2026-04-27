FROM golang:1.26-alpine AS backend-builder

WORKDIR /app/backend

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server .


FROM alpine:3.22

WORKDIR /app

RUN adduser -D -H appuser

COPY --from=backend-builder /app/server /app/server

ENV GIN_MODE=release
ENV HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

USER appuser

CMD ["/app/server"]
