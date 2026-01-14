/**
 * Utility Functions Tests
 */

import { cn } from '@/lib/utils';

describe('cn (className utility)', () => {
  it('should merge class names', () => {
    const result = cn('px-2', 'py-1');
    expect(result).toContain('px-2');
    expect(result).toContain('py-1');
  });

  it('should handle conditional classes', () => {
    const result = cn('base-class', false && 'hidden', true && 'visible');
    expect(result).toContain('base-class');
    expect(result).toContain('visible');
    expect(result).not.toContain('hidden');
  });

  it('should merge Tailwind classes correctly', () => {
    const result = cn('px-2 py-1', 'px-4');
    // Should override px-2 with px-4
    expect(result).toContain('px-4');
    expect(result).toContain('py-1');
  });

  it('should handle undefined and null values', () => {
    const result = cn('base', undefined, null, 'other');
    expect(result).toContain('base');
    expect(result).toContain('other');
  });

  it('should handle empty strings', () => {
    const result = cn('', 'class1', '', 'class2');
    expect(result).toContain('class1');
    expect(result).toContain('class2');
  });
});
