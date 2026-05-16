import { Injectable } from '@nestjs/common';
import { Contract } from 'ethers';
import { ContractService } from './contract.service';

@Injectable()
export class IssuerService {
  constructor(private contractService: ContractService) {}

  async isAuthorizedIssuer(address: string): Promise<boolean> {
    return this.contractService.getIssuerRegistry().isAuthorizedIssuer(address);
  }

  async addIssuer(address: string, name: string): Promise<void> {
    const wallet = this.contractService.getWallet();
    // ethers v6: cast the .connect() result back to Contract so the string-
    // indexer Proxy typing comes back and TS lets us call addIssuer/etc.
    const registry = this.contractService
      .getIssuerRegistry()
      .connect(wallet) as Contract;
    const tx = await registry.addIssuer(address, name);
    await tx.wait();
  }

  async removeIssuer(address: string): Promise<void> {
    const wallet = this.contractService.getWallet();
    // Was reaching into ContractService.issuerRegistry (private) — switched to
    // the public accessor used everywhere else.
    const registry = this.contractService
      .getIssuerRegistry()
      .connect(wallet) as Contract;
    const tx = await registry.removeIssuer(address);
    await tx.wait();
  }
}