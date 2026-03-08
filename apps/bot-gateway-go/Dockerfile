FROM golang:alpine AS builder

WORKDIR /app
RUN apk add --no-cache gcc musl-dev sqlite-dev protobuf-dev

COPY packages/proto /app/packages/proto
COPY apps/bot-gateway-go /app/apps/bot-gateway-go

WORKDIR /app/apps/bot-gateway-go

RUN go mod download
RUN CGO_ENABLED=1 GOOS=linux go build -o bot-gateway-go .

FROM alpine:latest
WORKDIR /app

RUN apk add --no-cache sqlite-libs

COPY --from=builder /app/apps/bot-gateway-go/bot-gateway-go /usr/local/bin/bot-gateway-go

ENV RUST_ENGINE_ADDR=bot-brain-rust:4051

CMD ["bot-gateway-go"]
