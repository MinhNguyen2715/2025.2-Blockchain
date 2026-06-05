import { network } from "hardhat";
import fs from "fs";
import path from "path";

const DEPLOYMENTS_DIR = "deployments";
const DEPLOYMENT_FILE = path.join(DEPLOYMENTS_DIR, "localhost.json");

async function main() {
  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();

  console.log("");
  console.log("Deploying contracts...");
  console.log("Deployer:", deployer.address);

  const issuerRegistry = await ethers.deployContract("IssuerRegistry");
  await issuerRegistry.waitForDeployment();

  const credentialRegistry = await ethers.deployContract("CredentialRegistry", [
    await issuerRegistry.getAddress(),
  ]);
  await credentialRegistry.waitForDeployment();

  const diplomaVerifier = await ethers.deployContract("DiplomaVerifier", [
    await issuerRegistry.getAddress(),
    await credentialRegistry.getAddress(),
  ]);
  await diplomaVerifier.waitForDeployment();

  const deployments = {
    IssuerRegistry: await issuerRegistry.getAddress(),
    CredentialRegistry: await credentialRegistry.getAddress(),
    DiplomaVerifier: await diplomaVerifier.getAddress(),
  };

  if (!fs.existsSync(DEPLOYMENTS_DIR)) {
    fs.mkdirSync(DEPLOYMENTS_DIR);
  }

  fs.writeFileSync(DEPLOYMENT_FILE, JSON.stringify(deployments, null, 2));

  console.log("");
  console.log("Deployment completed.");
  console.log("IssuerRegistry:     ", deployments.IssuerRegistry);
  console.log("CredentialRegistry: ", deployments.CredentialRegistry);
  console.log("DiplomaVerifier:    ", deployments.DiplomaVerifier);
  console.log("Saved to:", DEPLOYMENT_FILE);
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});