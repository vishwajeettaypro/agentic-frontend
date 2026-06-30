import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  CAlert,
  CButton,
  CForm,
  CFormInput,
  CFormLabel,
  CInputGroup,
  CInputGroupText,
  CSpinner,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilEnvelopeClosed, cilLockLocked } from '@coreui/icons';
import AuthLayout from '../components/AuthLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { useApp } from '../context/AppContext';
import { signIn } from '../services/authService';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser, initializing } = useApp();

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.email.trim() || !form.password) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await signIn(form.email.trim(), form.password);
      setUser(response.data);
      toast.success(response.message || 'Signed in successfully');
      const redirectTo = location.state?.from?.pathname || '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please try again.');
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
        title="Welcome back"
        subtitle="Sign in to your account to continue"
        footer={
          <span>
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="auth-link">
              Create one
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

          <div className="mb-4">
            <CFormLabel htmlFor="password">Password</CFormLabel>
            <CInputGroup>
              <CInputGroupText>
                <CIcon icon={cilLockLocked} />
              </CInputGroupText>
              <CFormInput
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={form.password}
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
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </CButton>
        </CForm>
      </AuthLayout>
    </>
  );
};

export default Login;
