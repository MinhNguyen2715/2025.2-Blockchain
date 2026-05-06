import { Module, Global } from '@nestjs/common';
import { ContractService } from './services/contract.service';
import { IssuerService } from './services/issuer.service';
import { CredentialService } from './services/credential.service';
import { VerifierService } from './services/verifier.service';

@Global()
@Module({
  providers: [ContractService, IssuerService, CredentialService, VerifierService],
  exports: [ContractService, IssuerService, CredentialService, VerifierService],
})
export class BlockchainModule {}