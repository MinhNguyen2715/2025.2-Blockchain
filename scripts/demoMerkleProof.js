import { network } from "hardhat";
import fs from "fs";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

async function main() {
  const { ethers } = await network.connect();

  const [admin, issuer, holder] = await ethers.getSigners();

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

  // transcript mẫu: mỗi môn/điểm là 1 leaf
  const transcript = [
    { course: "Math", grade: "A" },
    { course: "Cryptography", grade: "A+" },
    { course: "Networks", grade: "B+" },
    { course: "AI", grade: "A" },
  ];

  // Hash từng leaf giống logic Solidity:
  // keccak256(abi.encodePacked(course, grade))
  const leaves = transcript.map((item) =>
    ethers.solidityPackedKeccak256(
      ["string", "string"],
      [item.course, item.grade]
    )
  );

  // Merkletreejs cần Buffer/bytes-like cho leaves
  const tree = new MerkleTree(leaves, keccak256, {
    sortPairs: true,
  });

  const merkleRoot = tree.getHexRoot();

  console.log("\nGenerated Merkle Root:");
  console.log(merkleRoot);

  // Chọn 1 môn để chứng minh
  const targetCourse = "Cryptography";
  const targetGrade = "A+";

  const targetLeaf = ethers.solidityPackedKeccak256(
    ["string", "string"],
    [targetCourse, targetGrade]
  );

  const proof = tree.getHexProof(targetLeaf);

  console.log("\nSelected leaf to prove:");
  console.log(`${targetCourse} : ${targetGrade}`);
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

  const exists = await credentialRegistry.credentialExists(credentialId);

  if (!exists) {
    await credentialRegistry
      .connect(issuer)
      .issueCredential(credentialId, holder.address, merkleRoot, metadataHash);

    console.log("Credential issued");
  } else {
    console.log("Credential already exists");
  }

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

  console.log("\n--------------------------------------");
  console.log("STEP 4: Verify Merkle proof on-chain");
  console.log("--------------------------------------");

  const proofValid = await diplomaVerifier.verifyCredentialMerkleProof(
    credentialId,
    targetLeaf,
    proof
  );

  console.log("Merkle proof valid =", proofValid);

  console.log("\n--------------------------------------");
  console.log("STEP 5: Try wrong leaf");
  console.log("--------------------------------------");

  const wrongLeaf = ethers.solidityPackedKeccak256(
    ["string", "string"],
    ["Cryptography", "B"]
  );

  const wrongProofValid = await diplomaVerifier.verifyCredentialMerkleProof(
    credentialId,
    wrongLeaf,
    proof
  );

  console.log("Wrong leaf proof valid =", wrongProofValid);

  console.log("\n======================================");
  console.log(" MERKLE DEMO COMPLETED");
  console.log("======================================");
}

main().catch((error) => {
  console.error("\nMerkle demo failed:");
  console.error(error);
  process.exitCode = 1;
});