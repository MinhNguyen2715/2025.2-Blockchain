import { expect } from "chai";
import { network } from "hardhat";
import {
  getCredentialDigest,
  signCredentialPayload,
} from "./helpers/diploma.js";

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

  async function buildSignedCredentialFixture() {
    const fixture = await deployFixture();
    const { ethers, credentialRegistry, issuer1, holder1 } = fixture;
    const { chainId } = await ethers.provider.getNetwork();

    const credentialId = ethers.id("credential-1");
    const merkleRoot = ethers.id("merkle-root-1");
    const metadataHash = ethers.id("metadata-1");
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
      payload
    );

    return {
      ...fixture,
      chainId,
      credentialId,
      merkleRoot,
      metadataHash,
      issuer,
      payload,
      signature,
    };
  }

  it("allows a relayer to issue a credential with a valid issuer signature", async function () {
    const {
      credentialRegistry,
      other,
      holder1,
      credentialId,
      merkleRoot,
      metadataHash,
      issuer,
      signature,
    } = await buildSignedCredentialFixture();

    await credentialRegistry
      .connect(other)
      .issueCredential(
        credentialId,
        holder1.address,
        merkleRoot,
        metadataHash,
        issuer,
        signature
      );

    expect(await credentialRegistry.credentialExists(credentialId)).to.equal(true);
    expect(await credentialRegistry.getCredentialIssuer(credentialId)).to.equal(issuer);
    expect(await credentialRegistry.getCredentialHolder(credentialId)).to.equal(holder1.address);
    expect(await credentialRegistry.getMerkleRoot(credentialId)).to.equal(merkleRoot);
  });

  it("returns the same EIP-712 digest that was signed off-chain", async function () {
    const {
      credentialRegistry,
      other,
      holder1,
      chainId,
      credentialId,
      merkleRoot,
      metadataHash,
      issuer,
      payload,
      signature,
    } = await buildSignedCredentialFixture();

    await credentialRegistry
      .connect(other)
      .issueCredential(
        credentialId,
        holder1.address,
        merkleRoot,
        metadataHash,
        issuer,
        signature
      );

    expect(await credentialRegistry.getCredentialDigest(credentialId)).to.equal(
      getCredentialDigest(
        chainId,
        await credentialRegistry.getAddress(),
        payload
      )
    );
  });

  it("rejects a signature from a signer that is not an authorized issuer", async function () {
    const { ethers, credentialRegistry, other, holder1 } = await deployFixture();
    const { chainId } = await ethers.provider.getNetwork();

    const credentialId = ethers.id("credential-2");
    const merkleRoot = ethers.id("merkle-root-2");
    const metadataHash = ethers.id("metadata-2");
    const issuer = other.address;
    const payload = {
      credentialId,
      holder: holder1.address,
      merkleRoot,
      metadataHash,
      issuer,
    };
    const signature = await signCredentialPayload(
      other,
      chainId,
      await credentialRegistry.getAddress(),
      payload
    );

    await expect(
      credentialRegistry
        .connect(other)
        .issueCredential(
          credentialId,
          holder1.address,
          merkleRoot,
          metadataHash,
          issuer,
          signature
        )
    ).to.be.revertedWith("Not authorized issuer");
  });

  it("rejects a signature that does not match the issuer field in the payload", async function () {
    const { credentialRegistry, other, holder1, credentialId, merkleRoot, metadataHash, signature } =
      await buildSignedCredentialFixture();

    await expect(
      credentialRegistry
        .connect(other)
        .issueCredential(
          credentialId,
          holder1.address,
          merkleRoot,
          metadataHash,
          other.address,
          signature
        )
    ).to.be.revertedWith("Invalid credential signature");
  });

  it("rejects duplicate credentialId", async function () {
    const {
      credentialRegistry,
      other,
      holder1,
      credentialId,
      merkleRoot,
      metadataHash,
      issuer,
      signature,
    } = await buildSignedCredentialFixture();

    await credentialRegistry
      .connect(other)
      .issueCredential(
        credentialId,
        holder1.address,
        merkleRoot,
        metadataHash,
        issuer,
        signature
      );

    await expect(
      credentialRegistry
        .connect(other)
        .issueCredential(
          credentialId,
          holder1.address,
          merkleRoot,
          metadataHash,
          issuer,
          signature
        )
    ).to.be.revertedWith("Credential already exists");
  });

  it("allows the recovered issuer to revoke its own credential", async function () {
    const {
      credentialRegistry,
      other,
      issuer1,
      holder1,
      credentialId,
      merkleRoot,
      metadataHash,
      issuer,
      signature,
    } = await buildSignedCredentialFixture();

    await credentialRegistry
      .connect(other)
      .issueCredential(
        credentialId,
        holder1.address,
        merkleRoot,
        metadataHash,
        issuer,
        signature
      );

    await credentialRegistry.connect(issuer1).revokeCredential(credentialId);

    expect(await credentialRegistry.isRevoked(credentialId)).to.equal(true);
  });

  it("rejects revoke by an address that is not the recovered issuer", async function () {
    const {
      credentialRegistry,
      other,
      holder1,
      credentialId,
      merkleRoot,
      metadataHash,
      issuer,
      signature,
    } = await buildSignedCredentialFixture();

    await credentialRegistry
      .connect(other)
      .issueCredential(
        credentialId,
        holder1.address,
        merkleRoot,
        metadataHash,
        issuer,
        signature
      );

    await expect(credentialRegistry.connect(holder1).revokeCredential(credentialId)).to.be
      .revertedWith("Not credential issuer");
  });
});
