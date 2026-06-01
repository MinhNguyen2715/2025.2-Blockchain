import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminApiKeyGuard } from '../../shared/guards/admin-api-key.guard';
import { UniversityService } from '../university/university.service';
import { AddIssuerDto } from '../university/dto/revoke-credential.dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(AdminApiKeyGuard)
export class AdminController {
  constructor(private readonly universityService: UniversityService) {}

  @Post('issuers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add authorized issuer (admin only)' })
  @ApiResponse({ status: 200, description: 'Issuer added successfully' })
  async addIssuer(@Body() dto: AddIssuerDto) {
    return this.universityService.addIssuer(dto);
  }

  @Delete('issuers/:issuerAddress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove authorized issuer (admin only)' })
  async removeIssuer(@Param('issuerAddress') issuerAddress: string) {
    return this.universityService.removeIssuer(issuerAddress);
  }
}