// src/components/Footer.js - UPDATED WITH CORRECT COMPANY INFORMATION
import React from 'react';
import { Mail, ExternalLink } from 'lucide-react';

function Footer() {
  return (
    <footer style={{
      backgroundColor: '#1f2937',
      color: '#f9fafb',
      marginTop: 'auto',
      borderTop: '1px solid #374151'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '2rem 1.5rem 1.5rem'
      }}>
        {/* Main Footer Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem',
          alignItems: 'start',
          marginBottom: '2rem'
        }}>
          
          {/* GIGL Brand Section */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              <img 
                src="/GIGL_Logo_Small.png" 
                alt="GIGL Logo" 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  objectFit: 'contain',
                  filter: 'brightness(1.2)'
                }}
              />
              <div>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#f9fafb',
                  margin: '0',
                  lineHeight: '1.2'
                }}>
                  GIGL Marketplace
                </h3>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#9ca3af',
                  margin: '0',
                  fontWeight: '500'
                }}>
                  Biodiversity Net Gain Trading Platform
                </p>
              </div>
            </div>
            <p style={{
              fontSize: '0.875rem',
              color: '#d1d5db',
              lineHeight: '1.6',
              margin: '0'
            }}>
              Connecting conservation with commerce across Greater Lincolnshire. 
              Building a sustainable future for biodiversity.
            </p>
          </div>

          {/* Quick Links Section */}
          <div>
            <h4 style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: '#f9fafb',
              marginBottom: '1rem',
              margin: '0 0 1rem 0'
            }}>
              Platform
            </h4>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <button
                onClick={() => alert('Terms & Conditions coming soon')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#d1d5db',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  padding: '0',
                  textAlign: 'left',
                  transition: 'color 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => e.target.style.color = '#10b981'}
                onMouseLeave={(e) => e.target.style.color = '#d1d5db'}
              >
                Terms & Conditions
                <ExternalLink size={12} />
              </button>
              <button
                onClick={() => alert('Privacy Policy coming soon')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#d1d5db',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  padding: '0',
                  textAlign: 'left',
                  transition: 'color 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => e.target.style.color = '#10b981'}
                onMouseLeave={(e) => e.target.style.color = '#d1d5db'}
              >
                Privacy Policy
                <ExternalLink size={12} />
              </button>
              <a
                href="mailto:support@gigl.co.uk"
                style={{
                  color: '#d1d5db',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  transition: 'color 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => e.target.style.color = '#10b981'}
                onMouseLeave={(e) => e.target.style.color = '#d1d5db'}
              >
                <Mail size={14} />
                Support
              </a>
            </div>
          </div>

          {/* Development Section */}
          <div>
            <h4 style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: '#f9fafb',
              marginBottom: '1rem',
              margin: '0 0 1rem 0'
            }}>
              Development
            </h4>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#d1d5db',
                fontSize: '0.875rem'
              }}>
                <span>Built by</span>
                <a
                  href="https://www.baxterenvironmental.co.uk/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#f9fafb',
                    textDecoration: 'none',
                    fontWeight: '600',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#10b981'}
                  onMouseLeave={(e) => e.target.style.color = '#f9fafb'}
                >
                  David Baxter Environmental Ltd
                </a>
              </div>
              <a
                href="mailto:david@baxterenvironmental.co.uk"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#d1d5db',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  transition: 'color 0.2s ease',
                  padding: '0.25rem 0'
                }}
                onMouseEnter={(e) => e.target.style.color = '#10b981'}
                onMouseLeave={(e) => e.target.style.color = '#d1d5db'}
              >
                <Mail size={14} />
                Developer Contact
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          borderTop: '1px solid #374151',
          paddingTop: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: '#9ca3af'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span>© 2025 GIGL Ltd</span>
              <span style={{ color: '#6b7280' }}>•</span>
              <span>Company number 15872004</span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
              Registered office: Banovallum House, Manor House Street, Horncastle, Lincolnshire LN9 5HF
            </div>
          </div>
          
          <div style={{
            fontSize: '0.875rem',
            color: '#9ca3af',
            fontStyle: 'italic'
          }}>
            Powered by{' '}
            <a
              href="https://www.lincstrust.org.uk/what-we-do/conservation-projects/gigl"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#10b981',
                textDecoration: 'none',
                fontWeight: '500',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#059669'}
              onMouseLeave={(e) => e.target.style.color = '#10b981'}
            >
              Green Investment in Greater Lincolnshire Ltd
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;