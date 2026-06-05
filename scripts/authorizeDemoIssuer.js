import { network } from "hardhat";
import fs from "fs";
import { LOCAL_CONFIG } from "./localConfig.js";

const DEPLOYMENT_FILE = "./deployments/localhost.json";

async function main() {
  const { ethers } = await network.connect();

  if (!fs.existsSync(DEPLOYMENT_FILE)) {
    throw new Error("Missing deployments/localhost.json. Run npm run deploy:local first.");
  }

  const deployments = JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, "utf8"));
  const issuerRegistryAddress = deployments.IssuerRegistry;

  if (!issuerRegistryAddress) {
    throw new Error("Missing IssuerRegistry address in deployments/localhost.json");
  }

  const [owner] = await ethers.getSigners();

  const issuerAddress = LOCAL_CONFIG.wallets.issuerAddress;
  const issuerName = LOCAL_CONFIG.demoIssuer.name;

  const issuerRegistry = await ethers.getContractAt(
    "IssuerRegistry",
    issuerRegistryAddress,
    owner,
  );

  console.log("");
  console.log("Authorizing demo issuer...");
  console.log("Owner:          ", owner.address);
  console.log("IssuerRegistry: ", issuerRegistryAddress);
  console.log("Issuer:         ", issuerAddress);
  console.log("Issuer name:    ", issuerName);

  try {
    const tx = await issuerRegistry.addIssuer(issuerAddress, issuerName);
    await tx.wait();
    console.log("Demo issuer authorized.");
  } catch (error) {
    const message = String(error?.shortMessage || error?.message || error);

    if (
      message.includes("already") ||
      message.includes("exists") ||
      message.includes("authorized")
    ) {
      console.log("Demo issuer is already authorized. Continue.");
      return;
    }

    throw error;
  }

  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});