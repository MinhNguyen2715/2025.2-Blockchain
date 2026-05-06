import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  async issueCredential(dto: IssueCredentialDto) {
    const { holderAddress, studentId, studentName, transcript, issuerWallet } = dto;

    const isAuthorized = await this.issuerService.isAuthorizedIssuer(issuerWallet);
    if (!isAuthorized) {
      throw new BadRequestException('Issuer not authorized');
    }

    const { tree, root: merkleRoot } = this.diplomaUtils.buildTranscriptMerkleTree(transcript);

    const credentialId = ethers.id(`credential-${studentId}-${Date.now()}`);
    const metadataHash = ethers.id(`metadata-${studentId}`);

    const payload = {
      credentialId,
      holder: holderAddress,
      merkleRoot,
      metadataHash,
      issuer: issuerWallet,
    } as Record<string, unknown>;

    const provider = this.contractService.getProvider();
    const wallet = new ethers.Wallet(issuerWallet, provider);
    const chainId = (await provider.getNetwork()).chainId;
    const contractAddress = await this.contractService.credentialRegistry.getAddress();

    const signature = await this.diplomaUtils.signCredentialPayload(
      wallet,
      Number(chainId),
      contractAddress,
      payload,
    );

    await this.credentialService.issueCredential(
      credentialId,
      holderAddress,
      merkleRoot,
      metadataHash,
      issuerWallet,
      signature,
    );

    const credential = this.credentialRepository.create({
      credentialId,
      holderAddress,
      issuerAddress: issuerWallet,
      merkleRoot,
      metadataHash,
      signature,
    });
    await this.credentialRepository.save(credential);

    const transcriptRecord = this.transcriptRepository.create({
      credentialId,
      courses: transcript,
      studentId,
      studentName,
    });
    await this.transcriptRepository.save(transcriptRecord);

    return {
      credentialId,
      merkleRoot,
      signature,
    };
  }

  async revokeCredential(dto: RevokeCredentialDto) {
    const { credentialId, issuerAddress } = dto;
    await this.credentialService.revokeCredential(credentialId, issuerAddress);

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