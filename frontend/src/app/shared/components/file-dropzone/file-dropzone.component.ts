import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

const ALLOWED_TYPES = ['application/pdf', 'text/csv'];
const ALLOWED_EXTENSIONS = ['.pdf', '.csv'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

@Component({
  selector: 'app-file-dropzone',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="dropzone"
      [class.dragover]="isDragOver"
      [class.error]="error"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave()"
      (drop)="onDrop($event)"
      (click)="fileInput.click()"
    >
      <input #fileInput type="file" accept=".pdf,.csv" (change)="onFileSelect($event)" hidden />

      <div class="dropzone-content">
        <svg
          class="dropzone-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path d="M12 16V4m0 0L8 8m4-4l4 4" stroke-linecap="round" stroke-linejoin="round" />
          <path
            d="M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <p class="dropzone-text">
          @if (isDragOver) {
            Drop your file here
          } @else {
            Drag & drop a bank statement or <span class="link">browse</span>
          }
        </p>
        <p class="dropzone-hint">PDF or CSV, up to 10MB</p>
      </div>

      @if (error) {
        <p class="dropzone-error">{{ error }}</p>
      }
    </div>
  `,
  styles: [
    `
      .dropzone {
        border: 2px dashed #d0d5dd;
        border-radius: 12px;
        padding: 3rem 2rem;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
        background: #fafafa;
      }

      .dropzone:hover,
      .dropzone.dragover {
        border-color: #4361ee;
        background: #f0f4ff;
      }

      .dropzone.error {
        border-color: #e74c3c;
        background: #fef2f2;
      }

      .dropzone-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      }

      .dropzone-icon {
        width: 48px;
        height: 48px;
        color: #667085;
      }

      .dropzone.dragover .dropzone-icon {
        color: #4361ee;
      }

      .dropzone-text {
        font-size: 1rem;
        color: #344054;
      }

      .link {
        color: #4361ee;
        font-weight: 500;
      }

      .dropzone-hint {
        font-size: 0.875rem;
        color: #667085;
      }

      .dropzone-error {
        margin-top: 0.75rem;
        color: #e74c3c;
        font-size: 0.875rem;
        font-weight: 500;
      }
    `,
  ],
})
export class FileDropzoneComponent {
  @Output() fileSelected = new EventEmitter<File>();

  isDragOver = false;
  error = '';

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(): void {
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.processFile(files[0]);
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.processFile(input.files[0]);
      input.value = ''; // Reset so same file can be re-selected
    }
  }

  private processFile(file: File): void {
    this.error = '';

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      this.error = `Invalid file type. Please upload a PDF or CSV file.`;
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type) && file.type !== '') {
      this.error = `Invalid file type: ${file.type}. Allowed: PDF, CSV.`;
      return;
    }

    if (file.size > MAX_SIZE) {
      this.error = `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum: 10MB.`;
      return;
    }

    this.fileSelected.emit(file);
  }
}
