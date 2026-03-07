import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FileDropzoneComponent } from './file-dropzone.component';

function createMockFile(
  name: string,
  size: number,
  type: string,
): File {
  const content = new ArrayBuffer(size);
  return new File([content], name, { type });
}

function createDragEvent(
  type: string,
  files?: File[],
): DragEvent {
  const event = new Event(type, {
    bubbles: true,
    cancelable: true,
  }) as DragEvent;

  Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
  Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });

  if (files) {
    const dataTransfer = {
      files: files as unknown as FileList,
    };
    Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
  }

  return event;
}

describe('FileDropzoneComponent', () => {
  let component: FileDropzoneComponent;
  let fixture: ComponentFixture<FileDropzoneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileDropzoneComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FileDropzoneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
    expect(component.isDragOver).toBe(false);
    expect(component.error).toBe('');
  });

  describe('onDragOver', () => {
    it('should set isDragOver to true and call preventDefault/stopPropagation', () => {
      const event = createDragEvent('dragover');

      component.onDragOver(event);

      expect(component.isDragOver).toBe(true);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('onDragLeave', () => {
    it('should set isDragOver to false', () => {
      component.isDragOver = true;

      component.onDragLeave();

      expect(component.isDragOver).toBe(false);
    });
  });

  describe('onDrop', () => {
    it('should set isDragOver to false and emit fileSelected for a valid PDF', () => {
      const file = createMockFile('statement.pdf', 1024, 'application/pdf');
      const event = createDragEvent('drop', [file]);
      const emitSpy = vi.spyOn(component.fileSelected, 'emit');

      component.isDragOver = true;
      component.onDrop(event);

      expect(component.isDragOver).toBe(false);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith(file);
      expect(component.error).toBe('');
    });

    it('should not emit fileSelected when no files are dropped', () => {
      const event = createDragEvent('drop');
      Object.defineProperty(event, 'dataTransfer', {
        value: { files: { length: 0 } },
      });
      const emitSpy = vi.spyOn(component.fileSelected, 'emit');

      component.onDrop(event);

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('onFileSelect', () => {
    it('should emit fileSelected for a valid CSV file', () => {
      const file = createMockFile('transactions.csv', 2048, 'text/csv');
      const emitSpy = vi.spyOn(component.fileSelected, 'emit');

      const input = { files: [file] as unknown as FileList, value: 'C:\\fakepath\\transactions.csv' };
      Object.defineProperty(input.files, 'length', { value: 1 });
      const event = { target: input } as unknown as Event;

      component.onFileSelect(event);

      expect(emitSpy).toHaveBeenCalledWith(file);
      expect(input.value).toBe('');
    });
  });

  describe('processFile (via onDrop)', () => {
    it('should reject a file with an invalid extension', () => {
      const file = createMockFile('notes.txt', 512, 'text/plain');
      const event = createDragEvent('drop', [file]);
      const emitSpy = vi.spyOn(component.fileSelected, 'emit');

      component.onDrop(event);

      expect(emitSpy).not.toHaveBeenCalled();
      expect(component.error).toBe(
        'Invalid file type. Please upload a PDF or CSV file.',
      );
    });

    it('should reject a file with an invalid MIME type but valid extension pattern', () => {
      // File has .pdf extension but wrong MIME type
      const file = createMockFile('report.pdf', 1024, 'application/octet-stream');
      const event = createDragEvent('drop', [file]);
      const emitSpy = vi.spyOn(component.fileSelected, 'emit');

      component.onDrop(event);

      expect(emitSpy).not.toHaveBeenCalled();
      expect(component.error).toContain('Invalid file type:');
      expect(component.error).toContain('application/octet-stream');
    });

    it('should reject a file exceeding 10MB', () => {
      const size = 11 * 1024 * 1024; // 11MB
      const file = createMockFile('large.pdf', size, 'application/pdf');
      const event = createDragEvent('drop', [file]);
      const emitSpy = vi.spyOn(component.fileSelected, 'emit');

      component.onDrop(event);

      expect(emitSpy).not.toHaveBeenCalled();
      expect(component.error).toContain('File too large');
      expect(component.error).toContain('11.0MB');
      expect(component.error).toContain('Maximum: 10MB');
    });

    it('should accept a file with empty MIME type but valid extension', () => {
      // Browsers sometimes report empty string for MIME type
      const file = createMockFile('data.csv', 4096, '');
      const event = createDragEvent('drop', [file]);
      const emitSpy = vi.spyOn(component.fileSelected, 'emit');

      component.onDrop(event);

      expect(emitSpy).toHaveBeenCalledWith(file);
      expect(component.error).toBe('');
    });
  });
});
