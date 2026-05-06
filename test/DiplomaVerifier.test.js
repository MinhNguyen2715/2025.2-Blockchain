import { expect } from "chai";
import { network } from "hardhat";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import {
  hashTranscriptLeaf,
  signCredentialPayload,
} from "./helpers/diploma.js";

describe("DiplomaVerifier", function () {
  async function deployFixture() {
    const { ethers } = await network.connect();

    const [owner, issuer1, holder1, other] = await ethers.getSigners();

    const IssuerRegistry = await ethers.getContractFactory("IssuerRegistry");
    const issuerRegistry = await IssuerRegistry.deploy();
    await issuerRegistry.waitForDeployment();

    await issuerRegistry.addIssuer(issuer1.address, "HUST");

    const CredentialRegistry =
      await ethers.getContractFactory("CredentialRegistry");
    const credentialRegistry = await CredentialRegistry.deploy(
      await issuerRegistry.getAddress(),
    );
    await credentialRegistry.waitForDeployment();

    const DiplomaVerifier = await ethers.getContractFactory("DiplomaVerifier");
    const diplomaVerifier = await DiplomaVerifier.deploy(
      await issuerRegistry.getAddress(),
      await credentialRegistry.getAddress(),
    );
    await diplomaVerifier.waitForDeployment();

    return {
      ethers,
      issuerRegistry,
      credentialRegistry,
      diplomaVerifier,
      owner,
      issuer1,
      holder1,
      other,
    };
  }

  async function issueSignedTranscriptCredential() {
    const fixture = await deployFixture();
    const { ethers, credentialRegistry, issuer1, holder1, other } = fixture;
    const { chainId } = await ethers.provider.getNetwork();

    const transcript = [
      {
        courseId: "IT1000",
        courseName: "Introduction to Programming",
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
        courseId: "IT3002",
        courseName: "Computer Networks",
        semester: "2024-1",
        creditsScaled: 300,
        grade: "B+",
      },
    ];

    const leaves = transcript.map(hashTranscriptLeaf);
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const merkleRoot = tree.getHexRoot();
    const credentialId = ethers.id("credential-signed-transcript");
    const metadataHash = ethers.id("metadata-signed-transcript");
    const issuer = issuer1.address;
    const payload = {
      credentialId,
      holder: holder1.address,
      merkleRoot,
      metadataHash,
      issuer,
    };
    const signature = await signCredentialPayload(
      issuer1,
      chainId,
      await credentialRegistry.getAddress(),
      payload,
    );
    const wrongSignature = await signCredentialPayload(
      other,
      chainId,
      await credentialRegistry.getAddress(),
      payload,
    );
    const targetRecord = transcript[1];
    const targetLeaf = hashTranscriptLeaf(targetRecord);
    const proof = tree.getHexProof(targetLeaf);
    const wrongProof = tree.getHexProof(leaves[0]);

    await credentialRegistry
      .connect(other)
      .issueCredential(
        credentialId,
        holder1.address,
        merkleRoot,
        metadataHash,
        issuer,
        signature,
      );

    return {
      ...fixture,
      chainId,
      transcript,
      credentialId,
      merkleRoot,
      metadataHash,
      issuer,
      payload,
      signature,
      wrongSignature,
      targetRecord,
      targetLeaf,
      proof,
      wrongProof,
    };
  }

  it("should verify authorized issuer correctly", async function () {
    const { diplomaVerifier, issuer1, other } = await deployFixture();

    expect(await diplomaVerifier.verifyIssuer(issuer1.address)).to.equal(true);
    expect(await diplomaVerifier.verifyIssuer(other.address)).to.equal(false);
  });

  it("should return true for valid credential", async function () {
    const { credentialId, diplomaVerifier } =
      await issueSignedTranscriptCredential();

    expect(await diplomaVerifier.verifyCredentialStatus(credentialId)).to.equal(
      true,
    );
  });

  it("should return false for non-existing credential", async function () {
    const { ethers, diplomaVerifier } = await deployFixture();

    const credentialId = ethers.id("credential-not-found");

    expect(await diplomaVerifier.verifyCredentialStatus(credentialId)).to.equal(
      false,
    );
  });

  it("should return false for revoked credential", async function () {
    const { credentialId, credentialRegistry, diplomaVerifier, issuer1 } =
      await issueSignedTranscriptCredential();

    await credentialRegistry.connect(issuer1).revokeCredential(credentialId);

    expect(await diplomaVerifier.verifyCredentialStatus(credentialId)).to.equal(
      false,
    );
  });

  it("should return false if issuer is removed after issuing", async function () {
    const { credentialId, issuerRegistry, diplomaVerifier, issuer1 } =
      await issueSignedTranscriptCredential();

    await issuerRegistry.removeIssuer(issuer1.address);

    expect(await diplomaVerifier.verifyCredentialStatus(credentialId)).to.equal(
      false,
    );
  });

  it("should return merkle root for valid credential", async function () {
    const { credentialId, diplomaVerifier, merkleRoot } =
      await issueSignedTranscriptCredential();

    expect(
      await diplomaVerifier.getCredentialMerkleRoot(credentialId),
    ).to.equal(merkleRoot);
  });

  it("hashes transcript leaves the same way off-chain and on-chain", async function () {
    const { diplomaVerifier, targetRecord } =
      await issueSignedTranscriptCredential();

    expect(
      await diplomaVerifier.hashTranscriptLeaf(
        targetRecord.courseId,
        targetRecord.courseName,
        targetRecord.semester,
        targetRecord.creditsScaled,
        targetRecord.grade,
      ),
    ).to.equal(hashTranscriptLeaf(targetRecord));
  });

  it("verifies the issuer signature for a stored credential", async function () {
    const { credentialId, diplomaVerifier, signature } =
      await issueSignedTranscriptCredential();

    expect(
      await diplomaVerifier.verifyCredentialSignature(credentialId, signature),
    ).to.equal(true);
  });

  it("returns false for an invalid credential signature", async function () {
    const { credentialId, diplomaVerifier, wrongSignature } =
      await issueSignedTranscriptCredential();

    expect(
      await diplomaVerifier.verifyCredentialSignature(
        credentialId,
        wrongSignature,
      ),
    ).to.equal(false);
  });

  it("verifies the full credential package with signature and Merkle proof", async function () {
    const { credentialId, diplomaVerifier, targetRecord, proof, signature } =
      await issueSignedTranscriptCredential();

    expect(
      await diplomaVerifier.verifyCredentialPackage(
        credentialId,
        targetRecord.courseId,
        targetRecord.courseName,
        targetRecord.semester,
        targetRecord.creditsScaled,
        targetRecord.grade,
        proof,
        signature,
      ),
    ).to.equal(true);
  });

  it("returns false when transcript data is tampered even if the signature is valid", async function () {
    const { credentialId, diplomaVerifier, targetRecord, proof, signature } =
      await issueSignedTranscriptCredential();

    expect(
      await diplomaVerifier.verifyCredentialPackage(
        credentialId,
        targetRecord.courseId,
        targetRecord.courseName,
        targetRecord.semester,
        targetRecord.creditsScaled,
        "B",
        proof,
        signature,
      ),
    ).to.equal(false);
  });

  it("returns false when the proof does not match the disclosed transcript leaf", async function () {
    const {
      credentialId,
      diplomaVerifier,
      targetRecord,
      wrongProof,
      signature,
    } = await issueSignedTranscriptCredential();

    expect(
      await diplomaVerifier.verifyCredentialPackage(
        credentialId,
        targetRecord.courseId,
        targetRecord.courseName,
        targetRecord.semester,
        targetRecord.creditsScaled,
        targetRecord.grade,
        wrongProof,
        signature,
      ),
    ).to.equal(false);
  });
});
