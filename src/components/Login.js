// src/components/Login.js - ENHANCED VERSION WITH FORGOT PASSWORD
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase/config';

const schema = yup.object().shape({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required')
});

const resetSchema = yup.object().shape({
  email: yup.string().email('Invalid email').required('Email is required')
});

function Login() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { login } = useAuth();
  const location = useLocation();
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema)
  });

  const { register: registerReset, handleSubmit: handleResetSubmit, formState: { errors: resetErrors }, reset: resetForm } = useForm({
    resolver: yupResolver(resetSchema)
  });

  // Check for verification success message from navigation state
  useEffect(() => {
    if (location.state?.verified) {
      toast.success('🎉 Email verified successfully! You can now sign in.');
    }
    if (location.state?.message) {
      // Clear the state so it doesn't show again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      
      await login(data.email, data.password);
      
      toast.success('Login successful! Welcome to GIGL Marketplace!');
      
      // Clean navigation to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
      
    } catch (error) {
      console.error('❌ Login error:', error);
      setLoading(false);
      
      if (error.message.includes('verify your email')) {
        toast.error('Please verify your email address before logging in.');
        setTimeout(() => {
          toast.info('💡 Check your email inbox for the verification link!');
        }, 2000);
      } else {
        toast.error(error.message || 'Login failed. Please check your credentials.');
      }
    }
  };

  const onForgotPasswordSubmit = async (data) => {
    try {
      setResetLoading(true);
      
      await sendPasswordResetEmail(auth, data.email, {
        url: window.location.origin + '/login',
        handleCodeInApp: false
      });
      
      toast.success('Password reset email sent! Check your inbox.');
      setShowForgotPassword(false);
      resetForm();
      
    } catch (error) {
      console.error('Password reset error:', error);
      
      if (error.code === 'auth/user-not-found') {
        toast.error('No account found with this email address.');
      } else {
        toast.error('Failed to send password reset email. Please try again.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9f9f9',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
        padding: '40px'
      }}>
        
        {/* Success Message from Email Verification */}
        {location.state?.verified && (
          <div style={{
            backgroundColor: '#dcfce7',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎉</div>
            <p style={{
              fontSize: '14px',
              color: '#166534',
              margin: '0',
              fontWeight: '600'
            }}>
              {location.state.message || 'Email verified successfully! You can now sign in.'}
            </p>
          </div>
        )}
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            backgroundColor: '#4CAF50',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '24px'
          }}>
            🏠
          </div>
          
          <h1 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#333',
            margin: '0 0 8px'
          }}>
            {showForgotPassword ? 'Reset Password' : 'Welcome Back'}
          </h1>
          <p style={{
            color: '#666',
            fontSize: '16px',
            margin: 0
          }}>
            {showForgotPassword 
              ? 'Enter your email to receive a password reset link'
              : 'Sign in to your GIGL Marketplace account'
            }
          </p>
        </div>

        {/* Forgot Password Form */}
        {showForgotPassword ? (
          <form onSubmit={handleResetSubmit(onForgotPasswordSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Email Field */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#333',
                marginBottom: '8px'
              }}>
                Email Address
              </label>
              <input
                {...registerReset('email')}
                type="email"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: resetErrors.email ? '2px solid #ef4444' : '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.3s ease',
                  outline: 'none'
                }}
                placeholder="Enter your email address"
                onFocus={(e) => {
                  if (!resetErrors.email) e.target.style.borderColor = '#4CAF50';
                }}
                onBlur={(e) => {
                  if (!resetErrors.email) e.target.style.borderColor = '#e1e5e9';
                }}
              />
              {resetErrors.email && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px', marginLeft: '4px' }}>
                  {resetErrors.email.message}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="submit"
                disabled={resetLoading}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  backgroundColor: resetLoading ? '#a5d6a7' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: resetLoading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.3s ease'
                }}
              >
                {resetLoading ? 'Sending...' : 'Send Reset Email'}
              </button>
              
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  backgroundColor: 'transparent',
                  color: '#666',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f8f9fa';
                  e.target.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.borderColor = '#e1e5e9';
                }}
              >
                Back to Login
              </button>
            </div>
          </form>
        ) : (
          /* Login Form */
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Email Field */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#333',
                marginBottom: '8px'
              }}>
                Email Address
              </label>
              <input
                {...register('email')}
                type="email"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: errors.email ? '2px solid #ef4444' : '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.3s ease',
                  outline: 'none'
                }}
                placeholder="Enter your email"
                onFocus={(e) => {
                  if (!errors.email) e.target.style.borderColor = '#4CAF50';
                }}
                onBlur={(e) => {
                  if (!errors.email) e.target.style.borderColor = '#e1e5e9';
                }}
              />
              {errors.email && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px', marginLeft: '4px' }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#333'
                }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4CAF50',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#45a049'}
                  onMouseLeave={(e) => e.target.style.color = '#4CAF50'}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    paddingRight: '50px',
                    border: errors.password ? '2px solid #ef4444' : '2px solid #e1e5e9',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.3s ease',
                    outline: 'none'
                  }}
                  placeholder="Enter your password"
                  onFocus={(e) => {
                    if (!errors.password) e.target.style.borderColor = '#4CAF50';
                  }}
                  onBlur={(e) => {
                    if (!errors.password) e.target.style.borderColor = '#e1e5e9';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666',
                    fontSize: '16px',
                    padding: '4px'
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px', marginLeft: '4px' }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 24px',
                backgroundColor: loading ? '#a5d6a7' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '8px',
                transition: 'background-color 0.3s ease',
                boxShadow: loading ? 'none' : '0 2px 4px rgba(76, 175, 80, 0.3)'
              }}
              onMouseEnter={(e) => {
                if (!loading) e.target.style.backgroundColor = '#45a049';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.target.style.backgroundColor = '#4CAF50';
              }}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Register Link - Only show on login form */}
        {!showForgotPassword && (
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <span style={{ color: '#666', fontSize: '14px' }}>
              Don't have an account?{' '}
              <Link 
                to="/register" 
                style={{ 
                  color: '#4CAF50', 
                  textDecoration: 'none',
                  fontWeight: '600',
                  transition: 'color 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.color = '#45a049'}
                onMouseLeave={(e) => e.target.style.color = '#4CAF50'}
              >
                Create account
              </Link>
            </span>
          </div>
        )}

        {/* Help Section */}
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          padding: '16px',
          marginTop: '24px'
        }}>
          <p style={{
            fontSize: '13px',
            color: '#666',
            margin: '0 0 8px',
            fontWeight: '500'
          }}>
            💡 {showForgotPassword ? 'Password Reset Help' : 'New to GIGL Marketplace?'}
          </p>
          <p style={{
            fontSize: '12px',
            color: '#777',
            margin: 0,
            lineHeight: '1.4'
          }}>
            {showForgotPassword 
              ? 'You\'ll receive an email with a secure link to reset your password. The link will expire in 1 hour for security.'
              : 'After registering, you\'ll need to verify your email address before you can sign in. Check your inbox for a verification link.'
            }
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;