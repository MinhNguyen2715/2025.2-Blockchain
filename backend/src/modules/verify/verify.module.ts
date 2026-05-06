import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerifyController } from './verify.controller';
import { VerifyService } from './verify.service';
import { Credential } from '../../database/entities/credential.entity';
import { BlockchainModule } from '../../blockchain/blockchain.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Credential]),
    BlockchainModule,
  ],
  controllers: [VerifyController],
  providers: [VerifyService],
})
export class VerifyModule {}