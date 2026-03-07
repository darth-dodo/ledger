import { TestBed } from '@angular/core/testing';
import { MarkdownPipe } from './markdown.pipe';

describe('MarkdownPipe', () => {
  let pipe: MarkdownPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    // Create the pipe within an injection context so inject(DomSanitizer) works
    pipe = TestBed.runInInjectionContext(() => new MarkdownPipe());
  });

  it('should transform **bold** to <strong> tags', () => {
    const result = pipe.transform('**bold text**');
    // SafeHtml toString gives the wrapped value; check via string conversion
    const html = result.toString();
    expect(html).toContain('<strong>');
    expect(html).toContain('bold text');
  });

  it('should transform markdown lists', () => {
    const input = '- item one\n- item two\n- item three';
    const result = pipe.transform(input);
    const html = result.toString();
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>');
    expect(html).toContain('item one');
    expect(html).toContain('item two');
  });

  it('should return empty string for empty input', () => {
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should return a SafeHtml value, not a plain string', () => {
    const result = pipe.transform('hello');
    // SafeHtml objects created by bypassSecurityTrustHtml are not plain strings
    expect(typeof result).not.toBe('string');
    // They do have a changingThisBreaksApplicationSecurity property (Angular internal)
    expect(
      (result as unknown as Record<string, unknown>).changingThisBreaksApplicationSecurity,
    ).toBeDefined();
  });

  it('should handle inline code', () => {
    const result = pipe.transform('use `console.log()`');
    const html = result.toString();
    expect(html).toContain('<code>');
    expect(html).toContain('console.log()');
  });
});
