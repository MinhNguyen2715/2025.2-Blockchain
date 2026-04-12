import { network } from "hardhat";
import fs from "fs";

async function main() {
  const { ethers } = await network.connect();

  // Lấy các account test từ local Hardhat node
  const [admin, issuer, holder, verifier] = await ethers.getSigners();

  // Địa chỉ contract đã deploy trên localhost
const deployments = JSON.parse(
  fs.readFileSync("./deployments/localhost.json", "utf-8")
);

const issuerRegistryAddress = deployments.IssuerRegistry;
const credentialRegistryAddress = deployments.CredentialRegistry;
const diplomaVerifierAddress = deployments.DiplomaVerifier;

  // Kết nối tới contract đã deploy
  const issuerRegistry = await ethers.getContractAt(
    "IssuerRegistry",
    issuerRegistryAddress
  );

  const credentialRegistry = await ethers.getContractAt(
    "CredentialRegistry",
    credentialRegistryAddress
  );

  const diplomaVerifier = await ethers.getContractAt(
    "DiplomaVerifier",
    diplomaVerifierAddress
  );

  console.log("======================================");
  console.log(" DIGITAL DIPLOMA SYSTEM DEMO FLOW");
  console.log("======================================\n");

  console.log("Admin    :", admin.address);
  console.log("Issuer   :", issuer.address);
  console.log("Holder   :", holder.address);
  console.log("Verifier :", verifier.address);

  // Tạo dữ liệu mẫu cho credential
  const credentialId = ethers.id("credential-demo-001");
  const merkleRoot = ethers.id("merkle-root-demo-001");
  const metadataHash = ethers.id("metadata-demo-001");

  console.log("\n--------------------------------------");
  console.log("STEP 1: Admin adds an authorized issuer");
  console.log("--------------------------------------");

  await issuerRegistry.connect(admin).addIssuer(issuer.address, "HUST");

  const isIssuerAuthorized = await issuerRegistry.isAuthorizedIssuer(
    issuer.address
  );

  console.log("Issuer added:", issuer.address);
  console.log("Issuer authorized =", isIssuerAuthorized);

  console.log("\n--------------------------------------");
  console.log("STEP 2: Issuer issues a credential");
  console.log("--------------------------------------");

  await credentialRegistry.connect(issuer).issueCredential(
    credentialId,
    holder.address,
    merkleRoot,
    metadataHash
  );

  const credentialExists = await credentialRegistry.credentialExists(
    credentialId
  );
  const storedIssuer = await credentialRegistry.getCredentialIssuer(
    credentialId
  );
  const storedHolder = await credentialRegistry.getCredentialHolder(
    credentialId
  );
  const storedMerkleRoot = await credentialRegistry.getMerkleRoot(
    credentialId
  );

  console.log("Credential issued successfully");
  console.log("Credential exists =", credentialExists);
  console.log("Stored issuer     =", storedIssuer);
  console.log("Stored holder     =", storedHolder);
  console.log("Stored merkleRoot =", storedMerkleRoot);

  console.log("\n--------------------------------------");
  console.log("STEP 3: Verifier checks credential");
  console.log("--------------------------------------");

  const isCredentialValidBeforeRevoke =
    await diplomaVerifier.verifyCredentialStatus(credentialId);

  const verifierMerkleRoot =
    await diplomaVerifier.getCredentialMerkleRoot(credentialId);

  console.log("Credential valid before revoke =", isCredentialValidBeforeRevoke);
  console.log("Merkle root from verifier      =", verifierMerkleRoot);

  console.log("\n--------------------------------------");
  console.log("STEP 4: Issuer revokes credential");
  console.log("--------------------------------------");

  await credentialRegistry.connect(issuer).revokeCredential(credentialId);

  const revoked = await credentialRegistry.isRevoked(credentialId);

  console.log("Credential revoked =", revoked);

  console.log("\n--------------------------------------");
  console.log("STEP 5: Verifier checks again");
  console.log("--------------------------------------");

  const isCredentialValidAfterRevoke =
    await diplomaVerifier.verifyCredentialStatus(credentialId);

  console.log("Credential valid after revoke =", isCredentialValidAfterRevoke);

  console.log("\n======================================");
  console.log(" DEMO COMPLETED SUCCESSFULLY");
  console.log("======================================");
}

main().catch((error) => {
  console.error("\nDemo failed:");
  console.error(error);
  process.exitCode = 1;
});