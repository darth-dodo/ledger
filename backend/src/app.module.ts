import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { HealthModule } from './health/health.module';
import { UploadModule } from './upload/upload.module';
import { Statement } from './upload/entities/statement.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [Statement],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    HealthModule,
    UploadModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
