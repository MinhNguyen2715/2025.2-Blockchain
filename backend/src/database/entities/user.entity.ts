import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { Credential } from './credential.entity';

export enum UserRole {
  ADMIN = 'admin',
  UNIVERSITY = 'university',
  STUDENT = 'student',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  walletAddress: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  universityName: string;

  @Column({ nullable: true })
  studentId: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Credential, (credential) => credential.holder)
  credentials: Credential[];
}