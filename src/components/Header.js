// src/components/Header.js
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { LogOut, User } from 'lucide-react';

function Header() {
  const { currentUser, userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <header className="header">
      <div className="header-content">
        {/* Logo */}
        <Link to="/" className="logo-container">
          <img 
            src="/GIGL_Logo_Small.png" 
            alt="GIGL Logo" 
            className="logo"
            style={{ width: '40px', height: '40px', objectFit: 'contain' }}
          />
          <div>
            <div className="logo-text">
              GIGL Marketplace
              <span className="logo-subtext">Bidding Platform</span>
            </div>
          </div>
        </Link>

        {/* Navigation */}
        {currentUser && (
          <div className="nav-container">
            <nav className="nav-links">
              <Link
                to="/dashboard"
                className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
              >
                Dashboard
              </Link>
              {userData?.isAdmin && (
                <Link
                  to="/admin"
                  className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
                >
                  Admin
                </Link>
              )}
            </nav>
            
            {/* User Menu */}
            <div className="user-menu">
              <div className="user-info">
                <div className="user-avatar">
                  {getInitials(userData?.firstName, userData?.lastName)}
                </div>
                <div className="user-details">
                  <span className="user-name">
                    {userData?.firstName} {userData?.lastName}
                  </span>
                  <span className="user-company">
                    {userData?.company}
                  </span>
                </div>
              </div>
              <button onClick={handleLogout} className="logout-btn">
                <LogOut size={14} />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;