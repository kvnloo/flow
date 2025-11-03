import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Example integration test
 *
 * This demonstrates testing React components with integration testing.
 * Replace this with actual integration tests for your components.
 */

// Simple test component
function TestComponent({ message }: { message: string }) {
  return (
    <div>
      <h1>Test Component</h1>
      <p>{message}</p>
    </div>
  );
}

describe('Example Integration Test Suite', () => {
  it('should render a React component', () => {
    render(<TestComponent message="Hello, World!" />);

    expect(screen.getByRole('heading')).toHaveTextContent('Test Component');
    expect(screen.getByText('Hello, World!')).toBeInTheDocument();
  });

  it('should handle component props', () => {
    const customMessage = 'Custom test message';
    render(<TestComponent message={customMessage} />);

    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it('should render multiple elements', () => {
    render(<TestComponent message="Test" />);

    const heading = screen.getByRole('heading');
    const paragraph = screen.getByText('Test');

    expect(heading).toBeInTheDocument();
    expect(paragraph).toBeInTheDocument();
  });
});
