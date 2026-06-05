import fs from "fs";
import path from "path";
import { LOCAL_CONFIG } from "./localConfig.js";

const ROOT = process.cwd();
const DEPLOYMENT_FILE = path.join(ROOT, "deployments", "localhost.json");

const ROOT_ENV = path.join(ROOT, ".env");
const BACKEND_ENV = path.join(ROOT, "backend", ".env");
const FRONTEND_ENV = path.join(ROOT, "frontend", ".env.local");

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

    if (key) env[key] = value;
  }

  return env;
}

function readEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return parseEnv(fs.readFileSync(filePath, "utf8"));
}

function writeEnv(filePath, env, preferredOrder) {
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

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

const { database, server, apiKeys, wallets } = LOCAL_CONFIG;

const rootEnv = {
  ...readEnv(ROOT_ENV),
  NETWORK: "localhost",
  BLOCKCHAIN_RPC_URL: server.rpcUrl,
  ADMIN_API_KEY: apiKeys.admin,
  ISSUER_API_KEY: apiKeys.issuer,
  DEMO_ADMIN_ADDRESS: wallets.adminAddress,
  DEMO_ISSUER_ADDRESS: wallets.issuerAddress,
  DEMO_HOLDER_ADDRESS: wallets.holderAddress,
  DEMO_VERIFIER_ADDRESS: wallets.verifierAddress,
};

const backendEnv = {
  ...readEnv(BACKEND_ENV),

  NODE_ENV: "development",
  PORT: server.backendPort,

  DB_HOST: database.host,
  DB_PORT: database.port,
  DB_USERNAME: database.username,
  DB_PASSWORD: database.password,
  DB_NAME: database.name,

  BLOCKCHAIN_RPC_URL: server.rpcUrl,

  ADMIN_API_KEY: apiKeys.admin,
  ISSUER_API_KEY: apiKeys.issuer,

  ADMIN_PRIVATE_KEY: wallets.adminPrivateKey,
  ISSUER_PRIVATE_KEY: wallets.issuerPrivateKey,
  UNIVERSITY_PRIVATE_KEY: wallets.issuerPrivateKey,

  ISSUER_REGISTRY_ADDRESS: issuerRegistryAddress,
  CREDENTIAL_REGISTRY_ADDRESS: credentialRegistryAddress,
  DIPLOMA_VERIFIER_ADDRESS: diplomaVerifierAddress,

  DEMO_ADMIN_ADDRESS: wallets.adminAddress,
  DEMO_ISSUER_ADDRESS: wallets.issuerAddress,
  DEMO_HOLDER_ADDRESS: wallets.holderAddress,
  DEMO_VERIFIER_ADDRESS: wallets.verifierAddress,

  FRONTEND_URL: server.frontendUrl,
};

const frontendEnv = {
  ...readEnv(FRONTEND_ENV),

  VITE_API_BASE: server.apiBase,
  VITE_ADMIN_API_KEY: apiKeys.admin,
  VITE_ISSUER_API_KEY: apiKeys.issuer,

  VITE_DEMO_ADMIN_ADDRESS: wallets.adminAddress,
  VITE_DEMO_ISSUER_ADDRESS: wallets.issuerAddress,
  VITE_DEMO_HOLDER_ADDRESS: wallets.holderAddress,
  VITE_DEMO_VERIFIER_ADDRESS: wallets.verifierAddress,
};

writeEnv(ROOT_ENV, rootEnv, [
  "NETWORK",
  "BLOCKCHAIN_RPC_URL",
  "ADMIN_API_KEY",
  "ISSUER_API_KEY",
  "DEMO_ADMIN_ADDRESS",
  "DEMO_ISSUER_ADDRESS",
  "DEMO_HOLDER_ADDRESS",
  "DEMO_VERIFIER_ADDRESS",
]);

writeEnv(BACKEND_ENV, backendEnv, [
  "NODE_ENV",
  "PORT",
  "DB_HOST",
  "DB_PORT",
  "DB_USERNAME",
  "DB_PASSWORD",
  "DB_NAME",
  "BLOCKCHAIN_RPC_URL",
  "ADMIN_API_KEY",
  "ISSUER_API_KEY",
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

writeEnv(FRONTEND_ENV, frontendEnv, [
  "VITE_API_BASE",
  "VITE_ADMIN_API_KEY",
  "VITE_ISSUER_API_KEY",
  "VITE_DEMO_ADMIN_ADDRESS",
  "VITE_DEMO_ISSUER_ADDRESS",
  "VITE_DEMO_HOLDER_ADDRESS",
  "VITE_DEMO_VERIFIER_ADDRESS",
]);

console.log("");
console.log("Local environment files updated.");
console.log("");
console.log("Root env:     .env");
console.log("Backend env:  backend/.env");
console.log("Frontend env: frontend/.env.local");
console.log("");
console.log("Contracts:");
console.log(" IssuerRegistry:    ", issuerRegistryAddress);
console.log(" CredentialRegistry:", credentialRegistryAddress);
console.log(" DiplomaVerifier:   ", diplomaVerifierAddress);
console.log("");
console.log("Demo keys:");
console.log(" Admin API key: ", apiKeys.admin);
console.log(" Issuer API key:", apiKeys.issuer);
console.log("");
console.log("Demo accounts:");
console.log(" Admin / Owner:      ", wallets.adminAddress);
console.log(" University / Issuer:", wallets.issuerAddress);
console.log(" Student / Holder:   ", wallets.holderAddress);
console.log(" Verifier:           ", wallets.verifierAddress);
console.log("");