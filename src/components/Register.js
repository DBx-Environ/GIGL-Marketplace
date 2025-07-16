// src/components/Register.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Lock, Building, Eye, EyeOff } from 'lucide-react';

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
  const { signup } = useAuth();
  const navigate = useNavigate();
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema)
  });

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      await signup(data.email, data.password, {
        firstName: data.firstName,
        lastName: data.lastName,
        company: data.company
      });
      toast.success('Registration successful! Please check your email to verify your account.');
      navigate('/verify-email');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-2xl">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
            <img 
              src="/GIGL_Logo.png" 
              alt="GIGL Logo" 
              style={{ 
                height: '360px', 
                objectFit: 'contain',
                display: 'block',
                margin: '0',
                padding: '0'
              }}
            />
            <h2 className="text-3xl font-bold text-primary" style={{ margin: '0', padding: '0' }}>
              Create Your Account
            </h2>
          </div>
          <p className="text-secondary mt-2">
            Join the GIGL Marketplace bidding platform
          </p>
        </div>
        
        {/* Registration Form */}
        <div className="card">
          <div className="card-content">
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Personal Information */}
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">
                    <User size={16} className="inline mr-1" />
                    First Name
                  </label>
                  <input
                    {...register('firstName')}
                    type="text"
                    className={`form-input ${errors.firstName ? 'error' : ''}`}
                    placeholder="Enter your first name"
                  />
                  {errors.firstName && (
                    <div className="form-error">{errors.firstName.message}</div>
                  )}
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    <User size={16} className="inline mr-1" />
                    Last Name
                  </label>
                  <input
                    {...register('lastName')}
                    type="text"
                    className={`form-input ${errors.lastName ? 'error' : ''}`}
                    placeholder="Enter your last name"
                  />
                  {errors.lastName && (
                    <div className="form-error">{errors.lastName.message}</div>
                  )}
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  <Building size={16} className="inline mr-1" />
                  Company
                </label>
                <input
                  {...register('company')}
                  type="text"
                  className={`form-input ${errors.company ? 'error' : ''}`}
                  placeholder="Enter your company name"
                />
                {errors.company && (
                  <div className="form-error">{errors.company.message}</div>
                )}
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  <Mail size={16} className="inline mr-1" />
                  Email
                </label>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="Enter your email address"
                />
                {errors.email && (
                  <div className="form-error">{errors.email.message}</div>
                )}
              </div>
              
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">
                    <Lock size={16} className="inline mr-1" />
                    Password
                  </label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className={`form-input ${errors.password ? 'error' : ''}`}
                      placeholder="Create a password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary hover:text-primary"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <div className="form-error">{errors.password.message}</div>
                  )}
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    <Lock size={16} className="inline mr-1" />
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      {...register('confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary hover:text-primary"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <div className="form-error">{errors.confirmPassword.message}</div>
                  )}
                </div>
              </div>

              {/* Password Requirements */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-medium text-blue-900 mb-2">Password Requirements:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• At least 8 characters long</li>
                  <li>• Contains uppercase and lowercase letters</li>
                  <li>• Contains at least one number</li>
                  <li>• Contains at least one special character (@$!%*?&)</li>
                </ul>
              </div>

              <div className="flex items-center justify-between mb-6">
                <Link to="/login" className="text-sm text-primary hover:text-primary-hover font-medium">
                  Already have an account? Sign in
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-secondary">
            By creating an account, you agree to our{' '}
            <button
              onClick={() => alert('Terms of Service coming soon')}
              className="text-primary hover:text-primary-hover bg-transparent border-none cursor-pointer underline"
            >
              Terms of Service
            </button>
            {' '}and{' '}
            <button
              onClick={() => alert('Privacy Policy coming soon')}
              className="text-primary hover:text-primary-hover bg-transparent border-none cursor-pointer underline"
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