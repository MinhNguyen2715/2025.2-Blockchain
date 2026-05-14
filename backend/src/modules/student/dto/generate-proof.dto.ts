import { IsString, IsArray, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateProofDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  credentialId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  holderAddress: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  courseIds: string[];
}