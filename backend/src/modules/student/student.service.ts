import { Injectable, NotFoundException, BadRequestException, ForbiddenException} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../database/entities/user.entity';
import { Credential } from '../../database/entities/credential.entity';
import { Transcript } from '../../database/entities/transcript.entity';
import { DiplomaUtils } from '../../shared/diploma.utils';
import { RegisterStudentDto } from './dto/register-student.dto';
import { GenerateProofDto } from './dto/generate-proof.dto';
import { ethers } from 'ethers';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Credential)
    private credentialRepository: Repository<Credential>,
    @InjectRepository(Transcript)
    private transcriptRepository: Repository<Transcript>,
    private diplomaUtils: DiplomaUtils,
  ) {}

  private normalizeAddress(address: string): string {
    if (!ethers.isAddress(address)) {
      throw new BadRequestException(`Invalid Ethereum address: ${address}`);
    }

    return ethers.getAddress(address);
  }
  
  async registerStudent(dto: RegisterStudentDto) {
    const { walletAddress, name, studentId } = dto;
    const normalizedWallet = this.normalizeAddress(walletAddress);

    const existingUser = await this.userRepository.findOne({
      where: { walletAddress: normalizedWallet },
    });

    if (existingUser) {
      return { message: 'Student already registered', user: existingUser };
    }
    
    const user = this.userRepository.create({
      walletAddress: normalizedWallet,
      role: UserRole.STUDENT,
      name,
      studentId,
    });

    await this.userRepository.save(user);
    return { message: 'Student registered', user };
  }

  async getCredentials(walletAddress: string) {
    const normalizedWallet = this.normalizeAddress(walletAddress);
    const credentials = await this.credentialRepository.find({
      where: { holderAddress: normalizedWallet },
    });

    return credentials;
  }

  async generateProof(dto: GenerateProofDto) {
    const { credentialId, courseIds, holderAddress, includeDegree } = dto;
    const normalizedHolderAddress = this.normalizeAddress(holderAddress);

    const transcript = await this.transcriptRepository.findOne({
      where: { credentialId },
    });

    if (!transcript) {
      throw new NotFoundException('Transcript not found');
    }

    const { tree } = this.diplomaUtils.buildCredentialMerkleTree(
      transcript.degree,
      transcript.courses,
    );

    const credential = await this.credentialRepository.findOne({
      where: { credentialId },
    });

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    if (
      ethers.getAddress(credential.holderAddress) !==
      ethers.getAddress(normalizedHolderAddress)
    ) {
      throw new ForbiddenException('Only the credential holder can generate proof');
    }

    const proofs: Record<string, string[]> = {};

    let degreeProof: string[] | undefined;

    if (includeDegree) {
      degreeProof = this.diplomaUtils.getDegreeMerkleProof(
        tree,
        transcript.degree,
      );
    }

    for (const courseId of courseIds) {
      const course = transcript.courses.find((c) => c.courseId === courseId);
      if (!course) {
        throw new NotFoundException(`Course not found in transcript: ${courseId}`);
      }

      const leaf = this.diplomaUtils.hashTranscriptLeaf(course);
      proofs[courseId] = tree.getHexProof(leaf);
    }

    return {
      credentialId,
      degree: includeDegree ? transcript.degree : undefined,
      degreeProof,
      courseData: transcript.courses.filter((c) => courseIds.includes(c.courseId)),
      proofs,
    };
  }


}