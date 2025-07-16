// src/components/Login.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase/config';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

const schema = yup.object().shape({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required')
});

function Login() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema)
  });

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      await login(data.email, data.password);
      
      // Force sync verification status after successful login
      const user = auth.currentUser;
      if (user && user.emailVerified) {
        try {
          const { doc, getDoc, updateDoc } = await import('firebase/firestore');
          const { db } = await import('../firebase/config');
          
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const currentData = userDocSnap.data();
            
            if (!currentData.emailVerified) {
              await updateDoc(userDocRef, {
                emailVerified: true,
                lastLoginAt: new Date().toISOString()
              });
              console.log('Email verification status synced to Firestore');
            }
          }
        } catch (syncError) {
          console.error('Error syncing verification status:', syncError);
        }
      }
      
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const email = prompt('Enter your email address:');
    if (email) {
      try {
        await resetPassword(email);
        toast.success('Password reset email sent! Check your inbox.');
      } catch (error) {
        toast.error(error.message);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-md">
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
              Welcome Back
            </h2>
          </div>
          <p className="text-secondary mt-2">
            Sign in to your GIGL Marketplace account
          </p>
        </div>
        
        {/* Login Form */}
        <div className="card">
          <div className="card-content">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="form-group">
                <label className="form-label">
                  <Mail size={16} className="inline mr-1" />
                  Email address
                </label>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <div className="form-error">{errors.email.message}</div>
                )}
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  <Lock size={16} className="inline mr-1" />
                  Password
                </label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={`form-input ${errors.password ? 'error' : ''}`}
                    placeholder="Enter your password"
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

              <div className="flex items-center justify-between mb-6">
                <Link to="/register" className="text-sm text-primary hover:text-primary-hover font-medium">
                  Don't have an account? Sign up
                </Link>
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="text-sm text-secondary hover:text-primary font-medium"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-secondary">
            Need help? Contact us at{' '}
            <a
              href="mailto:support@gigl.co.uk"
              className="text-primary hover:text-primary-hover"
            >
              support@gigl.co.uk
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;