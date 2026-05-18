import { render, screen } from '@testing-library/react';
import { TaskCard } from '@/components/task-card';

describe('TaskCard', () => {
  const mockTask = {
    id: '1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'TODO' as const,
    priority: 'HIGH' as const,
    projectId: 'project-1',
    assigneeId: 'user-1',
    dueDate: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    assignee: {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
    },
  };

  it('renders task title', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('renders task description', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('renders assignee name', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders priority badge', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  it('renders updatedAt as local date string', () => {
    // Regression: previously used toISOString().slice(0, 10) which always returns
    // the UTC calendar date, shifting users west of UTC back one day for midnight-UTC tasks.
    // Fix: toLocaleDateString() uses the browser/runtime local timezone.
    render(<TaskCard task={mockTask} />);
    const expected = new Date(mockTask.updatedAt).toLocaleDateString();
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('renders unassigned when no assignee', () => {
    const unassignedTask = { ...mockTask, assignee: null };
    render(<TaskCard task={unassignedTask} />);
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('shows "No due date" when dueDate is null', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText('No due date')).toBeInTheDocument();
  });

  describe('due date timezone regression', () => {
    // Regression: toLocaleDateString() without { timeZone: "UTC" } shifts UTC-midnight
    // dates back one day in any browser west of UTC (e.g. UTC-5 shows Mar 14 for Mar 15).
    // The fix: toISOString().slice(0, 10) extracts the UTC calendar date directly,
    // with no locale or timezone involved — result is always the stored date.

    it('displays UTC-midnight date as the correct calendar date', () => {
      // This is the classic off-by-one trigger: midnight UTC = prev-day evening in UTC-5.
      const task = { ...mockTask, dueDate: new Date('2026-03-15T00:00:00.000Z') };
      render(<TaskCard task={task} />);
      expect(screen.getByText('2026-03-15')).toBeInTheDocument();
    });

    it('displays noon-UTC date as the correct calendar date', () => {
      // Noon UTC is an alternative storage strategy; slicing still yields the right date.
      const task = { ...mockTask, dueDate: new Date('2026-03-15T12:00:00.000Z') };
      render(<TaskCard task={task} />);
      expect(screen.getByText('2026-03-15')).toBeInTheDocument();
    });

    it('handles dueDate arriving as an ISO string (post-JSON-parse)', () => {
      // After fetch(), Prisma's Date is serialized to a string; the component must
      // handle both Date objects and ISO strings without shifting the date.
      const task = { ...mockTask, dueDate: '2026-06-01T00:00:00.000Z' as unknown as Date };
      render(<TaskCard task={task} />);
      expect(screen.getByText('2026-06-01')).toBeInTheDocument();
    });
  });
});
