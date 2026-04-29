import { network } from "hardhat";
import fs from "fs";
import {
  buildTranscriptMerkleTree,
  getCredentialDigest,
  hashTranscriptLeaf,
  signCredentialPayload,
} from "./utils/diploma.js";

async function main() {
  const { ethers } = await network.connect();

  const [admin, issuer, holder, relayer] = await ethers.getSigners();

  const deployments = JSON.parse(
    fs.readFileSync("./deployments/localhost.json", "utf-8")
  );

  const issuerRegistry = await ethers.getContractAt(
    "IssuerRegistry",
    deployments.IssuerRegistry
  );

  const credentialRegistry = await ethers.getContractAt(
    "CredentialRegistry",
    deployments.CredentialRegistry
  );

  const diplomaVerifier = await ethers.getContractAt(
    "DiplomaVerifier",
    deployments.DiplomaVerifier
  );

  console.log("======================================");
  console.log(" MERKLE PROOF END-TO-END DEMO");
  console.log("======================================\n");

  console.log("Admin  :", admin.address);
  console.log("Issuer :", issuer.address);
  console.log("Holder :", holder.address);
  console.log("Relayer:", relayer.address);

  const { chainId } = await ethers.provider.getNetwork();

  // transcript mẫu: mỗi môn/điểm là 1 leaf đầy đủ
  const transcript = [
    {
      courseId: "MATH1001",
      courseName: "Mathematics",
      semester: "2023-1",
      creditsScaled: 400,
      grade: "A",
    },
    {
      courseId: "IT4003",
      courseName: "Cryptography",
      semester: "2024-2",
      creditsScaled: 300,
      grade: "A+",
    },
    {
      courseId: "NET3002",
      courseName: "Computer Networks",
      semester: "2024-1",
      creditsScaled: 300,
      grade: "B+",
    },
    {
      courseId: "AI4001",
      courseName: "Artificial Intelligence",
      semester: "2024-2",
      creditsScaled: 300,
      grade: "A",
    },
  ];

  const { tree, root: merkleRoot } = buildTranscriptMerkleTree(transcript);

  console.log("\nGenerated Merkle Root:");
  console.log(merkleRoot);

  // Chọn 1 môn để chứng minh
  const targetRecord = transcript[1];
  const targetLeaf = hashTranscriptLeaf(targetRecord);

  const proof = tree.getHexProof(targetLeaf);

  console.log("\nSelected leaf to prove:");
  console.log(targetRecord);
  console.log("Leaf:", targetLeaf);

  console.log("\nGenerated Merkle Proof:");
  console.log(proof);

  console.log("\n--------------------------------------");
  console.log("STEP 1: Admin adds issuer");
  console.log("--------------------------------------");

  const isAlreadyAuthorized = await issuerRegistry.isAuthorizedIssuer(
    issuer.address
  );

  if (!isAlreadyAuthorized) {
    await issuerRegistry.connect(admin).addIssuer(issuer.address, "HUST");
    console.log("Issuer added");
  } else {
    console.log("Issuer already authorized");
  }

  console.log(
    "Issuer authorized =",
    await issuerRegistry.isAuthorizedIssuer(issuer.address)
  );

  console.log("\n--------------------------------------");
  console.log("STEP 2: Issuer issues credential with merkleRoot");
  console.log("--------------------------------------");

  const credentialId = ethers.id("credential-merkle-demo-001");
  const metadataHash = ethers.id("metadata-merkle-demo-001");
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
  const digest = getCredentialDigest(
    chainId,
    await credentialRegistry.getAddress(),
    payload
  );

  const exists = await credentialRegistry.credentialExists(credentialId);

  if (!exists) {
    await credentialRegistry
      .connect(relayer)
      .issueCredential(
        credentialId,
        holder.address,
        merkleRoot,
        metadataHash,
        issuer.address,
        signature
      );

    console.log("Credential issued");
  } else {
    console.log("Credential already exists");
  }

  console.log("Credential digest =", digest);
  console.log("Credential signature =", signature);
  console.log(
    "Stored root =",
    await credentialRegistry.getMerkleRoot(credentialId)
  );

  console.log("\n--------------------------------------");
  console.log("STEP 3: Verify credential status");
  console.log("--------------------------------------");

  const validStatus =
    await diplomaVerifier.verifyCredentialStatus(credentialId);

  console.log("Credential valid =", validStatus);
  console.log(
    "Signature valid =",
    await diplomaVerifier.verifyCredentialSignature(credentialId, signature)
  );

  console.log("\n--------------------------------------");
  console.log("STEP 4: Verify full credential package on-chain");
  console.log("--------------------------------------");

  const proofValid = await diplomaVerifier.verifyCredentialPackage(
    credentialId,
    targetRecord.courseId,
    targetRecord.courseName,
    targetRecord.semester,
    targetRecord.creditsScaled,
    targetRecord.grade,
    proof,
    signature
  );

  console.log("Credential package valid =", proofValid);

  console.log("\n--------------------------------------");
  console.log("STEP 5: Try tampered transcript leaf");
  console.log("--------------------------------------");

  const wrongPackageValid = await diplomaVerifier.verifyCredentialPackage(
    credentialId,
    targetRecord.courseId,
    targetRecord.courseName,
    targetRecord.semester,
    targetRecord.creditsScaled,
    "B",
    proof,
    signature
  );

  console.log("Tampered package valid =", wrongPackageValid);

  console.log("\n--------------------------------------");
  console.log("STEP 6: Try wrong signature");
  console.log("--------------------------------------");

  const wrongSignature = await signCredentialPayload(
    relayer,
    chainId,
    await credentialRegistry.getAddress(),
    payload
  );
  const wrongSignatureValid = await diplomaVerifier.verifyCredentialSignature(
    credentialId,
    wrongSignature
  );

  console.log("Wrong signature valid =", wrongSignatureValid);

  console.log("\n======================================");
  console.log(" MERKLE DEMO COMPLETED");
  console.log("======================================");
}

main().catch((error) => {
  console.error("\nMerkle demo failed:");
  console.error(error);
  process.exitCode = 1;
});
