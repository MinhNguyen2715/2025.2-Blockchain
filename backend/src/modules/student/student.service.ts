import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../database/entities/user.entity';
import { Credential } from '../../database/entities/credential.entity';
import { Transcript } from '../../database/entities/transcript.entity';
import { DiplomaUtils } from '../../shared/diploma.utils';
import { RegisterStudentDto } from './dto/register-student.dto';
import { UploadTranscriptDto } from './dto/upload-transcript.dto';
import { GenerateProofDto } from './dto/generate-proof.dto';

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

  async registerStudent(dto: RegisterStudentDto) {
    const { walletAddress, name, studentId } = dto;

    const existingUser = await this.userRepository.findOne({
      where: { walletAddress },
    });

    if (existingUser) {
      return { message: 'Student already registered', user: existingUser };
    }

    const user = this.userRepository.create({
      walletAddress,
      role: UserRole.STUDENT,
      name,
      studentId,
    });

    await this.userRepository.save(user);
    return { message: 'Student registered', user };
  }

  async uploadTranscript(dto: UploadTranscriptDto) {
    const { credentialId, studentId, studentName, courses } = dto;

    const existing = await this.transcriptRepository.findOne({
      where: { credentialId },
    });

    if (existing) {
      existing.courses = courses;
      await this.transcriptRepository.save(existing);
      return { message: 'Transcript updated' };
    }

    const transcript = this.transcriptRepository.create({
      credentialId,
      studentId,
      studentName,
      courses,
    });

    await this.transcriptRepository.save(transcript);
    return { message: 'Transcript uploaded' };
  }

  async getCredentials(walletAddress: string) {
    const credentials = await this.credentialRepository.find({
      where: { holderAddress: walletAddress },
    });

    return credentials;
  }

  async generateProof(dto: GenerateProofDto) {
    const { credentialId, courseIds } = dto;

    const transcript = await this.transcriptRepository.findOne({
      where: { credentialId },
    });

    if (!transcript) {
      throw new NotFoundException('Transcript not found');
    }

    const { tree } = this.diplomaUtils.buildTranscriptMerkleTree(transcript.courses);

    const proofs: Record<string, string[]> = {};

    for (const courseId of courseIds) {
      const course = transcript.courses.find((c) => c.courseId === courseId);
      if (!course) {
        continue;
      }

      const leaf = this.diplomaUtils.hashTranscriptLeaf(course);
      proofs[courseId] = tree.getHexProof(leaf);
    }

    return {
      credentialId,
      courseData: transcript.courses.filter((c) => courseIds.includes(c.courseId)),
      proofs,
    };
  }
}