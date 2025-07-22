// src/components/Register.js - FIXED VERSION
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

const schema = yup.object().shape({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number, and special character'
    )
    .required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Confirm password is required'),
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  company: yup.string().required('Company name is required')
});

function Register() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register: registerUser } = useAuth(); // FIXED: Changed from signup to register
  const navigate = useNavigate();
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema)
  });

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      
      // FIXED: Using registerUser instead of signup
      await registerUser(data.email, data.password, data.firstName, data.lastName);
      
      toast.success('Registration successful! Please check your email to verify your account.');
      navigate('/verify-email');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
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
        maxWidth: '500px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        padding: '40px'
      }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#333',
            margin: '0 0 10px'
          }}>
            Create Account
          </h1>
          <p style={{
            color: '#666',
            fontSize: '16px',
            margin: 0
          }}>
            Join GIGL Marketplace to start bidding on biodiversity projects
          </p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Name Fields */}
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#333',
                marginBottom: '5px'
              }}>
                First Name
              </label>
              <input
                {...register('firstName')}
                type="text"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: errors.firstName ? '2px solid #ef4444' : '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
                placeholder="John"
              />
              {errors.firstName && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '5px' }}>
                  {errors.firstName.message}
                </p>
              )}
            </div>
            
            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#333',
                marginBottom: '5px'
              }}>
                Last Name
              </label>
              <input
                {...register('lastName')}
                type="text"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: errors.lastName ? '2px solid #ef4444' : '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
                placeholder="Smith"
              />
              {errors.lastName && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '5px' }}>
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          {/* Company Field */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#333',
              marginBottom: '5px'
            }}>
              Company Name
            </label>
            <input
              {...register('company')}
              type="text"
              style={{
                width: '100%',
                padding: '12px',
                border: errors.company ? '2px solid #ef4444' : '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              placeholder="Acme Environmental Ltd"
            />
            {errors.company && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '5px' }}>
                {errors.company.message}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#333',
              marginBottom: '5px'
            }}>
              Email Address
            </label>
            <input
              {...register('email')}
              type="email"
              style={{
                width: '100%',
                padding: '12px',
                border: errors.email ? '2px solid #ef4444' : '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              placeholder="john@example.com"
            />
            {errors.email && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '5px' }}>
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#333',
              marginBottom: '5px'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                style={{
                  width: '100%',
                  padding: '12px',
                  paddingRight: '40px',
                  border: errors.password ? '2px solid #ef4444' : '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
                placeholder="Create a strong password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#666',
                  fontSize: '14px'
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '5px' }}>
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#333',
              marginBottom: '5px'
            }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                {...register('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                style={{
                  width: '100%',
                  padding: '12px',
                  paddingRight: '40px',
                  border: errors.confirmPassword ? '2px solid #ef4444' : '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
                placeholder="Confirm your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#666',
                  fontSize: '14px'
                }}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.confirmPassword && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '5px' }}>
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 24px',
              backgroundColor: loading ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '10px'
            }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          {/* Login Link */}
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <span style={{ color: '#666', fontSize: '14px' }}>
              Already have an account?{' '}
              <Link 
                to="/login" 
                style={{ 
                  color: '#4CAF50', 
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
              >
                Sign in
              </Link>
            </span>
          </div>
        </form>

        {/* Terms */}
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <p style={{
            fontSize: '12px',
            color: '#999',
            lineHeight: '1.5',
            margin: 0
          }}>
            By creating an account, you agree to our{' '}
            <button
              onClick={() => alert('Terms of Service coming soon')}
              style={{
                color: '#4CAF50',
                background: 'none',
                border: 'none',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Terms of Service
            </button>
            {' '}and{' '}
            <button
              onClick={() => alert('Privacy Policy coming soon')}
              style={{
                color: '#4CAF50',
                background: 'none',
                border: 'none',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Privacy Policy
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;