// src/components/Footer.js
import React from 'react';
import { Mail, ExternalLink, Github } from 'lucide-react';

function Footer() {
  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <img 
                src="/GIGL_Logo_Small.png" 
                alt="GIGL Logo" 
                style={{ width: '32px', height: '32px', objectFit: 'contain' }}
              />
              <span className="text-xl font-bold">GIGL Marketplace</span>
            </div>
            <p className="text-gray-400 text-sm">
              Green Investment in Greater Lincolnshire - Connecting environmental opportunities 
              with sustainable investment solutions.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <div className="space-y-2">
              <button
                onClick={() => alert('Terms & Conditions coming soon')}
                className="block text-gray-400 hover:text-white text-sm transition-colors bg-transparent border-none cursor-pointer text-left"
              >
                Terms & Conditions
              </button>
              <button
                onClick={() => alert('Privacy Policy coming soon')}
                className="block text-gray-400 hover:text-white text-sm transition-colors bg-transparent border-none cursor-pointer text-left"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => alert('About GIGL coming soon')}
                className="block text-gray-400 hover:text-white text-sm transition-colors bg-transparent border-none cursor-pointer text-left"
              >
                About GIGL
              </button>
              <a
                href="mailto:support@gigl.co.uk"
                className="flex items-center space-x-1 text-gray-400 hover:text-white text-sm transition-colors"
              >
                <Mail size={14} />
                <span>Contact Support</span>
              </a>
            </div>
          </div>

          {/* Developer Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Development</h3>
            <div className="space-y-2 text-sm text-gray-400">
              <p>Developed by Baxter Environmental</p>
              <p>david@baxterenvironmental.co.uk</p>
              <div className="flex items-center space-x-4 mt-4">
                <a
                  href="https://github.com/yourusername/gigl-marketplace"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
                >
                  <Github size={16} />
                  <span>GitHub</span>
                </a>
                <a
                  href="https://baxterenvironmental.co.uk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
                >
                  <ExternalLink size={14} />
                  <span>Website</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 GIGL Marketplace. All rights reserved.
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <a
                href="mailto:support@gigl.co.uk"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Mail size={20} />
              </a>
              <a
                href="https://github.com/yourusername/gigl-marketplace"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Github size={20} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;