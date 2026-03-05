import { Module } from '@nestjs/common';
import { MistralService } from './mistral.service.js';

@Module({
  providers: [MistralService],
  exports: [MistralService],
})
export class MistralModule {}
