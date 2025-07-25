// src/components/admin/SettingsTab.js - Settings and Configuration
import React from 'react';
import { Settings, Info, Shield, Mail, Database, Globe } from 'lucide-react';

/**
 * SettingsTab component for platform settings and configuration
 * @returns {JSX.Element} SettingsTab component
 */
function SettingsTab() {
  
  return (
    <div className="settings-tab">
      {/* Settings Header */}
      <div className="settings-header">
        <div className="header-content">
          <div className="header-icon">
            <Settings size={32} />
          </div>
          <div className="header-text">
            <h2>Platform Settings</h2>
            <p>Configure and manage GIGL Marketplace settings</p>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="settings-sections">
        
        {/* System Information */}
        <div className="settings-section">
          <div className="section-header">
            <Info size={20} />
            <h3>System Information</h3>
          </div>
          <div className="section-content">
            <div className="info-grid">
              <div className="info-item">
                <label>Platform Name</label>
                <span>GIGL Marketplace</span>
              </div>
              <div className="info-item">
                <label>Version</label>
                <span>v3.0</span>
              </div>
              <div className="info-item">
                <label>Environment</label>
                <span>Production</span>
              </div>
              <div className="info-item">
                <label>Firebase Project</label>
                <span>gigl-marketplace-v3</span>
              </div>
              <div className="info-item">
                <label>Last Updated</label>
                <span>{new Date().toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="settings-section">
          <div className="section-header">
            <Shield size={20} />
            <h3>Security & Access</h3>
          </div>
          <div className="section-content">
            <div className="setting-item">
              <div className="setting-info">
                <h4>Email Verification</h4>
                <p>Users must verify their email before accessing the platform</p>
              </div>
              <div className="setting-control">
                <span className="status-enabled">Enabled</span>
              </div>
            </div>
            
            <div className="setting-item">
              <div className="setting-info">
                <h4>Admin Access Control</h4>
                <p>Restrict admin panel access to authorized users only</p>
              </div>
              <div className="setting-control">
                <span className="status-enabled">Enabled</span>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Auto-Logout</h4>
                <p>Automatically log out inactive users after 24 hours</p>
              </div>
              <div className="setting-control">
                <span className="status-enabled">Enabled</span>
              </div>
            </div>
          </div>
        </div>

        {/* Email Configuration */}
        <div className="settings-section">
          <div className="section-header">
            <Mail size={20} />
            <h3>Email Configuration</h3>
          </div>
          <div className="section-content">
            <div className="setting-item">
              <div className="setting-info">
                <h4>Bid Notifications</h4>
                <p>Send email notifications when bids are placed or updated</p>
              </div>
              <div className="setting-control">
                <span className="status-enabled">Enabled</span>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Opportunity Reminders</h4>
                <p>Send daily reminders about closing opportunities</p>
              </div>
              <div className="setting-control">
                <span className="status-enabled">Enabled</span>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Winner Notifications</h4>
                <p>Automatically notify winners and losers when opportunities close</p>
              </div>
              <div className="setting-control">
                <span className="status-enabled">Enabled</span>
              </div>
            </div>

            <div className="email-details">
              <h4>Email Addresses</h4>
              <div className="email-list">
                <div className="email-item">
                  <label>Support Email</label>
                  <span>support@gigl-marketplace.co.uk</span>
                </div>
                <div className="email-item">
                  <label>Admin Email</label>
                  <span>david@baxterenvironmental.co.uk</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="settings-section">
          <div className="section-header">
            <Database size={20} />
            <h3>Data Management</h3>
          </div>
          <div className="section-content">
            <div className="setting-item">
              <div className="setting-info">
                <h4>Auto-Close Opportunities</h4>
                <p>Automatically close opportunities every 4 hours after their closing date</p>
              </div>
              <div className="setting-control">
                <span className="status-enabled">Enabled</span>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Data Retention</h4>
                <p>Retain user and bidding data indefinitely for analytics</p>
              </div>
              <div className="setting-control">
                <span className="status-enabled">Enabled</span>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Real-time Updates</h4>
                <p>Enable real-time synchronization across all connected clients</p>
              </div>
              <div className="setting-control">
                <span className="status-enabled">Enabled</span>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Configuration */}
        <div className="settings-section">
          <div className="section-header">
            <Globe size={20} />
            <h3>Platform Configuration</h3>
          </div>
          <div className="section-content">
            <div className="config-grid">
              <div className="config-item">
                <label>Supported Regions</label>
                <div className="config-value">
                  <span>Greater Lincolnshire</span>
                  <span className="config-detail">Primary service area</span>
                </div>
              </div>

              <div className="config-item">
                <label>Habitat Categories</label>
                <div className="config-value">
                  <span>12 Broad Categories</span>
                  <span className="config-detail">71 specific habitat types</span>
                </div>
              </div>

              <div className="config-item">
                <label>LPA Coverage</label>
                <div className="config-value">
                  <span>10 Local Planning Authorities</span>
                  <span className="config-detail">Including outside Greater Lincs</span>
                </div>
              </div>

              <div className="config-item">
                <label>NCA Coverage</label>
                <div className="config-value">
                  <span>10 Natural Character Areas</span>
                  <span className="config-detail">Complete regional coverage</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Future Enhancements */}
        <div className="settings-section">
          <div className="section-header">
            <Settings size={20} />
            <h3>Future Enhancements</h3>
          </div>
          <div className="section-content">
            <div className="enhancement-list">
              <div className="enhancement-item planned">
                <h4>Advanced Reporting</h4>
                <p>Export detailed analytics and bidding reports to PDF/Excel</p>
                <span className="enhancement-status">Planned</span>
              </div>

              <div className="enhancement-item planned">
                <h4>Bulk Operations</h4>
                <p>Bulk create opportunities and manage multiple bids simultaneously</p>
                <span className="enhancement-status">Planned</span>
              </div>

              <div className="enhancement-item planned">
                <h4>Custom Email Templates</h4>
                <p>Customize email notification templates and branding</p>
                <span className="enhancement-status">Planned</span>
              </div>

              <div className="enhancement-item planned">
                <h4>API Integration</h4>
                <p>Public API for third-party integrations and data exchange</p>
                <span className="enhancement-status">Under Consideration</span>
              </div>

              <div className="enhancement-item planned">
                <h4>Mobile App</h4>
                <p>Native mobile applications for iOS and Android</p>
                <span className="enhancement-status">Future Release</span>
              </div>
            </div>
          </div>
        </div>

        {/* Support & Documentation */}
        <div className="settings-section">
          <div className="section-header">
            <Info size={20} />
            <h3>Support & Documentation</h3>
          </div>
          <div className="section-content">
            <div className="support-grid">
              <div className="support-item">
                <h4>Technical Support</h4>
                <p>For technical issues and platform support</p>
                <a href="mailto:david@baxterenvironmental.co.uk" className="support-link">
                  david@baxterenvironmental.co.uk
                </a>
              </div>

              <div className="support-item">
                <h4>User Support</h4>
                <p>For user account and bidding assistance</p>
                <a href="mailto:support@gigl-marketplace.co.uk" className="support-link">
                  support@gigl-marketplace.co.uk
                </a>
              </div>

              <div className="support-item">
                <h4>Development Repository</h4>
                <p>Platform source code and development updates</p>
                <span className="support-info">Private Repository</span>
              </div>

              <div className="support-item">
                <h4>Documentation</h4>
                <p>User guides and administrative documentation</p>
                <span className="support-info">Available on request</span>
              </div>
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="settings-section">
          <div className="section-header">
            <Globe size={20} />
            <h3>Company Information</h3>
          </div>
          <div className="section-content">
            <div className="company-info">
              <div className="company-item">
                <h4>GIGL Ltd</h4>
                <div className="company-details">
                  <p>Company Number: 15872004</p>
                  <p>Registered Office: Banovallum House, Manor House Street, Horncastle, Lincolnshire LN9 5HF</p>
                </div>
              </div>

              <div className="company-item">
                <h4>Powered by</h4>
                <div className="company-details">
                  <p>Green Investment in Greater Lincolnshire Ltd</p>
                  <a 
                    href="https://www.lincstrust.org.uk/what-we-do/conservation-projects/gigl" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="company-link"
                  >
                    Visit GIGL Project Page
                  </a>
                </div>
              </div>

              <div className="company-item">
                <h4>Built by</h4>
                <div className="company-details">
                  <p>David Baxter Environmental Ltd</p>
                  <a 
                    href="https://www.baxterenvironmental.co.uk/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="company-link"
                  >
                    Visit Developer Website
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsTab;