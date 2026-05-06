import { IsString, IsArray, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateProofDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  credentialId: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsNotEmpty()
  courseIds: string[];
}