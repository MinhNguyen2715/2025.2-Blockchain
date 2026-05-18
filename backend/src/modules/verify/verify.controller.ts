import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VerifyService } from './verify.service';
import { VerifyFullDto, VerifyDegreeDto } from './dto/verify.dto';

@ApiTags('verify')
@Controller('verify')
export class VerifyController {
  constructor(private readonly verifyService: VerifyService) {}

  @Get('status/:credentialId')
  @ApiOperation({ summary: 'Check if credential is valid' })
  @ApiResponse({ status: 200, description: 'Credential status' })
  async checkStatus(@Param('credentialId') credentialId: string) {
    return this.verifyService.checkStatus(credentialId);
  }

  @Post('full')
  @ApiOperation({ summary: 'Verify credential with course proof' })
  @ApiResponse({ status: 200, description: 'Verification result' })
  async verifyFull(@Body() dto: VerifyFullDto) {
    return this.verifyService.verifyFull(dto);
  }

  @Post('degree')
  @ApiOperation({ summary: 'Verify degree/major proof' })
  @ApiResponse({ status: 200, description: 'Degree verification result' })
  async verifyDegree(@Body() dto: VerifyDegreeDto) {
    return this.verifyService.verifyDegree(dto);
  }
}