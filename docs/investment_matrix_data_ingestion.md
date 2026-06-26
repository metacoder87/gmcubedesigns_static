# Data Ingestion Strategy

This document defines the high-throughput, multi-tier data ingestion pipeline for the Investment Matrix platform. The pipeline is designed for local-first execution, reliability, and zero external costs.

---

## 1. Ingestion Pipeline Overview

```
 [Exchange WebSocket]  ──(Sub/Unsub)──> [ stream_allocator ]
         │
         ▼ (Live Trades & Quotes)
 [ app/streamer.py ]
         │
         ▼ (Fast JSON Payloads)
 [ Redis Streams & Hot Cache ]
         │
         ▼ (Consumer Groups)
 [ app/writer.py ]
         │
         ▼ (Bulk Copy/Insert)
 [ PostgreSQL / TimescaleDB ]
         │
         ▼ (Real-Time Hypertables)
 [ Continuous Aggregations / Rollups ] (1s, 5s, 1m, 5m)
```

The system splits the ingestion path into isolated services to ensure that networking, memory buffering, and database persistence do not block each other:
1. **Adapters ([`streamer.py`](file:///c:/Users/milli/millionaire_miller_investments/investment_matrix/app/streamer.py))**: Maintain WebSocket connections, normalize messages, and immediately push to Redis Streams.
2. **Buffer (Redis)**: Absorbs volatility spikes. Ticks are queued in Redis to prevent socket buffers from filling and causing connection drops.
3. **Consumer ([`writer.py`](file:///c:/Users/milli/millionaire_miller_investments/investment_matrix/app/writer.py))**: Pulls ticks from Redis Streams in batches and writes them to TimescaleDB.
4. **Storage (TimescaleDB)**: Manages hypertable compression and continuous aggregates (rollups).

---

## 2. WebSockets vs. REST API Strategy

The system uses a tiered ingestion model to balance real-time granularity against API rate limits:

### A. Live Streams (WebSockets)
WebSocket connections are the primary source for **Tier 1** and **Tier 2** asset data:
- **WebSocket Trade Streams**: Ingest tick-level trades (`price`, `volume`, `side`, `timestamp`) for high-priority pairs from Kraken, Coinbase, and Binance.
- **WebSocket Book Ticker / L1 Quotes**: Ingest best bid/ask prices to monitor spreads, slippage, and real-time bid/ask size dynamics.

*Connection Health & Allocation Strategy*:
- **Dynamic Allocator ([`stream_allocator.py`](file:///c:/Users/milli/millionaire_miller_investments/investment_matrix/app/services/stream_allocator.py))**: Runs every 60 seconds as a Celery task. It dynamically subscribes or unsubscribes to pairs based on a hybrid priority score:
  $$\text{Score} = 30\% \text{ Edge} + 20\% \text{ Liquidity} + 15\% \text{ Volatility} + 10\% \text{ Spread} + 10\% \text{ Data Gaps} + 10\% \text{ Watchlist} + 5\% \text{ Reliability}$$
- **Command Stream**: The allocator publishes per-exchange `replace_set` payloads to `streamer:commands` inside Redis. Streamers process these commands inline without requiring a complete process restart.

### B. Batch Gaps & Metadata (REST APIs)
REST endpoints are restricted to **Tier 3** and **Tier 4** operations:
- **CCXT REST Gaps**: When a stream connection is lost, or a streamer is initialized, the system queries REST endpoints to fill gaps in historical 1-minute OHLCV candle datasets.
- **Fundamental & Metadata Layer**: Fetches protocol statistics, TVL, and coin metadata from CoinGecko, CoinPaprika, and DeFiLlama under public rate limits.

---

## 3. Data Normalization Protocol

To allow downstream quantitative models and the local AI agent desk to execute uniformly, all raw exchange payloads are normalized by the WebSocket adapters:

### A. Symbol Normalization
Exchanges represent asset pairs using custom strings (e.g., `BTC/USDT`, `btcusd`, `XXBTZUSD`). The system normalizes all symbols into a unified `BASE-QUOTE` format:
- **Format**: `BTC-USD`, `ETH-USD`
- **Exchange Conversions**:
  - Binance: `BTCUSDT` $\rightarrow$ `BTC-USD`
  - Kraken: `XBT/USD` $\rightarrow$ `BTC-USD`
  - Coinbase: `BTC-USD` (kept as-is)

### B. Trade Side & Value Normalization
- **Sides**: Standardized to `buy` (maker-sell, taker-buy hitting the ask) and `sell` (maker-buy, taker-sell hitting the bid).
- **Numbers**: Raw strings are parsed into float types at the streamer boundaries to prevent downstream float-parsing exceptions.

### C. Timestamp Normalization (Binance Vision)
When importing historical tick CSV files from Binance Vision, the importer automatically detects timestamp precision variations:
- **Pre-2025 data**: Uses millisecond-level Unix timestamps (`ms`).
- **Post-2025 data**: Uses microsecond-level precision (`µs`).
- **Standardization**: Timestamps are parsed, normalized to UTC-aware datetime objects, and preserved at the highest precision supported by the storage engine.

---

## 4. Storage & Caching Design

### A. Redis Caching & Streaming Buffer
- **Streams (`streamer:ticks`)**: Ingested trades are written to a Redis stream. Stream length is capped at `STREAM_REDIS_MAX_PENDING` (default: `50,000` items) to manage memory utilization under high load.
- **Hot Tick Cache**: The last price, spread, and quote for every active pair are stored in Redis Hashes. The FastAPI app retrieves these values directly, bypassing database queries for real-time tickers.

### B. TimescaleDB Hypertables & Aggregations
- **Raw Ticks**: Persisted in the `ticks` hypertable, partitioned by 7-day chunks.
- **Continuous Aggregations**: TimescaleDB rollups are computed asynchronously. This provides pre-calculated candlesticks at varying resolutions:
  - `1s` Rollups (Intraday volatility)
  - `5s` Rollups (Technical indicator calculation)
  - `1m` & `5m` Rollups (Historical backtesting and quantitative indicator features)
- **Data Retention Policies**: Raw `ticks` are retained for 30 days to limit local disk footprint, while continuous rollups of 1-minute and larger are retained indefinitely.
