import { Module, Global } from '@nestjs/common';
import { DiplomaUtils } from './diploma.utils';

@Global()
@Module({
  providers: [DiplomaUtils],
  exports: [DiplomaUtils],
})
export class SharedModule {}