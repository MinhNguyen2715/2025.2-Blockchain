import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UniversityService } from './university.service';
import { IssueCredentialDto } from './dto/issue-credential.dto';
import { RevokeCredentialDto } from './dto/revoke-credential.dto';
import { IssuerApiKeyGuard } from '../../shared/guards/issuer-api-key.guard';

@ApiTags('university')
@Controller('university')
@UseGuards(IssuerApiKeyGuard)
export class UniversityController {
  constructor(private readonly universityService: UniversityService) {}

  @Post('issue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Issue credential to a student' })
  @ApiResponse({ status: 200, description: 'Credential issued successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async issueCredential(@Body() dto: IssueCredentialDto) {
    return this.universityService.issueCredential(dto);
  }

  @Post('revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a credential' })
  @ApiResponse({ status: 200, description: 'Credential revoked successfully' })
  async revokeCredential(@Body() dto: RevokeCredentialDto) {
    return this.universityService.revokeCredential(dto);
  }
}