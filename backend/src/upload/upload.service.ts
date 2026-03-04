import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Statement } from './entities/statement.entity';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class UploadService {
  constructor(
    @InjectRepository(Statement)
    private readonly statementRepo: Repository<Statement>,
  ) {}

  async createStatement(file: Express.Multer.File): Promise<Statement> {
    const statement = this.statementRepo.create({
      filename: file.originalname,
      fileType: this.extractFileType(file.originalname),
      filePath: file.filename,
      fileSize: file.size,
    });

    return this.statementRepo.save(statement);
  }

  async findAll(): Promise<Statement[]> {
    return this.statementRepo.find({
      order: { uploadedAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Statement> {
    const statement = await this.statementRepo.findOne({ where: { id } });
    if (!statement) {
      throw new NotFoundException(`Statement ${id} not found`);
    }
    return statement;
  }

  async remove(id: string, uploadDir: string): Promise<void> {
    const statement = await this.findOne(id);

    const filePath = path.join(uploadDir, statement.filePath);
    try {
      await fs.unlink(filePath);
    } catch {
      // File may already be deleted — proceed with DB cleanup
    }

    await this.statementRepo.remove(statement);
  }

  private extractFileType(filename: string): string {
    const ext = path.extname(filename).toLowerCase().slice(1);
    return ext === 'pdf' ? 'pdf' : 'csv';
  }
}
