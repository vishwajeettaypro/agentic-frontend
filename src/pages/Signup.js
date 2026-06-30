import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  CAlert,
  CButton,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CInputGroup,
  CInputGroupText,
  CSpinner,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilEnvelopeClosed,
  cilLockLocked,
  cilUser,
  cilPeople,
} from '@coreui/icons';
import AuthLayout from '../components/AuthLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { useApp } from '../context/AppContext';
import { signUp } from '../services/authService';

const ROLE_OPTIONS = [
  { value: '', label: 'Select a role' },
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
  { value: 'agent', label: 'Agent' },
];

const Signup = () => {
  const navigate = useNavigate();
  const { user, initializing } = useApp();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { username, email, password, confirmPassword, role } = form;

    if (!username.trim() || !email.trim() || !password || !role) {
      setError('All fields are required.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await signUp({
        username: username.trim(),
        email: email.trim(),
        password,
        role,
      });
      toast.success(response.message || 'Account created successfully');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="d-flex align-items-center justify-content-center auth-page">
        <LoadingSpinner />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <Toaster position="top-right" />
      <AuthLayout
        title="Create an account"
        subtitle="Get started with Agentic AI in minutes"
        footer={
          <span>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in
            </Link>
          </span>
        }
      >
        {error && (
          <CAlert color="danger" className="mb-3">
            {error}
          </CAlert>
        )}

        <CForm onSubmit={handleSubmit}>
          <div className="mb-3">
            <CFormLabel htmlFor="username">Username</CFormLabel>
            <CInputGroup>
              <CInputGroupText>
                <CIcon icon={cilUser} />
              </CInputGroupText>
              <CFormInput
                id="username"
                name="username"
                type="text"
                placeholder="johndoe"
                autoComplete="username"
                value={form.username}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </CInputGroup>
          </div>

          <div className="mb-3">
            <CFormLabel htmlFor="email">Email address</CFormLabel>
            <CInputGroup>
              <CInputGroupText>
                <CIcon icon={cilEnvelopeClosed} />
              </CInputGroupText>
              <CFormInput
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </CInputGroup>
          </div>

          <div className="mb-3">
            <CFormLabel htmlFor="role">Role</CFormLabel>
            <CInputGroup>
              <CInputGroupText>
                <CIcon icon={cilPeople} />
              </CInputGroupText>
              <CFormSelect
                id="role"
                name="role"
                value={form.role}
                onChange={handleChange}
                disabled={loading}
                required
              >
                {ROLE_OPTIONS.map(({ value, label }) => (
                  <option key={value || 'placeholder'} value={value}>
                    {label}
                  </option>
                ))}
              </CFormSelect>
            </CInputGroup>
          </div>

          <div className="mb-3">
            <CFormLabel htmlFor="password">Password</CFormLabel>
            <CInputGroup>
              <CInputGroupText>
                <CIcon icon={cilLockLocked} />
              </CInputGroupText>
              <CFormInput
                id="password"
                name="password"
                type="password"
                placeholder="Create a password"
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </CInputGroup>
          </div>

          <div className="mb-4">
            <CFormLabel htmlFor="confirmPassword">Confirm password</CFormLabel>
            <CInputGroup>
              <CInputGroupText>
                <CIcon icon={cilLockLocked} />
              </CInputGroupText>
              <CFormInput
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </CInputGroup>
          </div>

          <CButton
            type="submit"
            color="primary"
            className="w-100 auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </CButton>
        </CForm>
      </AuthLayout>
    </>
  );
};

export default Signup;
