import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Inject,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { UploadService } from './upload.service';
import { UploadResponseDto, StatementDetailDto } from './dto/upload-response.dto';
import { Statement } from './entities/statement.entity';

const ALLOWED_MIMES = ['application/pdf', 'text/csv'];
const ALLOWED_EXTENSIONS = ['.pdf', '.csv'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getUploadDir(): string {
  return process.env.UPLOAD_DIR ?? './uploads';
}

@Controller()
export class UploadController {
  constructor(@Inject(UploadService) private readonly uploadService: UploadService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = getUploadDir();
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          cb(null, `${uuidv4()}${ext}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    this.validateFile(file);

    const statement = await this.uploadService.createStatement(file, getUploadDir());
    return this.toUploadResponse(statement);
  }

  @Get('statements')
  async findAll(): Promise<UploadResponseDto[]> {
    const statements = await this.uploadService.findAll();
    return statements.map((s) => this.toUploadResponse(s));
  }

  @Get('statements/:id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<StatementDetailDto> {
    const statement = await this.uploadService.findOne(id);
    return this.toDetailResponse(statement);
  }

  @Delete('statements/:id')
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.uploadService.remove(id, getUploadDir());
  }

  @Delete('purge')
  async purge(): Promise<{ message: string }> {
    await this.uploadService.purgeAll(getUploadDir());
    return { message: 'All data purged successfully' };
  }

  private validateFile(file: Express.Multer.File): void {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid file type: ${file.mimetype}. Allowed: PDF, CSV`);
    }

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(`Invalid file extension: ${ext}. Allowed: .pdf, .csv`);
    }
  }

  private toUploadResponse(statement: Statement): UploadResponseDto {
    return {
      id: statement.id,
      filename: statement.filename,
      fileType: statement.fileType,
      fileSize: statement.fileSize,
      uploadedAt: statement.uploadedAt.toISOString(),
    };
  }

  private toDetailResponse(statement: Statement): StatementDetailDto {
    return {
      ...this.toUploadResponse(statement),
      rawText: statement.rawText,
    };
  }
}
