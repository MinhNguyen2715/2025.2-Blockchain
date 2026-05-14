import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StudentService } from './student.service';
import { RegisterStudentDto } from './dto/register-student.dto';
import { GenerateProofDto } from './dto/generate-proof.dto';

@ApiTags('student')
@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new student' })
  @ApiResponse({ status: 201, description: 'Student registered' })
  async registerStudent(@Body() dto: RegisterStudentDto) {
    return this.studentService.registerStudent(dto);
  }

  @Get('credentials/:walletAddress')
  @ApiOperation({ summary: 'Get all credentials for a student' })
  @ApiResponse({ status: 200, description: 'Credentials found' })
  async getCredentials(@Param('walletAddress') walletAddress: string) {
    return this.studentService.getCredentials(walletAddress);
  }

  @Post('generate-proof')
  @ApiOperation({ summary: 'Generate Merkle proof for specific course(s)' })
  @ApiResponse({ status: 200, description: 'Proof generated' })
  async generateProof(@Body() dto: GenerateProofDto) {
    return this.studentService.generateProof(dto);
  }
}