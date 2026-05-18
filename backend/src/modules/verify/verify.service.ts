import { Injectable, NotFoundException } from '@nestjs/common';
import { VerifierService } from '../../blockchain/services/verifier.service';
import { CredentialService } from '../../blockchain/services/credential.service';
import { VerifyFullDto, VerifyDegreeDto } from './dto/verify.dto';

@Injectable()
export class VerifyService {
  constructor(
    private verifierService: VerifierService,
    private credentialService: CredentialService,
  ) {}

  async checkStatus(credentialId: string) {
    const exists = await this.credentialService.credentialExists(credentialId);
    if (!exists) {
      throw new NotFoundException('Credential not found');
    }

    const isRevoked = await this.credentialService.isRevoked(credentialId);
    const status = await this.verifierService.verifyCredentialStatus(credentialId);

    return {
      credentialId,
      valid: status,
      revoked: isRevoked,
    };
  }

  async verifyFull(dto: VerifyFullDto) {
    const { credentialId, courseId, courseName, semester, creditsScaled, grade, proof, signature } = dto;

    const exists = await this.credentialService.credentialExists(credentialId);
    if (!exists) {
      throw new NotFoundException('Credential not found');
    }

    const result = await this.verifierService.verifyCredentialPackage(
      credentialId,
      courseId,
      courseName,
      semester,
      creditsScaled,
      grade,
      proof,
      signature,
    );

    return {
      credentialId,
      valid: result,
    };
  }

  async verifyDegree(dto: VerifyDegreeDto) {
    const {
      credentialId,
      degreeName,
      major,
      graduationYear,
      proof,
      signature,
    } = dto;

    const exists = await this.credentialService.credentialExists(credentialId);

    if (!exists) {
      throw new NotFoundException('Credential not found');
    }

    const result = await this.verifierService.verifyDegreePackage(
      credentialId,
      degreeName,
      major,
      graduationYear,
      proof,
      signature,
    );

    return {
      credentialId,
      degreeName,
      major,
      graduationYear,
      valid: result,
    };
  }
}