import { fireEvent, render, screen } from '@testing-library/react';
import { GenericTable } from '@/components/admin/GenericTable';

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('GenericTable edit workflow', () => {
  test('visible Edit action opens a populated edit dialog', async () => {
    render(
      <GenericTable
        title="Users"
        tableName="user"
        data={[
          {
            id: 'user-1',
            name: 'Learner One',
            email: 'learner@example.test',
            role: 'USER',
            isDeleted: false,
          },
        ]}
        columns={[
          { header: 'Name', accessorKey: 'name' },
          { header: 'Email', accessorKey: 'email' },
        ]}
      />
    );

    const actions = screen.getByRole('button', { name: 'Actions for Learner One' });
    fireEvent.keyDown(actions, { key: 'Enter' });
    fireEvent.click(await screen.findByText('Edit'));

    expect(await screen.findByRole('heading', { name: 'Edit User' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Learner One');
    expect(screen.getByLabelText('Email')).toHaveValue('learner@example.test');
    expect(screen.getByLabelText('Email')).toBeDisabled();
  });
});
