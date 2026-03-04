import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileDropzoneComponent } from '../../shared/components/file-dropzone/file-dropzone.component';
import { ApiService, UploadResponse } from '../../core/services/api.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FileDropzoneComponent],
  template: `
    <div class="upload-page">
      <h2>Upload Statement</h2>
      <p class="subtitle">Upload your bank statement (PDF or CSV) to get started.</p>

      <app-file-dropzone (fileSelected)="onFileSelected($event)" />

      @if (isUploading) {
        <div class="status uploading">Uploading...</div>
      }

      @if (uploadError) {
        <div class="status error">{{ uploadError }}</div>
      }

      @if (statements.length > 0) {
        <div class="statements-section">
          <h3>Uploaded Statements</h3>
          <div class="statements-list">
            @for (statement of statements; track statement.id) {
              <div class="statement-card">
                <div class="statement-info">
                  <span class="statement-type">{{ statement.fileType | uppercase }}</span>
                  <span class="statement-name">{{ statement.filename }}</span>
                  <span class="statement-meta">
                    {{ formatSize(statement.fileSize) }}
                    &middot;
                    {{ formatDate(statement.uploadedAt) }}
                  </span>
                </div>
                <button
                  class="delete-btn"
                  (click)="deleteStatement(statement.id)"
                  [disabled]="deletingId === statement.id"
                >
                  @if (deletingId === statement.id) {
                    ...
                  } @else {
                    Delete
                  }
                </button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .upload-page {
        max-width: 640px;
      }

      h2 {
        font-size: 1.5rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
      }

      .subtitle {
        color: #667085;
        margin-bottom: 1.5rem;
      }

      .status {
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
      }

      .status.uploading {
        background: #f0f4ff;
        color: #4361ee;
      }

      .status.error {
        background: #fef2f2;
        color: #e74c3c;
      }

      .statements-section {
        margin-top: 2rem;
      }

      .statements-section h3 {
        font-size: 1.125rem;
        font-weight: 600;
        margin-bottom: 0.75rem;
      }

      .statements-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .statement-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        background: #fff;
        border: 1px solid #e4e7ec;
        border-radius: 8px;
      }

      .statement-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        min-width: 0;
      }

      .statement-type {
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.125rem 0.5rem;
        border-radius: 4px;
        background: #f0f4ff;
        color: #4361ee;
        flex-shrink: 0;
      }

      .statement-name {
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .statement-meta {
        font-size: 0.8125rem;
        color: #667085;
        white-space: nowrap;
        flex-shrink: 0;
      }

      .delete-btn {
        background: none;
        border: 1px solid #e4e7ec;
        border-radius: 6px;
        padding: 0.375rem 0.75rem;
        font-size: 0.8125rem;
        color: #667085;
        cursor: pointer;
        flex-shrink: 0;
        transition: all 0.15s ease;
      }

      .delete-btn:hover {
        color: #e74c3c;
        border-color: #e74c3c;
      }

      .delete-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ],
})
export class UploadComponent {
  private readonly api = inject(ApiService);

  statements: UploadResponse[] = [];
  isUploading = false;
  uploadError = '';
  deletingId = '';

  ngOnInit(): void {
    this.loadStatements();
  }

  onFileSelected(file: File): void {
    this.isUploading = true;
    this.uploadError = '';

    this.api.uploadFile(file).subscribe({
      next: () => {
        this.isUploading = false;
        this.loadStatements();
      },
      error: (err) => {
        this.isUploading = false;
        this.uploadError = err.error?.message ?? 'Upload failed. Please try again.';
      },
    });
  }

  deleteStatement(id: string): void {
    this.deletingId = id;
    this.api.deleteStatement(id).subscribe({
      next: () => {
        this.deletingId = '';
        this.statements = this.statements.filter((s) => s.id !== id);
      },
      error: () => {
        this.deletingId = '';
      },
    });
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private loadStatements(): void {
    this.api.getStatements().subscribe({
      next: (data) => (this.statements = data),
    });
  }
}
