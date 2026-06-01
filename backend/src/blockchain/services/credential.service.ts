import { BadRequestException, Injectable } from '@nestjs/common';
import { Contract } from 'ethers';
import { ContractService } from './contract.service';

@Injectable()
export class CredentialService {
  constructor(private contractService: ContractService) {}

  async issueCredential(
    credentialId: string,
    holderAddress: string,
    merkleRoot: string,
    metadataHash: string,
    issuerAddress: string,
    signature: string,
  ): Promise<string> {
    try {
      const wallet = this.contractService.getIssuerWallet();

      const contract = this.contractService
        .getCredentialRegistry()
        .connect(wallet) as Contract;

      const tx = await contract.issueCredential(
        credentialId,
        holderAddress,
        merkleRoot,
        metadataHash,
        issuerAddress,
        signature,
      );

      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error: any) {
      throw new BadRequestException(
        `Blockchain issueCredential failed: ${
          error?.reason || error?.message || String(error)
        }`,
      );
    }
  }

  async revokeCredential(credentialId: string): Promise<string> {
    try {
      const wallet = this.contractService.getIssuerWallet();

      const contract = this.contractService
        .getCredentialRegistry()
        .connect(wallet) as Contract;

      const tx = await contract.revokeCredential(credentialId);
      const receipt = await tx.wait();

      return receipt.hash;
    } catch (error: any) {
      throw new BadRequestException(
        `Blockchain revokeCredential failed: ${
          error?.reason || error?.message || String(error)
        }`,
      );
    }
  }

  async getMerkleRoot(credentialId: string): Promise<string> {
    return this.contractService.getCredentialRegistry().getMerkleRoot(credentialId);
  }

  async credentialExists(credentialId: string): Promise<boolean> {
    return this.contractService
      .getCredentialRegistry()
      .credentialExists(credentialId);
  }

  async isRevoked(credentialId: string): Promise<boolean> {
    return this.contractService.getCredentialRegistry().isRevoked(credentialId);
  }
}