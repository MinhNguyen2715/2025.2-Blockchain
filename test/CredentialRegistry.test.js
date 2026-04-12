import { expect } from "chai";
import { network } from "hardhat";

describe("CredentialRegistry", function () {
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

    return { ethers, issuerRegistry, credentialRegistry, owner, issuer1, holder1, other };
  }

  it("should allow authorized issuer to issue credential", async function () {
    const { ethers, credentialRegistry, issuer1, holder1 } = await deployFixture();

    const credentialId = ethers.id("credential-1");
    const merkleRoot = ethers.id("merkle-root-1");
    const metadataHash = ethers.id("metadata-1");

    await credentialRegistry
      .connect(issuer1)
      .issueCredential(credentialId, holder1.address, merkleRoot, metadataHash);

    expect(await credentialRegistry.credentialExists(credentialId)).to.equal(true);
    expect(await credentialRegistry.getCredentialIssuer(credentialId)).to.equal(issuer1.address);
    expect(await credentialRegistry.getCredentialHolder(credentialId)).to.equal(holder1.address);
    expect(await credentialRegistry.getMerkleRoot(credentialId)).to.equal(merkleRoot);
  });

  it("should reject non-authorized issuer", async function () {
    const { ethers, credentialRegistry, other, holder1 } = await deployFixture();

    const credentialId = ethers.id("credential-2");
    const merkleRoot = ethers.id("merkle-root-2");
    const metadataHash = ethers.id("metadata-2");

    await expect(
      credentialRegistry
        .connect(other)
        .issueCredential(credentialId, holder1.address, merkleRoot, metadataHash)
    ).to.be.revertedWith("Not authorized issuer");
  });

  it("should reject duplicate credentialId", async function () {
    const { ethers, credentialRegistry, issuer1, holder1 } = await deployFixture();

    const credentialId = ethers.id("credential-3");
    const merkleRoot = ethers.id("merkle-root-3");
    const metadataHash = ethers.id("metadata-3");

    await credentialRegistry
      .connect(issuer1)
      .issueCredential(credentialId, holder1.address, merkleRoot, metadataHash);

    await expect(
      credentialRegistry
        .connect(issuer1)
        .issueCredential(credentialId, holder1.address, merkleRoot, metadataHash)
    ).to.be.revertedWith("Credential already exists");
  });

  it("should allow issuer to revoke its own credential", async function () {
    const { ethers, credentialRegistry, issuer1, holder1 } = await deployFixture();

    const credentialId = ethers.id("credential-4");
    const merkleRoot = ethers.id("merkle-root-4");
    const metadataHash = ethers.id("metadata-4");

    await credentialRegistry
      .connect(issuer1)
      .issueCredential(credentialId, holder1.address, merkleRoot, metadataHash);

    await credentialRegistry.connect(issuer1).revokeCredential(credentialId);

    expect(await credentialRegistry.isRevoked(credentialId)).to.equal(true);
  });

  it("should reject revoke by non-issuer", async function () {
    const { ethers, credentialRegistry, issuer1, holder1, other } = await deployFixture();

    const credentialId = ethers.id("credential-5");
    const merkleRoot = ethers.id("merkle-root-5");
    const metadataHash = ethers.id("metadata-5");

    await credentialRegistry
      .connect(issuer1)
      .issueCredential(credentialId, holder1.address, merkleRoot, metadataHash);

    await expect(
      credentialRegistry.connect(other).revokeCredential(credentialId)
    ).to.be.revertedWith("Not credential issuer");
  });
});