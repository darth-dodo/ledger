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
      class="card border-2 border-dashed border-base-300 bg-base-200/50 cursor-pointer
             transition-all duration-200 hover:border-primary hover:bg-primary/5"
      [class.!border-primary]="isDragOver"
      [class.!bg-primary/5]="isDragOver"
      [class.!border-error]="error"
      [class.!bg-error/5]="error"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave()"
      (drop)="onDrop($event)"
      (click)="fileInput.click()"
    >
      <input #fileInput type="file" accept=".pdf,.csv" (change)="onFileSelect($event)" hidden />

      <div class="card-body items-center text-center py-12">
        <svg
          class="w-12 h-12 text-base-content/40"
          [class.!text-primary]="isDragOver"
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
        <p class="text-base text-base-content/80">
          @if (isDragOver) {
            Drop your file here
          } @else {
            Drag & drop a bank statement or <span class="text-primary font-medium">browse</span>
          }
        </p>
        <p class="text-sm text-base-content/50">PDF or CSV, up to 10MB</p>
      </div>

      @if (error) {
        <div class="px-6 pb-4">
          <div role="alert" class="alert alert-error alert-sm">
            <span>{{ error }}</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [],
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
