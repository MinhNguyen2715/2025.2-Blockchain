import { network } from "hardhat";
import fs from "fs";

const ISSUER_ADDRESS = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
const ISSUER_NAME = "Hanoi University of Science and Technology";

async function main() {
  const { ethers } = await network.connect();

  if (!fs.existsSync("./deployments/localhost.json")) {
    throw new Error(
      "Missing deployments/localhost.json. Run npm run deploy:local first.",
    );
  }

  const deployments = JSON.parse(
    fs.readFileSync("./deployments/localhost.json", "utf8"),
  );

  const issuerRegistryAddress = deployments.IssuerRegistry;

  if (!issuerRegistryAddress) {
    throw new Error("Missing IssuerRegistry address in deployments/localhost.json");
  }

  const [owner] = await ethers.getSigners();

  console.log("Authorizing demo issuer...");
  console.log("Owner:", owner.address);
  console.log("IssuerRegistry:", issuerRegistryAddress);
  console.log("Issuer:", ISSUER_ADDRESS);
  console.log("Issuer name:", ISSUER_NAME);

  const issuerRegistry = await ethers.getContractAt(
    "IssuerRegistry",
    issuerRegistryAddress,
    owner,
  );

  try {
    const tx = await issuerRegistry.addIssuer(ISSUER_ADDRESS, ISSUER_NAME);
    await tx.wait();

    console.log("Demo issuer authorized successfully.");
  } catch (error) {
    const message = String(error?.shortMessage || error?.message || error);

    if (
      message.includes("already") ||
      message.includes("exists") ||
      message.includes("authorized")
    ) {
      console.log("Demo issuer already authorized. Continue.");
      return;
    }

    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});