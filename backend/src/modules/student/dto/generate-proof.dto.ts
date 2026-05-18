import {
  IsString,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
} from 'class-validator';
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  includeDegree?: boolean;
}