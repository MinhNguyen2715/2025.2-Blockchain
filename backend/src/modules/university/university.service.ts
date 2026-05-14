import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ethers } from 'ethers';
import { ContractService } from '../../blockchain/services/contract.service';
import { IssuerService } from '../../blockchain/services/issuer.service';
import { CredentialService } from '../../blockchain/services/credential.service';
import { DiplomaUtils } from '../../shared/diploma.utils';
import { User, UserRole } from '../../database/entities/user.entity';
import { Credential } from '../../database/entities/credential.entity';
import { Transcript } from '../../database/entities/transcript.entity';
import { IssueCredentialDto } from './dto/issue-credential.dto';
import { RevokeCredentialDto, AddIssuerDto } from './dto/revoke-credential.dto';

@Injectable()
export class UniversityService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Credential)
    private credentialRepository: Repository<Credential>,
    @InjectRepository(Transcript)
    private transcriptRepository: Repository<Transcript>,
    private contractService: ContractService,
    private issuerService: IssuerService,
    private credentialService: CredentialService,
    private diplomaUtils: DiplomaUtils,
    private readonly dataSource: DataSource,
  ) {}
  private normalizeAddress(address: string): string {
    if (!ethers.isAddress(address)) {
      throw new BadRequestException(`Invalid Ethereum address: ${address}`);
    }

    return ethers.getAddress(address);
  }
  async issueCredential(dto: IssueCredentialDto) {
    const {
      holderAddress,
      studentId,
      studentName,
      transcript,
      issuerAddress,
    } = dto;

    const normalizedIssuer = this.normalizeAddress(issuerAddress);
    const normalizedHolder = this.normalizeAddress(holderAddress);

    const wallet = this.contractService.getWallet();

    if (!wallet) {
      throw new BadRequestException('Backend signer wallet is not configured');
    }

    if (ethers.getAddress(wallet.address) !== normalizedIssuer) {
      throw new BadRequestException(
        'issuerAddress does not match backend signer wallet',
      );
    }

    const isAuthorized = 
      await this.issuerService.isAuthorizedIssuer(normalizedIssuer);

    if (!isAuthorized) {
      throw new BadRequestException('Issuer not authorized');
    }

    const { root: merkleRoot } =
      this.diplomaUtils.buildTranscriptMerkleTree(transcript);

    const credentialId = ethers.id(`credential-${studentId}-${Date.now()}`);
    const metadataHash = ethers.id(`metadata-${studentId}`);

    const provider = this.contractService.getProvider();
    const chainId = Number((await provider.getNetwork()).chainId);
    const contractAddress = await this.contractService.getCredentialRegistry().getAddress();

    const payload = {
      credentialId,
      holder: normalizedHolder,
      merkleRoot,
      metadataHash,
      issuer: normalizedIssuer,
    };

    const signature = await this.diplomaUtils.signCredentialPayload(
      wallet,
      chainId,
      contractAddress,
      payload,
    );

    const txHash = await this.credentialService.issueCredential(
      credentialId,
      normalizedHolder,
      merkleRoot,
      metadataHash,
      normalizedIssuer,
      signature,
    );

    await this.dataSource.transaction(async (manager) => {
    const credential = manager.create(Credential, {
      credentialId,
      holderAddress: normalizedHolder,
      issuerAddress: normalizedIssuer,
      merkleRoot,
      metadataHash,
      signature,
    });

    await manager.save(credential);

    const transcriptRecord = manager.create(Transcript, {
      credentialId,
      courses: transcript,
      studentId,
      studentName,
    });

    await manager.save(transcriptRecord);
  });

    return {
      credentialId,
      merkleRoot,
      signature,
      txHash,
    };
  }

  async revokeCredential(dto: RevokeCredentialDto) {
    const { credentialId } = dto;
    await this.credentialService.revokeCredential(credentialId);

    await this.credentialRepository.update(
      { credentialId },
      { revoked: true },
    );

    return { message: 'Credential revoked' };
  }

  async addIssuer(dto: AddIssuerDto) {
    const { issuerAddress, issuerName } = dto;
    await this.issuerService.addIssuer(issuerAddress, issuerName);
    return { message: 'Issuer added' };
  }
}