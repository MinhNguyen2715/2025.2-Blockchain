# DIGITAL DIPLOMA ISSUANCE AND VERIFICATION SYSTEM

## OVERVIEW

This project is a Digital Diploma Issuance and Verification System.

The application allows:

* Admin to authorize universities.
* University to issue digital diplomas to students.
* Student to generate proof for selected diploma or transcript information.
* Verifier to verify diploma validity through blockchain.

The system uses blockchain to store verification-critical data and uses PostgreSQL to store detailed academic data.

On-chain data:

* Credential ID
* Issuer address
* Holder address
* Merkle root
* Metadata hash
* Revocation status
* Issue timestamp

Off-chain data:

* Student information
* Degree information
* Transcript
* Course information
* Grade and credit information

The main idea is that the verifier does not need to trust the database directly. The verifier checks the credential status and Merkle proof against blockchain data.

## MAIN ROLES

### Admin

The admin manages authorized universities.

Admin can:

* Add a university issuer address.
* Allow that issuer to issue valid credentials.

### University / Issuer

The university issues and revokes digital diploma credentials.

University can:

* Issue a diploma credential to a student.
* Revoke a credential if needed.

### Student / Holder

The student owns the credential.

Student can:

* Register a wallet address.
* View issued credentials.
* Generate proof for selected course or degree information.

### Verifier

The verifier checks whether a diploma or selected academic information is valid.

Verifier can:

* Check credential status.
* Verify course proof.
* Verify degree proof.

## SYSTEM FLOW

### Issuer Authorization Flow

1. Admin enters the university issuer address and issuer name.
2. Backend checks the admin API key.
3. Backend sends a transaction to IssuerRegistry smart contract.
4. IssuerRegistry stores the university address as an authorized issuer.
5. The university is now allowed to issue credentials.

### Student Registration Flow

1. Student enters wallet address and personal information.
2. Backend stores the student information in PostgreSQL.
3. The student can now receive credentials from a university.

### Credential Issuance Flow

1. University enters student, degree, and transcript information.
2. Backend checks whether the issuer address is authorized on-chain.
3. Backend creates Merkle leaves from degree and transcript data.
4. Backend builds a Merkle tree.
5. Backend gets the Merkle root.
6. Backend creates a credential ID and metadata hash.
7. Backend signs the credential data using the issuer private key.
8. Backend sends a transaction to CredentialRegistry smart contract.
9. Smart contract verifies:

   * The credential ID has not been used.
   * The issuer is authorized.
   * The issuer signature is valid.
   * The credential data is valid.
10. Smart contract stores the credential verification data on-chain.
11. Backend stores detailed student, degree, and transcript data in PostgreSQL.

After this flow, the student has a valid digital diploma credential.

### Proof Generation Flow

1. Student selects a credential.
2. Student chooses which information to prove, such as:

   * A specific course
   * Degree name
   * Major
   * Graduation year
3. Backend checks whether the credential belongs to the student wallet.
4. Backend loads the full transcript and degree data from PostgreSQL.
5. Backend rebuilds the same Merkle tree used during issuance.
6. Backend generates a Merkle proof for the selected information.
7. Student receives the proof and can send it to a verifier.

This allows selective disclosure. The student does not need to reveal the full transcript.

### Verification Flow

1. Verifier receives:
   * Credential ID
   * Selected academic information
   * Merkle proof
2. Verifier submits the data to the verification API or frontend page.
3. Backend reads the credential data from the smart contract.
4. The system checks:
   * Credential exists.
   * Credential is not revoked.
   * Issuer is still authorized.
   * Merkle proof matches the on-chain Merkle root.
5. If all checks pass, the proof is valid.
6. If one check fails, the proof is invalid.

### Revocation Flow

1. University enters the credential ID to revoke.
2. Backend sends a transaction to CredentialRegistry smart contract.
3. Smart contract checks that the caller is the original issuer.
4. Credential status is changed to revoked.
5. Future verification will fail because the credential is no longer active.

## BASIC DEMO FLOW

Use this order when demonstrating the system.

### Step 1: Start the system

Run:
```
.\run-local.ps1
```
The script will automatically check the required local tools and install missing prerequisites when possible. It also installs the project dependencies for the root project, backend, and frontend.

If your local PostgreSQL password is different, pass it using the -PostgresPassword parameter:
```
.\run-local.ps1 -PostgresPassword "your_postgres_password"
```
Example:
```
.\run-local.ps1 -PostgresPassword "postgres"
```



If automatic installation is blocked or fails because of permissions, missing winget, Windows policy, or PostgreSQL setup requirements, install the missing tools manually and run the script again.

After startup, open:
- Frontend: http://localhost:5173
- Backend API docs: http://localhost:3000/api/docs
- Hardhat RPC: http://127.0.0.1:8545

### Step 2: Check smart contract deployment

Open the Hardhat terminal or backend .env file and check that the following contracts are deployed:

- IssuerRegistry
- CredentialRegistry
- DiplomaVerifier

### Step 3: Authorize issuer

Open:
```
http://localhost:5173/#/admin
```
Enter:
```
Admin API key: 123456
Issuer wallet: 0x70997970c51812dc3a010c7d01b50e0d17dc79c8
Issuer name: Hanoi University of Science and Technology
```
Submit the form.

Note: the setup script may already authorize the demo issuer automatically. If so, this step can be used to demonstrate the admin function.

### Step 4: Issue credential

Open:
```
http://localhost:5173/#/university
```

Enter the issuer API key: ```demo-issuer-key```

Use the demo issuer wallet:
```
0x70997970c51812dc3a010c7d01b50e0d17dc79c8
```
Use the demo student wallet:
```
0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc
```
Enter sample student, degree, and transcript data.
Submit the form to issue the credential.

Expected output:

- credentialId
- merkleRoot
- issuer signature
- transaction hash

### Step 5: Generate proof

Open:
```
http://localhost:5173/#/student
```
Use the student wallet:
```
0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc
```
- Load the issued credential.
- Select a course or degree claim.
- Generate the Merkle proof.
- Download or copy the proof package.

### Step 6: Verify proof

Open:
```
http://localhost:5173/#/verify
```
Upload or paste the proof package generated by the student.

Expected result:
- Valid proof
- Credential exists
- Issuer is authorized
- Credential is not revoked
- Merkle proof matches the on-chain root

### Step 7: Revoke credential

Open:
```
http://localhost:5173/#/university
```
Go to the revoke section.
Enter the credential ID.
Submit the revoke request using:

Issuer API key: 
```demo-issuer-key```

Expected result: ```Credential revoked successfully```

### Step 8: Verify again after revocation

Open:
```
http://localhost:5173/#/verify
```
Verify the same proof again.

Expected result:
```
Credential is revoked
Verification fails
Credential is no longer valid
```

## EXPECTED RESULT

After the full flow:

* University issuer is authorized.
* Student is registered.
* Digital diploma credential is issued.
* Credential verification data is stored on-chain.
* Full transcript data is stored off-chain.
* Student can generate selective Merkle proofs.
* Verifier can verify selected academic information.
* Revoked credentials become invalid.

## IMPORTANT NOTES

Current design notes:

* Blockchain stores only verification-critical data.
* PostgreSQL stores detailed academic data.
* Merkle proof allows selective disclosure.
* EIP-712 signature proves the issuer approved the credential.
* Revocation status is stored on-chain.
* University authentication in the backend should be improved for production use.
* The current system is suitable for local demo and academic evaluation.
