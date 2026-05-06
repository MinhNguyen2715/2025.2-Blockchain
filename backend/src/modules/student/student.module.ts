import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { User } from '../../database/entities/user.entity';
import { Credential } from '../../database/entities/credential.entity';
import { Transcript } from '../../database/entities/transcript.entity';
import { BlockchainModule } from '../../blockchain/blockchain.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Credential, Transcript]),
    BlockchainModule,
  ],
  controllers: [StudentController],
  providers: [StudentService],
})
export class StudentModule {}