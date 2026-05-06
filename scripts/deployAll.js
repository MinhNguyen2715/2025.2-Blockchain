import { network } from "hardhat";
import fs from "fs";

async function main() {
  // Lấy ethers từ Hardhat network
  const { ethers } = await network.connect();

  // Lấy account dùng để deploy (account #0)
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);

  // ========================
  // 1. Deploy IssuerRegistry
  // ========================
  const issuerRegistry = await ethers.deployContract("IssuerRegistry");
  await issuerRegistry.waitForDeployment();

  // ========================
  // 2. Deploy CredentialRegistry
  // ========================
  // Truyền vào địa chỉ IssuerRegistry
  const credentialRegistry = await ethers.deployContract("CredentialRegistry", [
    await issuerRegistry.getAddress(),
  ]);
  await credentialRegistry.waitForDeployment();

  // ========================
  // 3. Deploy DiplomaVerifier
  // ========================
  // Truyền vào 2 contract trước
  const diplomaVerifier = await ethers.deployContract("DiplomaVerifier", [
    await issuerRegistry.getAddress(),
    await credentialRegistry.getAddress(),
  ]);
  await diplomaVerifier.waitForDeployment();

  // ========================
  // 4. In ra địa chỉ contract
  // ========================
  console.log("IssuerRegistry:", await issuerRegistry.getAddress());
  console.log("CredentialRegistry:", await credentialRegistry.getAddress());
  console.log("DiplomaVerifier:", await diplomaVerifier.getAddress());

  const deployments = {
    IssuerRegistry: await issuerRegistry.getAddress(),
    CredentialRegistry: await credentialRegistry.getAddress(),
    DiplomaVerifier: await diplomaVerifier.getAddress(),
  };

  if (!fs.existsSync("./deployments")) {
    fs.mkdirSync("./deployments");
  }

  // write JSON file
  fs.writeFileSync(
    "./deployments/localhost.json",
    JSON.stringify(deployments, null, 2),
  );

  console.log("\nSaved deployment to deployments/localhost.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
