import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class IssuerApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const apiKey =
      request.headers['x-issuer-api-key'] ||
      request.headers['X-Issuer-Api-Key'];

    if (!apiKey) {
      throw new UnauthorizedException('Missing issuer API key');
    }

    if (apiKey !== process.env.ISSUER_API_KEY) {
      throw new UnauthorizedException('Invalid issuer API key');
    }

    return true;
  }
}