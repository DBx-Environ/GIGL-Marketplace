// src/components/EmailVerificationSuccess.js - Simple success page
import React from 'react';
import { useNavigate } from 'react-router-dom';

function EmailVerificationSuccess() {
  const navigate = useNavigate();

  const handleLoginRedirect = () => {
    navigate('/login', { 
      state: { 
        message: 'Your email has been verified! Please sign in to continue.',
        verified: true 
      }
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
        padding: '40px',
        textAlign: 'center'
      }}>
        
        {/* Success Icon */}
        <div style={{
          width: '80px',
          height: '80px',
          backgroundColor: '#16a34a',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 30px',
          fontSize: '36px'
        }}>
          <span style={{ color: 'white' }}>✅</span>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#333',
          margin: '0 0 20px'
        }}>
          Email Verified Successfully!
        </h1>

        {/* Message */}
        <p style={{
          color: '#666',
          fontSize: '16px',
          lineHeight: '1.6',
          margin: '0 0 30px'
        }}>
          🎉 Your email address has been verified and your account is now active. 
          You can sign in to start exploring biodiversity net gain opportunities!
        </p>

        {/* Sign In Button */}
        <button
          onClick={handleLoginRedirect}
          style={{
            width: '100%',
            padding: '14px 24px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.3s',
            marginBottom: '20px'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#45a049'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#4CAF50'}
        >
          🚀 Sign In to GIGL Marketplace
        </button>
        
        {/* Welcome Info Box */}
        <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '8px',
          padding: '16px',
          fontSize: '14px',
          color: '#0c4a6e'
        }}>
          <strong>🎉 Welcome to GIGL Marketplace!</strong>
          <br />
          Your account is ready to use. Start exploring biodiversity net gain opportunities and submit bids to grow your environmental consultancy business.
        </div>

        {/* Help Section */}
        <div style={{
          marginTop: '40px',
          paddingTop: '20px',
          borderTop: '1px solid #e5e7eb',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          <p style={{ margin: 0 }}>
            Need help? Contact us at{' '}
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

export default EmailVerificationSuccess;