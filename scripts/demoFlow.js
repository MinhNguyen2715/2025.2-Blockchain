import { network } from "hardhat";
import fs from "fs";
import {
  getCredentialDigest,
  signCredentialPayload,
} from "./utils/diploma.js";

async function main() {
  const { ethers } = await network.connect();

  // Lấy các account test từ local Hardhat node
  const [admin, issuer, holder, relayer] = await ethers.getSigners();

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
  console.log("Relayer  :", relayer.address);

  const { chainId } = await ethers.provider.getNetwork();

  // Tạo dữ liệu mẫu cho credential payload
  const credentialId = ethers.id("credential-demo-001");
  const merkleRoot = ethers.id("merkle-root-demo-001");
  const metadataHash = ethers.id("metadata-demo-001");
  const payload = {
    credentialId,
    holder: holder.address,
    merkleRoot,
    metadataHash,
    issuer: issuer.address,
  };

  const signature = await signCredentialPayload(
    issuer,
    chainId,
    await credentialRegistry.getAddress(),
    payload
  );

  const expectedDigest = getCredentialDigest(
    chainId,
    await credentialRegistry.getAddress(),
    payload
  );

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
  console.log("STEP 2: Issuer signs the credential off-chain");
  console.log("--------------------------------------");

  console.log("Credential digest =", expectedDigest);
  console.log("Signature         =", signature);

  console.log("\n--------------------------------------");
  console.log("STEP 3: Relayer submits signed credential on-chain");
  console.log("--------------------------------------");

  await credentialRegistry.connect(relayer).issueCredential(
    credentialId,
    holder.address,
    merkleRoot,
    metadataHash,
    issuer.address,
    signature
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
  const onchainDigest = await credentialRegistry.getCredentialDigest(
    credentialId
  );

  console.log("Credential issued successfully");
  console.log("Credential exists =", credentialExists);
  console.log("Stored issuer     =", storedIssuer);
  console.log("Stored holder     =", storedHolder);
  console.log("Stored merkleRoot =", storedMerkleRoot);
  console.log("On-chain digest   =", onchainDigest);

  console.log("\n--------------------------------------");
  console.log("STEP 4: Verifier checks credential status and signature");
  console.log("--------------------------------------");

  const isCredentialValidBeforeRevoke =
    await diplomaVerifier.verifyCredentialStatus(credentialId);

  const verifierMerkleRoot =
    await diplomaVerifier.getCredentialMerkleRoot(credentialId);
  const signatureValid = await diplomaVerifier.verifyCredentialSignature(
    credentialId,
    signature
  );

  console.log("Credential valid before revoke =", isCredentialValidBeforeRevoke);
  console.log("Signature valid               =", signatureValid);
  console.log("Merkle root from verifier      =", verifierMerkleRoot);

  console.log("\n--------------------------------------");
  console.log("STEP 5: Issuer revokes credential");
  console.log("--------------------------------------");

  await credentialRegistry.connect(issuer).revokeCredential(credentialId);

  const revoked = await credentialRegistry.isRevoked(credentialId);

  console.log("Credential revoked =", revoked);

  console.log("\n--------------------------------------");
  console.log("STEP 6: Verifier checks again");
  console.log("--------------------------------------");

  const isCredentialValidAfterRevoke =
    await diplomaVerifier.verifyCredentialStatus(credentialId);
  const signatureValidAfterRevoke =
    await diplomaVerifier.verifyCredentialSignature(credentialId, signature);

  console.log("Credential valid after revoke =", isCredentialValidAfterRevoke);
  console.log("Signature valid after revoke =", signatureValidAfterRevoke);

  console.log("\n======================================");
  console.log(" DEMO COMPLETED SUCCESSFULLY");
  console.log("======================================");
}

main().catch((error) => {
  console.error("\nDemo failed:");
  console.error(error);
  process.exitCode = 1;
});
