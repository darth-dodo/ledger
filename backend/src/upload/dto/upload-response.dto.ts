export interface UploadResponseDto {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface StatementDetailDto extends UploadResponseDto {
  rawText: string | null;
}
