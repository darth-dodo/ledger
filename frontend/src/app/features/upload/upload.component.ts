import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileDropzoneComponent } from '../../shared/components/file-dropzone/file-dropzone.component';
import { ApiService, UploadResponse } from '../../core/services/api.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FileDropzoneComponent],
  template: `
    <div class="max-w-xl">
      <h2 class="text-2xl font-semibold mb-1">Upload Statement</h2>
      <p class="text-base-content/60 mb-6">
        Upload your bank statement (PDF or CSV) to get started.
      </p>

      <app-file-dropzone (fileSelected)="onFileSelected($event)" />

      @if (isUploading) {
        <div class="alert alert-info mt-4">
          <span class="loading loading-spinner loading-sm"></span>
          <span>Uploading...</span>
        </div>
      }

      @if (uploadError) {
        <div role="alert" class="alert alert-error mt-4">
          <span>{{ uploadError }}</span>
        </div>
      }

      @if (statements.length > 0) {
        <div class="mt-8">
          <h3 class="text-lg font-semibold mb-3">Uploaded Statements</h3>
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Filename</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (statement of statements; track statement.id) {
                  <tr class="hover">
                    <td>
                      <span class="badge badge-info badge-sm font-semibold">{{
                        statement.fileType | uppercase
                      }}</span>
                    </td>
                    <td class="font-medium max-w-xs truncate">{{ statement.filename }}</td>
                    <td class="text-base-content/60 text-sm whitespace-nowrap">
                      {{ formatSize(statement.fileSize) }}
                    </td>
                    <td class="text-base-content/60 text-sm whitespace-nowrap">
                      {{ formatDate(statement.uploadedAt) }}
                    </td>
                    <td>
                      <button
                        class="btn btn-ghost btn-xs text-base-content/50 hover:text-error"
                        (click)="deleteStatement(statement.id)"
                        [disabled]="deletingId === statement.id"
                      >
                        @if (deletingId === statement.id) {
                          <span class="loading loading-spinner loading-xs"></span>
                        } @else {
                          Delete
                        }
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
  styles: [],
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
