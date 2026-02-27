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

  it('renders unassigned when no assignee', () => {
    const unassignedTask = { ...mockTask, assignee: null };
    render(<TaskCard task={unassignedTask} />);
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });
});
