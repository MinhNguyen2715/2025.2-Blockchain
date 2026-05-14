import { Injectable } from '@nestjs/common';
import { ContractService } from './contract.service';

@Injectable()
export class IssuerService {
  constructor(private contractService: ContractService) {}

  async isAuthorizedIssuer(address: string): Promise<boolean> {
    return this.contractService.getIssuerRegistry().isAuthorizedIssuer(address);
  }

  async addIssuer(address: string, name: string): Promise<void> {
    const wallet = this.contractService.getWallet();
    const tx = await this.contractService.getIssuerRegistry()
      .connect(wallet)
      .addIssuer(address, name);
    await tx.wait();
  }

  async removeIssuer(address: string): Promise<void> {
    const wallet = this.contractService.getWallet();
    const tx = await this.contractService.issuerRegistry
      .connect(wallet)
      .removeIssuer(address);
    await tx.wait();
  }
}