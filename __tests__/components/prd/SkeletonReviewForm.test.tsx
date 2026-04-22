import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkeletonReviewForm } from '@/app/prd/components/SkeletonReviewForm';
import { PRDSkeletonSection } from '@/agent/agents/prd/types';

const mockSkeleton: PRDSkeletonSection[] = [
  { sectionKey: 'overview', sectionTitle: '1. Overview', strategy: 'Summarise', writingDirective: 'Write 2 paragraphs' },
  { sectionKey: 'goals', sectionTitle: '2. Goals', strategy: 'List goals', writingDirective: 'Write 5 goals' },
];

describe('SkeletonReviewForm', () => {
  it('renders all skeleton sections', () => {
    render(<SkeletonReviewForm skeleton={mockSkeleton} onApprove={jest.fn()} />);
    expect(screen.getByText('1. Overview')).toBeTruthy();
    expect(screen.getByText('2. Goals')).toBeTruthy();
  });

  it('shows strategy values in textareas', () => {
    render(<SkeletonReviewForm skeleton={mockSkeleton} onApprove={jest.fn()} />);
    const textareas = screen.getAllByRole('textbox') as HTMLTextAreaElement[];
    expect(textareas[0].value).toBe('Summarise');
  });

  it('calls onApprove with updated skeleton on submit', () => {
    const onApprove = jest.fn();
    render(<SkeletonReviewForm skeleton={mockSkeleton} onApprove={onApprove} />);
    fireEvent.click(screen.getByText('Approve & Generate PRD'));
    expect(onApprove).toHaveBeenCalledWith(mockSkeleton);
  });

  it('passes edited strategy when user changes textarea', () => {
    const onApprove = jest.fn();
    render(<SkeletonReviewForm skeleton={mockSkeleton} onApprove={onApprove} />);
    const textareas = screen.getAllByRole('textbox');
    fireEvent.change(textareas[0], { target: { value: 'New strategy' } });
    fireEvent.click(screen.getByText('Approve & Generate PRD'));
    expect(onApprove).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ sectionKey: 'overview', strategy: 'New strategy' })])
    );
  });
});
