import { expect } from "chai";
import { network } from "hardhat";

describe("DiplomaVerifier", function () {
  async function deployFixture() {
    const { ethers } = await network.connect();

    const [owner, issuer1, holder1, other] = await ethers.getSigners();

    const IssuerRegistry = await ethers.getContractFactory("IssuerRegistry");
    const issuerRegistry = await IssuerRegistry.deploy();
    await issuerRegistry.waitForDeployment();

    await issuerRegistry.addIssuer(issuer1.address, "HUST");

    const CredentialRegistry = await ethers.getContractFactory("CredentialRegistry");
    const credentialRegistry = await CredentialRegistry.deploy(await issuerRegistry.getAddress());
    await credentialRegistry.waitForDeployment();

    const DiplomaVerifier = await ethers.getContractFactory("DiplomaVerifier");
    const diplomaVerifier = await DiplomaVerifier.deploy(
      await issuerRegistry.getAddress(),
      await credentialRegistry.getAddress()
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

  it("should verify authorized issuer correctly", async function () {
    const { diplomaVerifier, issuer1, other } = await deployFixture();

    expect(await diplomaVerifier.verifyIssuer(issuer1.address)).to.equal(true);
    expect(await diplomaVerifier.verifyIssuer(other.address)).to.equal(false);
  });

  it("should return true for valid credential", async function () {
    const { ethers, credentialRegistry, diplomaVerifier, issuer1, holder1 } = await deployFixture();

    const credentialId = ethers.id("credential-valid");
    const merkleRoot = ethers.id("merkle-valid");
    const metadataHash = ethers.id("metadata-valid");

    await credentialRegistry
      .connect(issuer1)
      .issueCredential(credentialId, holder1.address, merkleRoot, metadataHash);

    expect(await diplomaVerifier.verifyCredentialStatus(credentialId)).to.equal(true);
  });

  it("should return false for non-existing credential", async function () {
    const { ethers, diplomaVerifier } = await deployFixture();

    const credentialId = ethers.id("credential-not-found");

    expect(await diplomaVerifier.verifyCredentialStatus(credentialId)).to.equal(false);
  });

  it("should return false for revoked credential", async function () {
    const { ethers, credentialRegistry, diplomaVerifier, issuer1, holder1 } = await deployFixture();

    const credentialId = ethers.id("credential-revoked");
    const merkleRoot = ethers.id("merkle-revoked");
    const metadataHash = ethers.id("metadata-revoked");

    await credentialRegistry
      .connect(issuer1)
      .issueCredential(credentialId, holder1.address, merkleRoot, metadataHash);

    await credentialRegistry.connect(issuer1).revokeCredential(credentialId);

    expect(await diplomaVerifier.verifyCredentialStatus(credentialId)).to.equal(false);
  });

  it("should return false if issuer is removed after issuing", async function () {
    const { ethers, issuerRegistry, credentialRegistry, diplomaVerifier, issuer1, holder1 } = await deployFixture();

    const credentialId = ethers.id("credential-issuer-removed");
    const merkleRoot = ethers.id("merkle-issuer-removed");
    const metadataHash = ethers.id("metadata-issuer-removed");

    await credentialRegistry
      .connect(issuer1)
      .issueCredential(credentialId, holder1.address, merkleRoot, metadataHash);

    await issuerRegistry.removeIssuer(issuer1.address);

    expect(await diplomaVerifier.verifyCredentialStatus(credentialId)).to.equal(false);
  });

  it("should return merkle root for valid credential", async function () {
    const { ethers, credentialRegistry, diplomaVerifier, issuer1, holder1 } = await deployFixture();

    const credentialId = ethers.id("credential-root");
    const merkleRoot = ethers.id("merkle-root-value");
    const metadataHash = ethers.id("metadata-root");

    await credentialRegistry
      .connect(issuer1)
      .issueCredential(credentialId, holder1.address, merkleRoot, metadataHash);

    expect(await diplomaVerifier.getCredentialMerkleRoot(credentialId)).to.equal(merkleRoot);
  });
});