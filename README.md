# 📘 Digital Diploma Smart Contract System

## 📌 Overview

This project implements a **Digital Diploma Issuance and Verification System** using smart contracts.

### 🎯 Objectives

- Allow a student (Holder) to prove graduation
- Avoid revealing full transcript or unnecessary personal data
- Support **revocation** of invalid diplomas
- Enable **selective disclosure** using a **Merkle Tree**

---

## 🏗️ System Architecture

```text
IssuerRegistry → CredentialRegistry → DiplomaVerifier
```

### Components

| Component | Description |
|----------|-------------|
| IssuerRegistry | Manage authorized universities |
| CredentialRegistry | Store issued diplomas and revocation status |
| DiplomaVerifier | Verify diploma validity |

---

## 📁 Project Structure

```text
digital-diploma-contracts/
│
├── contracts/
│   ├── IssuerRegistry.sol
│   ├── CredentialRegistry.sol
│   ├── DiplomaVerifier.sol
│   │
│   ├── interfaces/
│   │   ├── IIssuerRegistry.sol
│   │   └── ICredentialRegistry.sol
│   │
│   └── libraries/
│       ├── DiplomaStructs.sol
│       ├── DiplomaErrors.sol
│       └── DiplomaEvents.sol
│
├── scripts/
│   ├── deployAll.js
│   ├── demoFlow.js
│   └── demoMerkleProof.js
│
├── deployments/
│   └── localhost.json
│
├── test/
│   ├── IssuerRegistry.test.js
│   ├── CredentialRegistry.test.js
│   └── DiplomaVerifier.test.js
│
├── hardhat.config.ts
├── package.json
└── README.md
```

---

## 📄 File Descriptions

### `contracts/IssuerRegistry.sol`

Manages the list of authorized universities.

Main responsibilities:
- Store authorized issuers
- Allow only the owner to add or remove issuers
- Provide issuer validation for other contracts

---

### `contracts/CredentialRegistry.sol`

Stores diploma-related data.

Main data:
- `credentialId`
- `issuer`
- `holder`
- `merkleRoot`
- `metadataHash`
- `revoked`

Main responsibilities:
- Issue credential
- Revoke credential
- Return credential information

---

### `contracts/DiplomaVerifier.sol`

Handles verification logic.

Main responsibilities:
- Check whether issuer is authorized
- Check whether credential exists
- Check whether credential has been revoked
- Return the Merkle root of a valid credential
- Verify Merkle proof on chain

---

### `contracts/interfaces/IIssuerRegistry.sol`

Interface used by other contracts to verify issuer status.

---

### `contracts/interfaces/ICredentialRegistry.sol`

Interface used by verifier contracts to access credential data.

---

### `contracts/libraries/DiplomaStructs.sol`

Contains reusable struct definitions.

---

### `contracts/libraries/DiplomaErrors.sol`

Contains custom error definitions.

---

### `contracts/libraries/DiplomaEvents.sol`

Contains shared event definitions.

---

### `scripts/deployAll.js`

Deploys the full smart contract system in the correct order:
1. `IssuerRegistry`
2. `CredentialRegistry`
3. `DiplomaVerifier`

---

### `scripts/demoFlow.js`

Runs a full demo workflow:
1. Add issuer
2. Issue credential
3. Verify credential
4. Revoke credential
5. Verify again

---
### `scripts/demoMerkleProof.js`

Runs an end-to-end Merkle proof demo:
- Generate transcript
- Build Merkle tree (off-chain)
- Generate Merkle proof
- Issue credential with Merkle root
- Verify proof on-chain
---

### `test/`

Contains unit tests for all smart contracts.

---

## ⚙️ Setup

### Install dependencies

```bash
npm install
```

### Compile contracts

```bash
npx hardhat compile
```

### Run tests

```bash
npx hardhat test
```

---

## 🚀 Run Local Blockchain

### Step 1: Start local node

```bash
npx hardhat node
```

### Step 2: Deploy contracts

```bash
npx hardhat run scripts/deployAll.js --network localhost
```

### Step 3: Run demo flow

```bash
npx hardhat run scripts/demoFlow.js --network localhost
```

### Step 4: Run Merkle proof demo

```bash
npx hardhat run scripts/demoMerkleProof.js --network localhost
```
---

## 🔄 System Workflow

### Step 1: Add issuer

```text
Admin → IssuerRegistry.addIssuer()
```

The system owner adds a university address into the issuer registry.

---

### Step 2: Issue credential

```text
Issuer → CredentialRegistry.issueCredential()
```

The authorized issuer issues a diploma credential for a holder.

Stored data includes:
- `credentialId`
- `issuer`
- `holder`
- `merkleRoot`
- `metadataHash`

---

### Step 3: Verify credential

```text
Verifier → DiplomaVerifier.verifyCredentialStatus()
```

The verifier checks whether:
- the credential exists
- the credential is not revoked
- the issuer is still authorized

---

### Step 4: Revoke credential

```text
Issuer → CredentialRegistry.revokeCredential()
```

The issuer revokes an issued credential.

---

### Step 5: Verify again

```text
Verifier → DiplomaVerifier.verifyCredentialStatus() → false
```

After revocation, the verifier should receive `false`.

---

## 🌳 Merkle Tree and Selective Disclosure

This system supports selective disclosure through a Merkle Tree design:

- Each course/grade pair is represented as a leaf node
- Only the `merkleRoot` is stored on-chain
- The holder provides:
  - the requested leaf data
  - the corresponding Merkle proof

This allows the holder to prove only specific academic information without revealing the full transcript.

---

## 🔐 ECC Signature

ECC signing is handled **off-chain**.

Typical design:
- The university signs the credential off-chain
- The backend or verifier checks the signature
- The smart contracts manage:
  - issuer registry
  - revocation status
  - Merkle root storage

---
## Course Structure (Sugestion)
```json
{
  "studentId": "20220001",
  "name": "Nguyen Van A",
  "program": "Computer Science",
  "courses": [
    {
      "courseId": "IT1000",
      "courseName": "Introduction to Programming",
      "semester": "2023-1",
      "credits": 4.0,
      "grade": "A"
    },
    {
      "courseId": "IT2001",
      "courseName": "Data Structures",
      "semester": "2023-2",
      "credits": 3.0,
      "grade": "B+"
    },
    {
      "courseId": "IT3002",
      "courseName": "Computer Networks",
      "semester": "2024-1",
      "credits": 3.0,
      "grade": "B+"
    },
    {
      "courseId": "IT4003",
      "courseName": "Cryptography",
      "semester": "2024-2",
      "credits": 3.0,
      "grade": "A+"
    }
  ]
}
```

---

## 📊 Implemented Features

- ✅ Issuer registry
- ✅ Credential issuance
- ✅ Revocation list
- ✅ Verification logic
- ✅ Merkle root storage

<!-- ---

## 🚀 Future Improvements

Possible extensions:
- On-chain Merkle proof verification
- On-chain ECC signature verification
- Frontend interface for verification
- Deployment to Sepolia testnet -->

---

## ⚠️ Notes

- This project currently uses the Hardhat local network
- Do **not** use local test private keys on public networks

---

## 🎯 Conclusion

This system provides:

- Secure digital diploma issuance
- Efficient on-chain verification
- Privacy-preserving data sharing
- Revocation support for invalid credentials
