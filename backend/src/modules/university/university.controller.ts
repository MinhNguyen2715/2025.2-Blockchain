import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UniversityService } from './university.service';
import { IssueCredentialDto } from './dto/issue-credential.dto';
import { RevokeCredentialDto, AddIssuerDto } from './dto/revoke-credential.dto';

@ApiTags('university')
@Controller('university')
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

  @Post('add-issuer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add authorized issuer (admin only)' })
  @ApiResponse({ status: 200, description: 'Issuer added successfully' })
  async addIssuer(@Body() dto: AddIssuerDto) {
    return this.universityService.addIssuer(dto);
  }
}