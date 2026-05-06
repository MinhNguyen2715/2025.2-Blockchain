import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers, Contract, Wallet } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ContractService implements OnModuleInit {
  private provider: ethers.JsonRpcProvider;
  private adminWallet: Wallet;

  issuerRegistry: any;
  credentialRegistry: any;
  diplomaVerifier: any;

  constructor(private configService: ConfigService) {
    this.provider = new ethers.JsonRpcProvider(
      this.configService.get('BLOCKCHAIN_RPC_URL') || 'http://localhost:8545',
    );
  }

  private loadAbi(contractName: string): any[] {
    const artifactsPath = path.join(
      process.cwd(),
      'artifacts',
      'contracts',
      contractName,
      `${contractName}.json`,
    );
    const abiData = JSON.parse(fs.readFileSync(artifactsPath, 'utf-8'));
    return abiData.abi;
  }

  async onModuleInit() {
    const privateKey = this.configService.get('UNIVERSITY_PRIVATE_KEY');
    if (privateKey && privateKey !== '0x...' && privateKey.length > 0) {
      try {
        // Clean the key - ethers v6 Wallet constructor needs proper format
        let key = privateKey.trim();
        
        // Remove 0x prefix if present
        if (key.startsWith('0x')) {
          key = key.substring(2);
        }
        
        // Validate: should be valid 64-character hex (32 bytes)
        const validHex = /^[0-9a-fA-F]{64}$/;
        if (!validHex.test(key)) {
          console.error('Invalid private key format - must be 64 hex characters');
          return;
        }
        
        this.adminWallet = new ethers.Wallet(key, this.provider);
        console.log('Wallet loaded:', this.adminWallet.address);
      } catch (e) {
        console.error('Failed to load wallet:', e);
      }
    } else {
      console.log('No private key configured');
    }

    const issuerRegistryAddress = this.configService.get('ISSUER_REGISTRY_ADDRESS');
    const credentialRegistryAddress = this.configService.get('CREDENTIAL_REGISTRY_ADDRESS');
    const diplomaVerifierAddress = this.configService.get('DIPLOMA_VERIFIER_ADDRESS');

    if (issuerRegistryAddress) {
      this.issuerRegistry = new Contract(
        issuerRegistryAddress,
        this.loadAbi('IssuerRegistry.sol'),
        this.provider,
      );
    }

    if (credentialRegistryAddress) {
      this.credentialRegistry = new Contract(
        credentialRegistryAddress,
        this.loadAbi('CredentialRegistry.sol'),
        this.provider,
      );
    }

    if (diplomaVerifierAddress) {
      this.diplomaVerifier = new Contract(
        diplomaVerifierAddress,
        this.loadAbi('DiplomaVerifier.sol'),
        this.provider,
      );
    }
  }

  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  getWallet(): Wallet {
    return this.adminWallet;
  }
}