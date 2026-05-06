# Backend - Digital Diploma System

REST API for issuing and verifying digital academic credentials.

## Tech Stack

- **Framework**: NestJS + TypeScript
- **Database**: PostgreSQL + TypeORM
- **Blockchain**: ethers.js v6 (connects to Hardhat local node)
- **API Docs**: Swagger/OpenAPI

## Project Structure

```
backend/src/
├── main.ts                    # Application entry point
├── app.module.ts             # Root module
│
├── database/entities/       # TypeORM database entities
│   ├── user.entity.ts      # Student/University users
│   ├── credential.entity.ts # On-chain credential records
│   └── transcript.entity.ts # Off-chain transcript data
│
├── blockchain/            # Smart contract interaction
│   ├── blockchain.module.ts
│   └── services/
│       ├── contract.service.ts    # Load contracts, manage wallet
│       ├── issuer.service.ts     # IssuerRegistry operations
│       ├── credential.service.ts  # CredentialRegistry operations
│       └── verifier.service.ts    # DiplomaVerifier operations
│
├── shared/
│   ├── shared.module.ts
│   └── diploma.utils.ts    # ECC signing + Merkle tree utilities
│
└── modules/
    ├── university/      # University APIs (issuer)
    ├── student/         # Student APIs
    └── verify/          # Verification APIs
```

## Setup

### Prerequisites

1. PostgreSQL installed and running
2. Hardhat node running (for blockchain)
3. Contracts deployed

### Installation

```bash
cd backend
npm install
```

### Database Setup

Create PostgreSQL database:

```bash
createdb diploma
```

Or in psql:

```sql
CREATE DATABASE diploma;
```

### Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=diploma
BLOCKCHAIN_RPC_URL=http://localhost:8545
UNIVERSITY_PRIVATE_KEY=0x...
ISSUER_REGISTRY_ADDRESS=0x...
CREDENTIAL_REGISTRY_ADDRESS=0x...
DIPLOMA_VERIFIER_ADDRESS=0x...
```

### Running

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

Backend runs on `http://localhost:3000`

## API Endpoints

### University (Issuer)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/university/issue` | Issue credential to student |
| POST | `/api/university/revoke` | Revoke credential |
| POST | `/api/university/add-issuer` | Add authorized issuer |

### Student

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/student/register` | Register student |
| POST | `/api/student/transcript` | Upload transcript |
| GET | `/api/student/credentials/:wallet` | Get my credentials |
| POST | `/api/student/generate-proof` | Generate Merkle proof |

### Verify

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/verify/status/:credentialId` | Check credential status |
| POST | `/api/verify/full` | Full verification with proof |

## API Documentation

Swagger UI available at: `http://localhost:3000/api/docs`

## Example Requests

### Issue Credential

```bash
curl -X POST http://localhost:3000/api/university/issue \
  -H "Content-Type: application/json" \
  -d '{
    "holderAddress": "0x1234...",
    "issuerWallet": "0xABCD...",
    "studentId": "20220001",
    "studentName": "Nguyen Van A",
    "transcript": [
      {
        "courseId": "IT1000",
        "courseName": "Introduction to Programming",
        "semester": "2023-1",
        "creditsScaled": 400,
        "grade": "A"
      }
    ]
  }'
```

### Register Student

```bash
curl -X POST http://localhost:3000/api/student/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234...",
    "name": "Nguyen Van A",
    "studentId": "20220001"
  }'
```

### Generate Proof

```bash
curl -X POST http://localhost:3000/api/student/generate-proof \
  -H "Content-Type: application/json" \
  -d '{
    "credentialId": "0xabcd...",
    "courseIds": ["IT1000"]
  }'
```

### Verify Credential Status

```bash
curl http://localhost:3000/api/verify/status/0xabcd...
```

### Full Verification

```bash
curl -X POST http://localhost:3000/api/verify/full \
  -H "Content-Type: application/json" \
  -d '{
    "credentialId": "0xabcd...",
    "courseId": "IT1000",
    "courseName": "Introduction to Programming",
    "semester": "2023-1",
    "creditsScaled": 400,
    "grade": "A",
    "proof": ["0x...", "0x..."],
    "signature": "0x..."
  }'
```

## Architecture

### Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌───────────────┐
│   Frontend   │────▶│   Backend    │────▶│  Blockchain   │
│  (User UI)   │     │  (NestJS)   │     │  (Hardhat)   │
└──────────────┘     └──────────────┘     └───────────────┘
                           │
                    ┌──────┴──────┐
                    │ PostgreSQL  │
                    │   (DB)      │
                    └─────────────┘
```

### Credential Issuance Flow

1. University submits transcript data via `/api/university/issue`
2. Backend builds Merkle tree from courses
3. Backend signs credential with university's wallet (EIP-712)
4. Backend calls smart contract `issueCredential()`
5. On-chain: credential stored with merkleRoot
6. Off-chain: transcript saved to PostgreSQL

### Verification Flow

1. Verifier submits course data + Merkle proof via `/api/verify/full`
2. Backend verifies:
   - Credential exists and not revoked
   - Issuer is authorized
   - Signature is valid
   - Merkle proof matches stored root

## Security Notes

- Never commit private keys to version control
- Use environment variables for sensitive data
- Validate all inputs in production
- Consider rate limiting for public APIs

## Troubleshooting

### Connection refused to blockchain

Ensure Hardhat node is running:

```bash
npx hardhat node
```

### Database connection error

Check PostgreSQL is running and credentials in `.env` are correct.

### Contract not found

Deploy contracts first:

```bash
npx hardhat run scripts/deployAll.js --network localhost
```

Then update contract addresses in `.env`.

## License

ISC