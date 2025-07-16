// src/components/Footer.js
import React from 'react';
import { Mail, Github } from 'lucide-react';

function Footer() {
  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="container py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          {/* Company Info */}
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <img 
              src="/GIGL_Logo_Small.png" 
              alt="GIGL Logo" 
              style={{ width: '24px', height: '24px', objectFit: 'contain' }}
            />
            <span className="font-semibold">GIGL Marketplace</span>
            <span className="text-gray-400">© 2025</span>
          </div>

          {/* Quick Links */}
          <div className="flex items-center space-x-6 text-sm">
            <button
              onClick={() => alert('Terms & Conditions coming soon')}
              className="text-gray-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            >
              Terms
            </button>
            <button
              onClick={() => alert('Privacy Policy coming soon')}
              className="text-gray-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            >
              Privacy
            </button>
            <a
              href="mailto:support@gigl.co.uk"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Support
            </a>
          </div>

          {/* Developer Info */}
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span>Built by Baxter Environmental</span>
            <a
              href="https://github.com/DBx-Environ/GIGL-Marketplace"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Github size={16} />
            </a>
            <a
              href="mailto:david@baxterenvironmental.co.uk"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Mail size={16} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;