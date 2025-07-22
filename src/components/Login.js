// src/components/Login.js - CLEAN VERSION

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase/config';

const schema = yup.object().shape({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required')
});

function Login() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const { login } = useAuth();
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema)
  });

  // Automatic refresh function (only shows when needed)
  const handleQuickRefresh = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          toast.success('✅ Email verification detected! Try logging in again.');
          setNeedsRefresh(false);
        } else {
          toast.warning('⚠️ Email still not verified. Please check your email and click the verification link.');
        }
      }
    } catch (error) {
      toast.error('Failed to refresh. Please try again.');
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setNeedsRefresh(false);
      
      await login(data.email, data.password);
      
      toast.success('Login successful! Redirecting...');
      
      // Clean navigation to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
      
    } catch (error) {
      console.error('❌ Login error:', error);
      setLoading(false);
      
      if (error.message.includes('verify your email')) {
        toast.error('Please verify your email address before logging in.');
        setNeedsRefresh(true); // Show refresh option only when needed
        setTimeout(() => {
          toast.info('💡 Just verified your email? Click "Check Verification" below!');
        }, 2000);
      } else {
        toast.error(error.message || 'Login failed. Please check your credentials.');
      }
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
            Welcome Back
          </h1>
          <p style={{
            color: '#666',
            fontSize: '16px',
            margin: 0
          }}>
            Sign in to your GIGL Marketplace account
          </p>
        </div>

        {/* Login Form */}
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
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '8px'
            }}>
              Password
            </label>
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

        {/* Check Verification Button (only shows when needed) */}
        {needsRefresh && (
          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '8px',
            padding: '16px',
            marginTop: '20px',
            textAlign: 'center'
          }}>
            <p style={{
              fontSize: '14px',
              color: '#856404',
              margin: '0 0 12px',
              fontWeight: '500'
            }}>
              📧 Just verified your email?
            </p>
            <button
              type="button"
              onClick={handleQuickRefresh}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f57f17'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#ff9800'}
            >
              ✅ Check Verification
            </button>
          </div>
        )}

        {/* Register Link */}
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
            💡 New to GIGL Marketplace?
          </p>
          <p style={{
            fontSize: '12px',
            color: '#777',
            margin: 0,
            lineHeight: '1.4'
          }}>
            After registering, you'll need to verify your email address before you can sign in. 
            Check your inbox for a verification link.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;