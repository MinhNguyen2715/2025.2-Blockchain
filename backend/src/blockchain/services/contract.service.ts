import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers, Contract, Wallet } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ContractService implements OnModuleInit {
  private provider: ethers.JsonRpcProvider;

  private adminWallet: Wallet;
  private issuerWallet: Wallet;

  private issuerRegistry: Contract;
  private credentialRegistry: Contract;
  private diplomaVerifier: Contract;

  constructor(private configService: ConfigService) {
    this.provider = new ethers.JsonRpcProvider(
      this.configService.get<string>('BLOCKCHAIN_RPC_URL') ||
        'http://localhost:8545',
    );
  }

  private loadAbi(solFile: string, contractName: string): any[] {
    const artifactsPath = path.resolve(
      process.cwd(),
      '..',
      'artifacts',
      'contracts',
      solFile,
      `${contractName}.json`,
    );

    if (!fs.existsSync(artifactsPath)) {
      throw new Error(`Artifact not found: ${artifactsPath}`);
    }

    const abiData = JSON.parse(fs.readFileSync(artifactsPath, 'utf-8'));
    return abiData.abi;
  }

  private normalizePrivateKey(value: string | undefined, envName: string): string {
    if (!value) {
      throw new Error(`${envName} is missing in .env`);
    }

    const key = value.trim().startsWith('0x')
      ? value.trim()
      : `0x${value.trim()}`;

    if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
      throw new Error(`Invalid ${envName} format`);
    }

    return key;
  }

  async onModuleInit() {
    const adminPrivateKey = this.normalizePrivateKey(
      this.configService.get<string>('ADMIN_PRIVATE_KEY'),
      'ADMIN_PRIVATE_KEY',
    );

    const issuerPrivateKey = this.normalizePrivateKey(
      this.configService.get<string>('ISSUER_PRIVATE_KEY') ||
        this.configService.get<string>('UNIVERSITY_PRIVATE_KEY'),
      'ISSUER_PRIVATE_KEY',
    );

    this.adminWallet = new ethers.Wallet(adminPrivateKey, this.provider);
    this.issuerWallet = new ethers.Wallet(issuerPrivateKey, this.provider);

    console.log('Admin wallet loaded:', this.adminWallet.address);
    console.log('Issuer wallet loaded:', this.issuerWallet.address);

    const issuerRegistryAddress = this.configService.get<string>(
      'ISSUER_REGISTRY_ADDRESS',
    );
    const credentialRegistryAddress = this.configService.get<string>(
      'CREDENTIAL_REGISTRY_ADDRESS',
    );
    const diplomaVerifierAddress = this.configService.get<string>(
      'DIPLOMA_VERIFIER_ADDRESS',
    );

    if (issuerRegistryAddress) {
      this.issuerRegistry = new Contract(
        issuerRegistryAddress,
        this.loadAbi('IssuerRegistry.sol', 'IssuerRegistry'),
        this.provider,
      );
    }

    if (credentialRegistryAddress) {
      this.credentialRegistry = new Contract(
        credentialRegistryAddress,
        this.loadAbi('CredentialRegistry.sol', 'CredentialRegistry'),
        this.provider,
      );
    }

    if (diplomaVerifierAddress) {
      this.diplomaVerifier = new Contract(
        diplomaVerifierAddress,
        this.loadAbi('DiplomaVerifier.sol', 'DiplomaVerifier'),
        this.provider,
      );
    }
  }

  getIssuerRegistry() {
    if (!this.issuerRegistry) {
      throw new Error('IssuerRegistry contract is not initialized');
    }

    return this.issuerRegistry;
  }

  getCredentialRegistry() {
    if (!this.credentialRegistry) {
      throw new Error('CredentialRegistry contract is not initialized');
    }

    return this.credentialRegistry;
  }

  getDiplomaVerifier() {
    if (!this.diplomaVerifier) {
      throw new Error('DiplomaVerifier contract is not initialized');
    }

    return this.diplomaVerifier;
  }

  getProvider() {
    if (!this.provider) {
      throw new Error('Blockchain provider is not initialized');
    }

    return this.provider;
  }

  getAdminWallet() {
    if (!this.adminWallet) {
      throw new Error('Admin wallet is not initialized');
    }

    return this.adminWallet;
  }

  getIssuerWallet() {
    if (!this.issuerWallet) {
      throw new Error('Issuer wallet is not initialized');
    }

    return this.issuerWallet;
  }

  getWallet() {
    return this.getIssuerWallet();
  }
}