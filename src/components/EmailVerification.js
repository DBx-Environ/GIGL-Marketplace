// src/components/EmailVerification.js - CLEANED UP VERSION

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../firebase/config';
import { toast } from 'react-toastify';

function EmailVerification() {
  const [loading, setLoading] = useState(false);

  const handleResendVerification = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        toast.success('Verification email sent! Check your inbox.');
      } else {
        toast.error('No user found. Please try registering again.');
      }
    } catch (error) {
      toast.error('Failed to send verification email. Please try again.');
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
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: '#4CAF50',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <span style={{ color: 'white', fontSize: '36px' }}>📧</span>
          </div>
          
          <h1 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#333',
            margin: '0 0 10px'
          }}>
            Check Your Email
          </h1>
          
          <p style={{
            color: '#666',
            fontSize: '16px',
            lineHeight: '1.5',
            margin: 0
          }}>
            We've sent a verification link to your email address. 
            Please click the link to verify your account.
          </p>
        </div>

        {/* Instructions */}
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '6px',
          padding: '20px',
          marginBottom: '30px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#333',
            margin: '0 0 15px'
          }}>
            Next Steps:
          </h3>
          
          <ol style={{
            color: '#666',
            fontSize: '14px',
            lineHeight: '1.6',
            margin: 0,
            paddingLeft: '20px'
          }}>
            <li style={{ marginBottom: '8px' }}>
              Check your email inbox (and spam/junk folder)
            </li>
            <li style={{ marginBottom: '8px' }}>
              Click the verification link in the email
            </li>
            <li style={{ marginBottom: '8px' }}>
              Return here and try signing in
            </li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <button
            onClick={handleResendVerification}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 24px',
              backgroundColor: loading ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s'
            }}
          >
            {loading ? 'Sending...' : 'Resend Verification Email'}
          </button>

          <Link
            to="/login"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '12px 24px',
              backgroundColor: 'transparent',
              color: '#4CAF50',
              border: '2px solid #4CAF50',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#4CAF50';
              e.target.style.color = 'white';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#4CAF50';
            }}
          >
            Back to Login
          </Link>
        </div>

        {/* Help Text */}
        <div style={{
          textAlign: 'center',
          marginTop: '30px',
          paddingTop: '20px',
          borderTop: '1px solid #eee'
        }}>
          <p style={{
            color: '#999',
            fontSize: '14px',
            margin: 0
          }}>
            Having trouble? Contact support at{' '}
            <a 
              href="mailto:david@baxterenvironmental.co.uk"
              style={{ color: '#4CAF50', textDecoration: 'none' }}
            >
              david@baxterenvironmental.co.uk
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default EmailVerification;