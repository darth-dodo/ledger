import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UploadResponse {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface StatementDetail extends UploadResponse {
  rawText: string | null;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = 'http://localhost:3000';

  constructor(private readonly http: HttpClient) {}

  uploadFile(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadResponse>(`${this.baseUrl}/upload`, formData, {
      reportProgress: false,
    });
  }

  getStatements(): Observable<UploadResponse[]> {
    return this.http.get<UploadResponse[]>(`${this.baseUrl}/statements`);
  }

  getStatement(id: string): Observable<StatementDetail> {
    return this.http.get<StatementDetail>(`${this.baseUrl}/statements/${id}`);
  }

  deleteStatement(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/statements/${id}`);
  }
}
