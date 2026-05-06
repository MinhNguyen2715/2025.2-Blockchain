import { Injectable } from '@nestjs/common';
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
  ): Promise<void> {
    const wallet = this.contractService.getWallet();
    const contract = this.contractService.credentialRegistry.connect(wallet);

    const tx = await contract.issueCredential(
      credentialId,
      holderAddress,
      merkleRoot,
      metadataHash,
      issuerAddress,
      signature,
    );
    await tx.wait();
  }

  async revokeCredential(credentialId: string, issuerAddress: string): Promise<void> {
    const wallet = this.contractService.getWallet();
    const contract = this.contractService.credentialRegistry.connect(wallet);

    const tx = await contract.revokeCredential(credentialId);
    await tx.wait();
  }

  async getMerkleRoot(credentialId: string): Promise<string> {
    return this.contractService.credentialRegistry.getMerkleRoot(credentialId);
  }

  async credentialExists(credentialId: string): Promise<boolean> {
    return this.contractService.credentialRegistry.credentialExists(credentialId);
  }

  async isRevoked(credentialId: string): Promise<boolean> {
    return this.contractService.credentialRegistry.isRevoked(credentialId);
  }
}