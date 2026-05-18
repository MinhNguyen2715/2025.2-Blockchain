import { IsString, IsArray, ValidateNested, IsNumber, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CourseDto {
  @ApiProperty()
  @IsString()
  courseId: string;

  @ApiProperty()
  @IsString()
  courseName: string;

  @ApiProperty()
  @IsString()
  semester: string;

  @ApiProperty()
  @IsNumber()
  creditsScaled: number;

  @ApiProperty()
  @IsString()
  grade: string;
}

export class DegreeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  degreeName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  major: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  graduationYear: string;
}

export class IssueCredentialDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  holderAddress: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  issuerAddress: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentName: string;

  @ApiProperty({ type: DegreeDto })
  @ValidateNested()
  @Type(() => DegreeDto)
  degree: DegreeDto;

  @ApiProperty({ type: [CourseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseDto)
  transcript: CourseDto[];
}