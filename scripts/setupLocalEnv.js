import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const DEPLOYMENT_FILE = path.join(ROOT, "deployments", "localhost.json");
const BACKEND_ENV = path.join(ROOT, "backend", ".env");
const FRONTEND_ENV = path.join(ROOT, "frontend", ".env");

const ADMIN_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const ISSUER_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

const ADMIN_API_KEY = "123456";

const DEMO = {
  adminAddress: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  issuerAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
  holderAddress: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
  verifierAddress: "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
};

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseEnv(content) {
  const env = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) continue;

    const index = line.indexOf("=");
    if (index === -1) continue;

    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();

    if (key) {
      env[key] = value;
    }
  }

  return env;
}

function readEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return parseEnv(fs.readFileSync(filePath, "utf8"));
}

function writeEnv(filePath, env, preferredOrder) {
  const lines = [];

  for (const key of preferredOrder) {
    if (env[key] !== undefined && env[key] !== "") {
      lines.push(`${key}=${env[key]}`);
    }
  }

  const remainingKeys = Object.keys(env)
    .filter((key) => !preferredOrder.includes(key))
    .sort();

  for (const key of remainingKeys) {
    if (env[key] !== undefined && env[key] !== "") {
      lines.push(`${key}=${env[key]}`);
    }
  }

  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

const deployments = readJson(DEPLOYMENT_FILE);

const issuerRegistryAddress = deployments.IssuerRegistry;
const credentialRegistryAddress = deployments.CredentialRegistry;
const diplomaVerifierAddress = deployments.DiplomaVerifier;

if (!issuerRegistryAddress || !credentialRegistryAddress || !diplomaVerifierAddress) {
  throw new Error("Invalid deployments/localhost.json");
}

const existingBackendEnv = readEnv(BACKEND_ENV);

const backendEnv = {
  ...existingBackendEnv,

  PORT: existingBackendEnv.PORT || "3000",

  DB_HOST: existingBackendEnv.DB_HOST || "localhost",
  DB_PORT: existingBackendEnv.DB_PORT || "5432",
  DB_USERNAME: existingBackendEnv.DB_USERNAME || "postgres",
  DB_PASSWORD: "123456",
  DB_NAME: existingBackendEnv.DB_NAME || "diploma",

  BLOCKCHAIN_RPC_URL: "http://127.0.0.1:8545",

  ADMIN_API_KEY,

  ADMIN_PRIVATE_KEY,
  ISSUER_PRIVATE_KEY,

  // Keep for backward compatibility.
  // New backend logic should use ISSUER_PRIVATE_KEY for Issue/Revoke.
  UNIVERSITY_PRIVATE_KEY: ISSUER_PRIVATE_KEY,

  ISSUER_REGISTRY_ADDRESS: issuerRegistryAddress,
  CREDENTIAL_REGISTRY_ADDRESS: credentialRegistryAddress,
  DIPLOMA_VERIFIER_ADDRESS: diplomaVerifierAddress,

  DEMO_ADMIN_ADDRESS: DEMO.adminAddress,
  DEMO_ISSUER_ADDRESS: DEMO.issuerAddress,
  DEMO_HOLDER_ADDRESS: DEMO.holderAddress,
  DEMO_VERIFIER_ADDRESS: DEMO.verifierAddress,

  FRONTEND_URL: "http://localhost:5173",
};

// Remove old switching mode if it exists.
delete backendEnv.DEMO_SIGNER_MODE;

writeEnv(BACKEND_ENV, backendEnv, [
  "PORT",

  "DB_HOST",
  "DB_PORT",
  "DB_USERNAME",
  "DB_PASSWORD",
  "DB_NAME",

  "BLOCKCHAIN_RPC_URL",

  "ADMIN_API_KEY",

  "ADMIN_PRIVATE_KEY",
  "ISSUER_PRIVATE_KEY",
  "UNIVERSITY_PRIVATE_KEY",

  "ISSUER_REGISTRY_ADDRESS",
  "CREDENTIAL_REGISTRY_ADDRESS",
  "DIPLOMA_VERIFIER_ADDRESS",

  "DEMO_ADMIN_ADDRESS",
  "DEMO_ISSUER_ADDRESS",
  "DEMO_HOLDER_ADDRESS",
  "DEMO_VERIFIER_ADDRESS",

  "FRONTEND_URL",
]);

const existingFrontendEnv = readEnv(FRONTEND_ENV);

const frontendEnv = {
  ...existingFrontendEnv,
  VITE_API_BASE: "http://localhost:3000/api",
  VITE_ADMIN_API_KEY: ADMIN_API_KEY,
};

writeEnv(FRONTEND_ENV, frontendEnv, [
  "VITE_API_BASE",
  "VITE_ADMIN_API_KEY",
]);

console.log("");
console.log("Local env files updated successfully.");
console.log("");
console.log("backend/.env");
console.log("  ADMIN_API_KEY=123456");
console.log("  ADMIN_PRIVATE_KEY=Account #0 / Admin / Owner");
console.log("  ISSUER_PRIVATE_KEY=Account #1 / University / Issuer");
console.log("  UNIVERSITY_PRIVATE_KEY=Account #1 / Backward compatibility");
console.log("  ISSUER_REGISTRY_ADDRESS =", issuerRegistryAddress);
console.log("  CREDENTIAL_REGISTRY_ADDRESS =", credentialRegistryAddress);
console.log("  DIPLOMA_VERIFIER_ADDRESS =", diplomaVerifierAddress);
console.log("");
console.log("frontend/.env");
console.log("  VITE_API_BASE=http://localhost:3000/api");
console.log("  VITE_ADMIN_API_KEY=123456");
console.log("");
console.log("Demo accounts:");
console.log("  Admin / Owner:       ", DEMO.adminAddress);
console.log("  University / Issuer: ", DEMO.issuerAddress);
console.log("  Student / Holder:    ", DEMO.holderAddress);
console.log("  Verifier / Employer: ", DEMO.verifierAddress);
console.log("");
console.log("No .env switching is needed anymore.");
console.log("");