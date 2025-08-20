import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AuthForm from '../AuthForm';

describe('AuthForm', () => {
  it('renders login form', () => {
    render(<AuthForm onAuthSuccess={() => {}} />);
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByText(/login/i)).toBeInTheDocument();
  });

  it('shows error on empty submit', () => {
    render(<AuthForm onAuthSuccess={() => {}} />);
    fireEvent.click(screen.getByText(/login/i));
    expect(screen.getByText(/please enter email and password/i)).toBeInTheDocument();
  });

  // Add more tests for registration, API calls, etc.
});
