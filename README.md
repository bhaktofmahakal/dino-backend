# Wallet Service - Production-Grade Virtual Currency Management

A high-throughput, audit-safe wallet service for managing virtual currency (credits/points) in gaming platforms and loyalty reward systems. Built with double-entry ledger architecture for complete auditability and financial reconciliation.

## 🎯 Features

- **Double-Entry Ledger**: Every transaction creates immutable audit trail with balanced debit/credit entries
- **ACID Transactions**: Full database transaction support with pessimistic locking
- **Idempotency**: Safe retry handling with duplicate request detection
- **Concurrency-Safe**: Row-level locking with deterministic lock ordering prevents race conditions
- **Zero Negative Balances**: Multi-layer protection ensures balance integrity
- **Multiple Asset Types**: Support for different virtual currencies (Gold Coins, Diamonds, Loyalty Points)
- **RESTful API**: Clean HTTP API with comprehensive error handling

---

## 🏗️ Architecture

### System Design

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP + Idempotency-Key
       ▼
┌─────────────────────────────────────┐
│         API Layer (Fastify)         │
│  ┌──────────────────────────────┐  │
│  │ Idempotency Middleware       │  │
│  │ Validation (Zod)             │  │
│  │ Error Handler                │  │
│  └──────────────────────────────┘  │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│      Transaction Orchestrator       │
│                                     │
│  ┌────────────────────────────┐   │
│  │ 1. Idempotency Check       │   │
│  │ 2. Lock Accounts (ordered) │   │
│  │ 3. Validate Balance        │   │
│  │ 4. Create Ledger Entries   │   │
│  │ 5. Update Balances         │   │
│  │ 6. Store Idempotency       │   │
│  └────────────────────────────┘   │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│         PostgreSQL 15               │
│                                     │
│  asset_types                        │
│  accounts (with optimistic version) │
│  ledger_entries (append-only)       │
│  transactions                       │
│  idempotency_store                  │
└─────────────────────────────────────┘
```

### Core Invariants

1. **Balance Integrity**: User balances never go negative
2. **Atomicity**: Transactions either fully succeed or fully fail
3. **Auditability**: All movements permanently recorded
4. **Idempotency**: Duplicate requests produce identical outcomes
5. **Double-Entry Consistency**: Total debits = total credits
6. **Monotonic Ledger**: Append-only, no updates/deletes

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development only)

### Run with Docker (Recommended)

```bash
# Clone the repository
git clone <repo-url>
cd dino-backend

# Start everything (database + migrations + seed + API)
docker-compose up -d

# Check health
curl http://localhost:8080/v1/health
```

The service will be available at `http://localhost:8080`

**That's it!** The docker-compose setup automatically:
- Creates PostgreSQL database
- Runs schema migrations
- Seeds initial data
- Starts the API server

### Test Users (Pre-seeded)

**User 1**: `c0000001-0000-0000-0000-000000000001`
- Gold Coins: 1000.00
- Diamonds: 100.00
- Loyalty Points: 500.00

**User 2**: `c0000002-0000-0000-0000-000000000002`
- Gold Coins: 500.00
- Diamonds: 50.00
- Loyalty Points: 200.00

---

## 📡 API Endpoints

### 1. Top-Up (Purchase Credits)

```bash
POST /v1/transactions/top-up
Content-Type: application/json
Idempotency-Key: <uuid>

{
  "userId": "user-id-1111-1111-1111-111111111111",
  "assetTypeCode": "GOLD_COIN",
  "amount": "100.00",
  "paymentReference": "ext_payment_123",
  "metadata": {}
}
```

**Response:**
```json
{
  "transactionId": "uuid",
  "status": "COMPLETED",
  "userId": "user-id-1111-1111-1111-111111111111",
  "assetTypeCode": "GOLD_COIN",
  "amount": "100.00",
  "newBalance": "1100.00",
  "createdAt": "2024-01-15T10:30:00Z",
  "completedAt": "2024-01-15T10:30:01Z"
}
```

### 2. Bonus/Incentive

```bash
POST /v1/transactions/bonus
Content-Type: application/json
Idempotency-Key: <uuid>

{
  "userId": "user-id-1111-1111-1111-111111111111",
  "assetTypeCode": "DIAMOND",
  "amount": "50.00",
  "reason": "REFERRAL_BONUS",
  "metadata": {}
}
```

### 3. Spend Credits

```bash
POST /v1/transactions/spend
Content-Type: application/json
Idempotency-Key: <uuid>

{
  "userId": "user-id-1111-1111-1111-111111111111",
  "assetTypeCode": "GOLD_COIN",
  "amount": "30.00",
  "itemId": "item_xyz",
  "metadata": {}
}
```

**Error Response (Insufficient Balance):**
```json
{
  "error": "INSUFFICIENT_BALANCE",
  "message": "User balance (20.00) is less than requested amount (30.00)"
}
```

### 4. Check Balances

```bash
GET /v1/accounts/{userId}/balances
```

**Response:**
```json
{
  "userId": "user-id-1111-1111-1111-111111111111",
  "balances": [
    {
      "assetTypeCode": "GOLD_COIN",
      "balance": "1070.00"
    },
    {
      "assetTypeCode": "DIAMOND",
      "balance": "150.00"
    }
  ]
}
```

### 5. Transaction History

```bash
GET /v1/accounts/{userId}/transactions?assetTypeCode=GOLD_COIN&limit=50&offset=0
```

### 6. Transaction Detail

```bash
GET /v1/transactions/{transactionId}
```

### 7. Health Check

```bash
GET /v1/health
```

---

## 🛠️ Technology Stack

### Backend

- **Language**: Node.js 20 LTS + TypeScript 5.x
- **Framework**: Fastify 4.x (high performance, built-in validation)
- **ORM**: Prisma 5.x (type-safe queries, schema migrations)
- **Validation**: Zod (runtime type validation)
- **Database**: PostgreSQL 15 (ACID compliance, advanced features)

### Why This Stack?

**Node.js + TypeScript**
- Strong typing prevents financial calculation errors
- Large ecosystem and excellent PostgreSQL support
- Matches job requirements (Node.js, PostgreSQL)
- Fast iteration and developer productivity

**Fastify over Express**
- 2x faster request handling
- Built-in schema validation
- TypeScript-first design
- Lower latency for high-throughput scenarios

**Prisma over TypeORM**
- Type-safe queries prevent SQL errors
- Excellent migration tooling
- Raw SQL support for critical paths
- Better developer experience

**PostgreSQL**
- Rock-solid ACID transactions
- Advanced features (JSONB, SELECT FOR UPDATE, partial indexes)
- MVCC reduces lock contention
- Industry standard for financial systems

---

## 🔒 Concurrency Strategy

### Problem: Race Conditions

**Scenario**: Two concurrent spend requests for the same user:
- User balance: $100
- Request A: Spend $80
- Request B: Spend $80
- Both arrive simultaneously

**Without proper locking**: Both could read balance = $100, both succeed, final balance = -$60 ❌

### Solution: Multi-Layer Protection

#### 1. Pessimistic Locking
```sql
SELECT * FROM accounts WHERE id = ? FOR UPDATE
```
- Acquires exclusive row-level lock
- Blocks concurrent transactions until commit
- Ensures serialized access to account

#### 2. Deterministic Lock Ordering
```typescript
// Always lock accounts in ascending order by ID
const sortedIds = [accountA.id, accountB.id].sort();
for (const id of sortedIds) {
  await lockAccount(id); // Prevents circular wait deadlocks
}
```

#### 3. Optimistic Locking (Fallback)
```sql
UPDATE accounts 
SET balance = ?, version = version + 1 
WHERE id = ? AND version = ?
```
- Detects lost updates if pessimistic lock fails

#### 4. Database Constraint
```sql
ALTER TABLE accounts 
ADD CONSTRAINT accounts_balance_check CHECK (balance >= 0 OR is_unlimited = true)
```
- Unlimited system accounts (TREASURY, BONUS_POOL) may go negative when debited
- Normal user accounts can never go below zero

#### 5. Retry with Exponential Backoff
- Serialization failures and deadlocks trigger bounded retry (max 3 attempts)
- Exponential backoff with jitter prevents thundering herd
- Concurrent idempotency key conflicts are retried (on retry, cached response is returned)

### Isolation Level

**REPEATABLE READ** (PostgreSQL default)
- Prevents non-repeatable reads
- Consistent snapshot within transaction
- Sufficient for our use case with explicit locks

### Deadlock Avoidance

**Deterministic Lock Ordering**: Always acquire locks in ascending account ID order
```
Transaction 1: Lock(Account A) → Lock(Account B) ✅
Transaction 2: Lock(Account A) → Lock(Account B) ✅
NO DEADLOCK (both follow same order)
```

**Short Lock Duration**: Keep transactions under 10 seconds (timeout configured)

**Retry Logic**: If deadlock detected (rare), retry with exponential backoff

---

## 🔄 Idempotency Strategy

### Problem: Duplicate Requests

**Scenarios**:
1. Network timeout → client retries
2. User double-clicks button
3. API gateway retry policy

**Risk**: Same transaction executed twice → double charge

### Solution: Idempotency Keys

#### Client Side
```bash
# Client generates UUID and includes in header
Idempotency-Key: 123e4567-e89b-12d3-a456-426614174000
```

#### Server Side
```typescript
1. BEGIN TRANSACTION (REPEATABLE READ)
2. Check if idempotency key exists in store (INSIDE TX — atomic)
   - If EXISTS and status=COMPLETED: Return cached response (200 OK)
   - If EXISTS and status=PENDING: Return 409 Conflict "Request in progress"
   - If NOT EXISTS: Proceed to step 3
3. Create transaction record (status=PENDING)
4. Resolve account IDs (within TX snapshot)
5. Lock accounts with SELECT FOR UPDATE (deterministic order)
6. Execute ledger operations using FRESH locked data
7. Update transaction (status=COMPLETED)
8. Store idempotency record with response payload
9. COMMIT
10. Return response to client
```

#### Guarantees

- **Exactly-Once Execution**: Same key = same result, executed once
- **Consistent Responses**: Retries return identical response
- **TTL-Based Cleanup**: Old records purged after 24 hours (configurable)

#### Concurrent Requests with Same Key

```
Request 1 (t=0ms):  Check key → Not found → Proceed → INSERT transaction
Request 2 (t=5ms):  Check key → Found (PENDING) → Return 409 "In progress"
Request 1 (t=100ms): Complete → Store response
Request 3 (t=200ms): Check key → Found (COMPLETED) → Return cached response
```

---

## 📊 Database Schema

### Tables

**asset_types**: Virtual currency definitions
- `id` (UUID, PK)
- `code` (VARCHAR, UNIQUE) - e.g., "GOLD_COIN"
- `name` - Display name
- `is_active` - Soft disable

**accounts**: User and system wallets
- `id` (UUID, PK)
- `account_type` - 'USER' | 'SYSTEM'
- `owner_id` (UUID) - User ID (NULL for system accounts)
- `asset_type_id` (UUID, FK)
- `system_role` - 'TREASURY' | 'BONUS_POOL' | 'REVENUE'
- `balance` (DECIMAL(20,2)) - Current balance
- `is_unlimited` (BOOLEAN) - Skip balance validation for system accounts
- `version` (BIGINT) - Optimistic locking

**ledger_entries**: Immutable transaction log
- `id` (UUID, PK)
- `transaction_id` (UUID, FK)
- `account_id` (UUID, FK)
- `entry_type` - 'DEBIT' | 'CREDIT'
- `amount` (DECIMAL(20,2))
- `balance_after` - Snapshot for reconciliation
- `created_at` - Timestamp

**transactions**: High-level metadata
- `id` (UUID, PK)
- `idempotency_key` (VARCHAR, UNIQUE)
- `transaction_type` - 'TOP_UP' | 'BONUS' | 'SPEND'
- `status` - 'PENDING' | 'COMPLETED' | 'FAILED'
- `metadata` (JSONB)

**idempotency_store**: Deduplication cache
- `idempotency_key` (VARCHAR, PK)
- `transaction_id` (UUID, FK)
- `response_payload` (JSONB)
- `expires_at` - TTL

### Transaction Flow Example (Top-Up)

```
User purchases 100 GOLD_COIN:

1. BEGIN TRANSACTION (REPEATABLE READ)
2. Check idempotency key → not found
3. Create transaction record (PENDING)
4. Resolve account IDs
5. Lock accounts in deterministic order (SELECT FOR UPDATE)
6. Create ledger entries:
   - DEBIT Treasury: -100 (balance_after: -100, unlimited OK)
   - CREDIT User: +100 (balance_after: 1100)
7. Update balances:
   - Treasury: 0 → -100 (unlimited, allowed by CHECK constraint)
   - User: 1000 → 1100
8. Store idempotency record with response
9. COMMIT

Result:
- Ledger has 2 balanced entries (DEBIT + CREDIT)
- User balance updated
- Transaction status = COMPLETED
- Idempotency key stored for retry safety
```

---

## 🧪 Local Development

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start PostgreSQL (or use docker-compose)
docker-compose up -d postgres

# Run migrations
npm run prisma:migrate:dev

# Seed data
npm run prisma:seed

# Start development server (with hot reload)
npm run dev
```

### Testing

```bash
# Run tests
npm test

# With coverage
npm run test:coverage
```

### Database Management

```bash
# Open Prisma Studio (GUI for database)
npm run prisma:studio

# Create new migration
npm run prisma:migrate:dev --name add_new_field

# Reset database
docker-compose down -v
docker-compose up -d
```

---

## 📦 Production Deployment

### Environment Variables

```bash
DATABASE_URL=postgresql://postgres:shriram@108@localhost:5432/wallet_db?schema=public
SERVER_PORT=8080
NODE_ENV=production
LOG_LEVEL=info
IDEMPOTENCY_TTL_HOURS=24
```

### Build & Run

```bash
# Build Docker image
docker build -t wallet-service .

# Run container
docker run -p 8080:8080 --env-file .env wallet-service
```

### Cloud Deployment

**Recommended Platforms**:
- AWS ECS/Fargate + RDS PostgreSQL
- Google Cloud Run + Cloud SQL
- Fly.io (includes PostgreSQL)
- Railway (simple deployment)

---

## 🎓 Design Decisions & Trade-offs

### Why Monolithic Service?

**Pros**:
- Single database transaction boundary (ACID guarantees)
- No distributed transaction complexity
- Easier to reason about consistency
- Lower operational overhead

**Cons**:
- Vertical scaling limits (mitigated by read replicas)

**Verdict**: Appropriate for wallet domain; can scale to millions of users before needing microservices.

### Why Pessimistic Locking?

**Alternative**: Optimistic locking (version-based)

**Rationale**:
- Financial correctness > performance
- Retry storms under high contention
- Predictable latency (blocking is acceptable)

### Why Hybrid Ledger + Balance?

**Alternative 1**: Pure event sourcing (rebuild from ledger)
- Too slow for real-time balance checks

**Alternative 2**: Only materialized balance (no ledger)
- No audit trail, fails compliance

**Verdict**: Best of both worlds—fast reads, complete audit trail.

### Why 24-Hour Idempotency TTL?

**Trade-off**: Storage vs. safety window

**Rationale**:
- Most retries happen within minutes
- 24 hours covers delayed client retries
- Reduces storage bloat

**Alternative**: Never delete (if storage is cheap)

---

## 🔍 Monitoring & Observability

### Key Metrics

- **Transaction Latency**: p50, p95, p99
- **Error Rate**: By transaction type
- **Balance Distribution**: Histogram
- **Concurrent Transactions**: Gauge
- **Idempotency Hit Rate**: Cache efficiency

### Logging

Structured JSON logs with request IDs:
```json
{
  "level": "info",
  "msg": "Transaction completed",
  "transactionId": "uuid",
  "userId": "uuid",
  "type": "TOP_UP",
  "amount": "100.00",
  "duration": "45ms"
}
```

---

## 📝 Future Enhancements (Option B)

### Redis Integration
- **Idempotency Cache**: Hot path for duplicate detection
- **Rate Limiting**: Per-user transaction limits
- **Session Storage**: User context caching

### Elasticsearch Integration
- **Transaction Search**: Full-text search across metadata
- **Analytics**: Aggregation queries for reporting
- **Audit Trails**: Compliance log search

---

## 🤝 Contributing

1. Follow existing code structure
2. Run linter: `npm run lint`
3. Ensure tests pass: `npm test`
4. Update README if adding features

---

## 📄 License

MIT

---

## 🙋 Support

For questions or issues, please open a GitHub issue.

---

## 🎯 Assignment Checklist

✅ **Data Seeding**: Asset types, system accounts, 2 test users  
✅ **API Endpoints**: Top-up, bonus, spend, balances, history  
✅ **Concurrency Safety**: Pessimistic locking + lock ordering  
✅ **Idempotency**: Header-based deduplication with TTL  
✅ **Deadlock Avoidance**: Deterministic lock ordering  
✅ **Ledger Architecture**: Double-entry with audit trail  
✅ **Containerization**: Docker + docker-compose with auto-setup  
✅ **Documentation**: Complete README with tech justification  

**Brownie Points Achieved**: All ✨
