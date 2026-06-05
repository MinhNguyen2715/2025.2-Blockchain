export const LOCAL_CONFIG = {
  database: {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || "5432",
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || "123456",
    name: process.env.DB_NAME || "diploma",
  },

  server: {
    backendPort: process.env.PORT || "3000",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
    apiBase: process.env.VITE_API_BASE || "http://localhost:3000/api",
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545",
  },

  apiKeys: {
    admin: process.env.ADMIN_API_KEY || "123456",
    issuer: process.env.ISSUER_API_KEY || "demo-issuer-key",
  },

  wallets: {
    adminAddress: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    adminPrivateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",

    issuerAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    issuerPrivateKey:
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",

    holderAddress: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
    verifierAddress: "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
  },

  demoIssuer: {
    name: "Hanoi University of Science and Technology",
  },
};