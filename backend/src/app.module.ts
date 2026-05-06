import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UniversityModule } from './modules/university/university.module';
import { StudentModule } from './modules/student/student.module';
import { VerifyModule } from './modules/verify/verify.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { SharedModule } from './shared/shared.module';
import { User } from './database/entities/user.entity';
import { Credential } from './database/entities/credential.entity';
import { Transcript } from './database/entities/transcript.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'diploma',
      entities: [User, Credential, Transcript],
      synchronize: true,
    }),
    SharedModule,
    BlockchainModule,
    UniversityModule,
    StudentModule,
    VerifyModule,
  ],
})
export class AppModule {}