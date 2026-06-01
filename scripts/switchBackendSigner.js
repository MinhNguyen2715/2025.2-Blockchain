import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const BACKEND_ENV = path.join(ROOT, "backend", ".env");

const DEFAULTS = {
  PORT: "3000",

  DB_HOST: "localhost",
  DB_PORT: "5432",
  DB_USERNAME: "postgres",
  DB_PASSWORD: "postgres",
  DB_NAME: "diploma",

  BLOCKCHAIN_RPC_URL: "http://127.0.0.1:8545",

  ADMIN_API_KEY: "123456",
};

const DEMO_ACCOUNTS = {
  admin: {
    role: "Admin / Contract Owner",
    address: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    privateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  },

  issuer: {
    role: "University / Issuer",
    address: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    privateKey:
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  },

  holder: {
    role: "Student / Holder",
    address: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
  },

  verifier: {
    role: "Verifier / Employer",
    address: "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
  },
};

const mode = process.argv[2];

if (!mode || !["admin", "issuer"].includes(mode)) {
  console.error("");
  console.error("Invalid signer mode.");
  console.error("");
  console.error("Usage:");
  console.error("  node scripts/switchBackendSigner.js admin");
  console.error("  node scripts/switchBackendSigner.js issuer");
  console.error("");
  console.error("Or use npm scripts:");
  console.error("  npm run env:admin");
  console.error("  npm run env:issuer");
  console.error("");
  process.exit(1);
}

function ensureBackendDir() {
  const backendDir = path.dirname(BACKEND_ENV);

  if (!fs.existsSync(backendDir)) {
    console.error(`Missing backend directory: ${backendDir}`);
    process.exit(1);
  }
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
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return parseEnv(fs.readFileSync(filePath, "utf8"));
}

function writeEnv(filePath, env) {
  const preferredOrder = [
    "PORT",

    "DB_HOST",
    "DB_PORT",
    "DB_USERNAME",
    "DB_PASSWORD",
    "DB_NAME",

    "BLOCKCHAIN_RPC_URL",

    "ADMIN_API_KEY",

    "UNIVERSITY_PRIVATE_KEY",
    "ADMIN_PRIVATE_KEY",
    "ISSUER_PRIVATE_KEY",

    "ISSUER_REGISTRY_ADDRESS",
    "CREDENTIAL_REGISTRY_ADDRESS",
    "DIPLOMA_VERIFIER_ADDRESS",

    "DEMO_ADMIN_ADDRESS",
    "DEMO_ISSUER_ADDRESS",
    "DEMO_HOLDER_ADDRESS",
    "DEMO_VERIFIER_ADDRESS",
    "DEMO_SIGNER_MODE",
  ];

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

function maskPrivateKey(privateKey) {
  if (!privateKey || privateKey.length < 20) return privateKey;

  return `${privateKey.slice(0, 10)}...${privateKey.slice(-8)}`;
}

ensureBackendDir();

const currentEnv = readEnv(BACKEND_ENV);

const selectedSigner = DEMO_ACCOUNTS[mode];

const nextEnv = {
  ...DEFAULTS,
  ...currentEnv,

  ADMIN_PRIVATE_KEY: DEMO_ACCOUNTS.admin.privateKey,
  ISSUER_PRIVATE_KEY: DEMO_ACCOUNTS.issuer.privateKey,

  UNIVERSITY_PRIVATE_KEY: selectedSigner.privateKey,

  DEMO_ADMIN_ADDRESS: DEMO_ACCOUNTS.admin.address,
  DEMO_ISSUER_ADDRESS: DEMO_ACCOUNTS.issuer.address,
  DEMO_HOLDER_ADDRESS: DEMO_ACCOUNTS.holder.address,
  DEMO_VERIFIER_ADDRESS: DEMO_ACCOUNTS.verifier.address,

  DEMO_SIGNER_MODE: mode,
};

writeEnv(BACKEND_ENV, nextEnv);

console.log("");
console.log("backend/.env updated successfully.");
console.log("");
console.log(`Current signer mode: ${mode}`);
console.log(`Role: ${selectedSigner.role}`);
console.log(`Address: ${selectedSigner.address}`);
console.log(`Private key: ${maskPrivateKey(selectedSigner.privateKey)}`);
console.log("");
console.log("Demo addresses:");
console.log(`Admin / Owner:        ${DEMO_ACCOUNTS.admin.address}`);
console.log(`University / Issuer:  ${DEMO_ACCOUNTS.issuer.address}`);
console.log(`Student / Holder:     ${DEMO_ACCOUNTS.holder.address}`);
console.log(`Verifier / Employer:  ${DEMO_ACCOUNTS.verifier.address}`);
console.log("");
console.log("Next step:");
console.log("  Restart backend after switching signer.");
console.log("");
console.log("Frontend flow:");
if (mode === "admin") {
  console.log("  Use this mode for: University -> Add issuer");
} else {
  console.log("  Use this mode for: University -> Issue / Revoke credential");
}
console.log("");