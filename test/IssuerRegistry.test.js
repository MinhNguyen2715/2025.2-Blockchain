import { expect } from "chai";
import { network } from "hardhat";

describe("IssuerRegistry", function () {
  async function deployIssuerRegistry() {
    const { ethers } = await network.connect();

    const IssuerRegistry = await ethers.getContractFactory("IssuerRegistry");
    const issuerRegistry = await IssuerRegistry.deploy();
    await issuerRegistry.waitForDeployment();

    const [owner, issuer1, other] = await ethers.getSigners();
    return { ethers, issuerRegistry, owner, issuer1, other };
  }

  it("should set deployer as owner", async function () {
    const { issuerRegistry, owner } = await deployIssuerRegistry();
    expect(await issuerRegistry.owner()).to.equal(owner.address);
  });

  it("should allow owner to add issuer", async function () {
    const { issuerRegistry, issuer1 } = await deployIssuerRegistry();

    await issuerRegistry.addIssuer(issuer1.address, "HUST");

    expect(await issuerRegistry.isAuthorizedIssuer(issuer1.address)).to.equal(
      true,
    );
    expect(await issuerRegistry.getIssuerName(issuer1.address)).to.equal(
      "HUST",
    );
  });

  it("should not allow non-owner to add issuer", async function () {
    const { issuerRegistry, issuer1, other } = await deployIssuerRegistry();

    await expect(
      issuerRegistry.connect(other).addIssuer(issuer1.address, "HUST"),
    ).to.be.revertedWith("Not owner");
  });

  it("should remove issuer correctly", async function () {
    const { issuerRegistry, issuer1 } = await deployIssuerRegistry();

    await issuerRegistry.addIssuer(issuer1.address, "HUST");
    await issuerRegistry.removeIssuer(issuer1.address);

    expect(await issuerRegistry.isAuthorizedIssuer(issuer1.address)).to.equal(
      false,
    );
  });

  it("should transfer ownership", async function () {
    const { issuerRegistry, other } = await deployIssuerRegistry();

    await issuerRegistry.transferOwnership(other.address);

    expect(await issuerRegistry.owner()).to.equal(other.address);
  });
});
