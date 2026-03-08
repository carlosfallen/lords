# 1. Builder usando Ubuntu 24.04 para garantir Glibc moderna
FROM ubuntu:24.04 AS builder

# Evita perguntas interativas durante a instalação
ENV DEBIAN_FRONTEND=noninteractive

# Instalar Rust e dependências de build
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    protobuf-compiler \
    libprotobuf-dev \
    pkg-config \
    libssl-dev \
    cmake \
    git \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Instalar o Rust manualmente (estável)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app

# Copia os protos e código
COPY packages/proto /app/packages/proto
COPY apps/bot-brain-rust/Cargo.toml /app/apps/bot-brain-rust/Cargo.toml
COPY apps/bot-brain-rust/build.rs /app/apps/bot-brain-rust/build.rs
COPY apps/bot-brain-rust/src /app/apps/bot-brain-rust/src

WORKDIR /app/apps/bot-brain-rust

# Compilação em release
RUN cargo build --release

# --- Estágio Final ---
FROM ubuntu:24.04
WORKDIR /app

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

# Copia o binário final
COPY --from=builder /app/apps/bot-brain-rust/target/release/bot-brain-rust /usr/local/bin/bot-brain-rust

# Configurações de ambiente
ENV REDIS_URL=redis://redis:6379
ENV RUST_APP_ADDR=0.0.0.0:4051 

EXPOSE 4051

CMD ["bot-brain-rust"]