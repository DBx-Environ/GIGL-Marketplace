// src/components/EmailVerification.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../firebase/config';
import { toast } from 'react-toastify';
import { Mail, CheckCircle } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-4 rounded-full">
              <Mail size={48} className="text-blue-600" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
            Verify Your Email
          </h2>
          <p className="text-gray-600">
            We've sent a verification email to your address. Please check your inbox and click the verification link to complete your registration.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-gray-900">Next Steps:</h3>
              <ol className="mt-2 text-sm text-gray-600 space-y-1">
                <li>1. Check your email inbox (and spam folder)</li>
                <li>2. Click the verification link in the email</li>
                <li>3. Return to this page and try signing in</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="flex flex-col space-y-4">
          <button
            onClick={handleResendVerification}
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Resend Verification Email'}
          </button>
          
          <div className="text-center">
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-500 text-sm font-medium"
            >
              Already verified? Sign in here
            </Link>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Having trouble? Contact us at{' '}
            <a
              href="mailto:david@baxterenvironmental.co.uk"
              className="text-blue-600 hover:text-blue-500"
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