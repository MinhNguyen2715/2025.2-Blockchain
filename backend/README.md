# Backend - Digital Diploma System

Backend API for issuing and verifying digital credentials.

## Tech Stack

- NestJS + TypeScript
- TypeORM + PostgreSQL
- ethers.js v6

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Create PostgreSQL database

```bash
createdb diploma
```

Or in pgAdmin/psql:
```sql
CREATE DATABASE diploma;
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

Update `.env` with:
- `DB_PASSWORD`: Your PostgreSQL password
- Contract addresses after deployment

### 4. Start Hardhat node (separate terminal)

```bash
npx hardhat node
```

### 5. Deploy contracts (separate terminal)

```bash
npx hardhat run scripts/deployAll.js --network localhost
```

### 6. Update contract addresses in `.env`

```
ISSUER_REGISTRY_ADDRESS=0x...
CREDENTIAL_REGISTRY_ADDRESS=0x...
DIPLOMA_VERIFIER_ADDRESS=0x...
```

### 7. Run backend

```bash
npm run start:dev
```

Backend running on http://localhost:3000

API Docs: http://localhost:3000/api/docs

## API Endpoints

### University (Issue Credentials)

| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/university/issue | Issue credential to student |
| POST | /api/university/revoke | Revoke credential |
| POST | /api/university/add-issuer | Add authorized issuer |

### Student

| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/student/register | Register student |
| POST | /api/student/transcript | Upload transcript |
| GET | /api/student/credentials/:wallet | Get student's credentials |
| POST | /api/student/generate-proof | Generate Merkle proof |

### Verify

| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/verify/status/:credentialId | Check credential status |
| POST | /api/verify/full | Full verification with proof |

## Example Requests

### Issue Credential

```bash
curl -X POST http://localhost:3000/api/university/issue \
  -H "Content-Type: application/json" \
  -d '{
    "holderAddress": "0x...",
    "issuerWallet": "0x...",
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

### Generate Proof

```bash
curl -X POST http://localhost:3000/api/student/generate-proof \
  -H "Content-Type: application/json" \
  -d '{
    "credentialId": "0x...",
    "courseIds": ["IT1000"]
  }'
```

### Verify

```bash
curl -X POST http://localhost:3000/api/verify/full \
  -H "Content-Type: application/json" \
  -d '{
    "credentialId": "0x...",
    "courseId": "IT1000",
    "courseName": "Introduction to Programming",
    "semester": "2023-1",
    "creditsScaled": 400,
    "grade": "A",
    "proof": ["0x...", ...],
    "signature": "0x..."
  }'
```