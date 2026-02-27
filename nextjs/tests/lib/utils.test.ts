import { cn } from '@/lib/utils';

describe('cn utility', () => {
  it('merges class names', () => {
    const result = cn('text-sm', 'font-bold');
    expect(result).toContain('text-sm');
    expect(result).toContain('font-bold');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const result = cn('base-class', isActive && 'active');
    expect(result).toContain('base-class');
    expect(result).toContain('active');
  });

  it('handles false conditional classes', () => {
    const isActive = false;
    const result = cn('base-class', isActive && 'active');
    expect(result).toContain('base-class');
    expect(result).not.toContain('active');
  });
});
