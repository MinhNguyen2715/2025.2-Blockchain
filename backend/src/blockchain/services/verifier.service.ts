import { Injectable } from '@nestjs/common';
import { ContractService } from './contract.service';

@Injectable()
export class VerifierService {
  constructor(private contractService: ContractService) {}

  async verifyCredentialStatus(credentialId: string): Promise<boolean> {
    return this.contractService
      .getDiplomaVerifier()
      .verifyCredentialStatus(credentialId);
  }

  async verifyCredentialSignature(credentialId: string, signature: string): Promise<boolean> {
    return this.contractService.getDiplomaVerifier().verifyCredentialSignature(
      credentialId,
      signature,
    );
  }

  async verifyCredentialPackage(
    credentialId: string,
    courseId: string,
    courseName: string,
    semester: string,
    creditsScaled: number,
    grade: string,
    proof: string[],
    signature: string,
  ): Promise<boolean> {
    return this.contractService.getDiplomaVerifier().verifyCredentialPackage(
      credentialId,
      courseId,
      courseName,
      semester,
      creditsScaled,
      grade,
      proof,
      signature,
    );
  }

  async verifyDegreePackage(
    credentialId: string,
    degreeName: string,
    major: string,
    graduationYear: string,
    proof: string[],
    signature: string,
  ): Promise<boolean> {
    return this.contractService.getDiplomaVerifier().verifyDegreePackage(
      credentialId,
      degreeName,
      major,
      graduationYear,
      proof,
      signature,
    );
  }

  async getCredentialMerkleRoot(credentialId: string): Promise<string> {
    return this.contractService.getDiplomaVerifier().getCredentialMerkleRoot(credentialId);
  }
}