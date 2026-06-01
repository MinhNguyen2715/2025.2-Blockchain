import { Injectable } from '@nestjs/common';
import { Contract } from 'ethers';
import { ContractService } from './contract.service';
import { getAdminWallet } from '../signers';

@Injectable()
export class IssuerService {
  constructor(private contractService: ContractService) {}

  async isAuthorizedIssuer(address: string): Promise<boolean> {
    const registry = this.contractService.getIssuerRegistry() as Contract;

    return registry.isAuthorizedIssuer(address);
  }

  async addIssuer(address: string, name: string): Promise<void> {
    const wallet = getAdminWallet();

    const registry = this.contractService
      .getIssuerRegistry()
      .connect(wallet) as unknown as Contract;

    const tx = await registry.addIssuer(address, name);
    await tx.wait();
  }

  async removeIssuer(address: string): Promise<void> {
    const wallet = getAdminWallet();

    const registry = this.contractService
      .getIssuerRegistry()
      .connect(wallet) as unknown as Contract;

    const tx = await registry.removeIssuer(address);
    await tx.wait();
  }
}