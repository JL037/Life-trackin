FROM golang:alpine

RUN apk add --no-cache git curl

# Install Air for hot-reload
RUN go install github.com/air-verse/air@latest

# Install golang-migrate CLI
RUN go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

WORKDIR /app

COPY backend/go.mod ./
RUN go mod download || true

COPY backend/ .
RUN go mod tidy

EXPOSE 8080

CMD ["air", "-c", ".air.toml"]
