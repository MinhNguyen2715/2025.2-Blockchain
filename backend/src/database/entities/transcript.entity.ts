import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Credential } from './credential.entity';

@Entity('transcripts')
export class Transcript {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  credentialId: string;

  @OneToOne(() => Credential, (credential) => credential.transcript)
  @JoinColumn({ name: 'credentialId', referencedColumnName: 'credentialId' })
  credential: Credential;

  @Column({ type: 'jsonb' })
  degree: {
    degreeName: string;
    major: string;
    graduationYear: string;
  };

  @Column({ type: 'jsonb' })
  courses: {
    courseId: string;
    courseName: string;
    semester: string;
    creditsScaled: number;
    grade: string;
  }[];

  @Column()
  studentId: string;

  @Column()
  studentName: string;

  @CreateDateColumn()
  createdAt: Date;
}