import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { Statement } from './entities/statement.entity';
import { CsvParser } from './parsers/csv.parser';
import { PdfParser } from './parsers/pdf.parser';
import { TransactionsModule } from '../transactions/transactions.module';
import { MistralModule } from '../mistral/mistral.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Statement]),
    TransactionsModule,
    MistralModule,
  ],
  controllers: [UploadController],
  providers: [
    UploadService,
    { provide: 'PARSERS', useFactory: () => [new CsvParser(), new PdfParser()] },
  ],
  exports: [UploadService],
})
export class UploadModule {}
