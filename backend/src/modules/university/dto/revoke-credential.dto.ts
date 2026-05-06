import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RevokeCredentialDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  credentialId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  issuerAddress: string;
}

export class AddIssuerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  issuerAddress: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  issuerName: string;
}