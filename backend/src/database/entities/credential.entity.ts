import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { User } from './user.entity';
import { Transcript } from './transcript.entity';

@Entity('credentials')
export class Credential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  credentialId: string;

  @Column()
  holderAddress: string;

  @ManyToOne(() => User, (user) => user.credentials)
  @JoinColumn({ name: 'holderAddress', referencedColumnName: 'walletAddress' })
  holder: User;

  @Column()
  issuerAddress: string;

  @Column()
  merkleRoot: string;

  @Column({ nullable: true })
  metadataHash: string;

  @Column({ default: false })
  revoked: boolean;

  @Column({ nullable: true })
  signature: string;

  @CreateDateColumn()
  issuedAt: Date;

  @OneToOne(() => Transcript, (transcript) => transcript.credential)
  transcript: Transcript;
}