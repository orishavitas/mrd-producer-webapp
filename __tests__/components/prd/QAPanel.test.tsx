import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QAPanel } from '@/app/prd/components/QAPanel';

describe('QAPanel', () => {
  it('renders QA score', () => {
    render(<QAPanel score={85} suggestions={[]} />);
    expect(screen.getByText('85')).toBeTruthy();
  });

  it('shows suggestions when expanded', () => {
    const suggestions = [{ sectionKey: 'overview', note: 'Add more context' }];
    render(<QAPanel score={72} suggestions={suggestions} />);
    const button = screen.getByRole('button', { name: /show suggestions/i });
    fireEvent.click(button);
    expect(screen.getByText('Add more context')).toBeTruthy();
  });

  it('shows "No suggestions" when empty', () => {
    render(<QAPanel score={95} suggestions={[]} />);
    const button = screen.getByRole('button', { name: /show suggestions/i });
    fireEvent.click(button);
    expect(screen.getByText(/no suggestions/i)).toBeTruthy();
  });

  it('toggles visibility of suggestions', () => {
    const suggestions = [{ sectionKey: 'overview', note: 'Add more context' }];
    render(<QAPanel score={85} suggestions={suggestions} />);
    const button = screen.getByRole('button', { name: /show suggestions/i });

    fireEvent.click(button);
    expect(screen.getByText('Add more context')).toBeTruthy();

    fireEvent.click(button);
    expect(screen.queryByText('Add more context')).toBeNull();
  });
});
