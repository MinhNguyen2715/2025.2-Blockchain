import { IsString, IsArray, IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyFullDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  credentialId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  courseName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  semester: string;

  @ApiProperty()
  @IsNumber()
  creditsScaled: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  grade: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsNotEmpty()
  proof: string[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signature: string;
}