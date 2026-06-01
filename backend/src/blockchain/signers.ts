import { ethers } from "ethers";

export function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;

  if (!rpcUrl) {
    throw new Error("Missing BLOCKCHAIN_RPC_URL in backend/.env");
  }

  return new ethers.JsonRpcProvider(rpcUrl);
}

export function getAdminWallet(): ethers.Wallet {
  const privateKey = process.env.ADMIN_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("Missing ADMIN_PRIVATE_KEY in backend/.env");
  }

  return new ethers.Wallet(privateKey, getProvider());
}

export function getIssuerWallet(): ethers.Wallet {
  const privateKey =
    process.env.ISSUER_PRIVATE_KEY || process.env.UNIVERSITY_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("Missing ISSUER_PRIVATE_KEY in backend/.env");
  }

  return new ethers.Wallet(privateKey, getProvider());
}