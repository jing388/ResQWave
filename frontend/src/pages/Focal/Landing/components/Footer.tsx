import { Facebook, Mail, Twitter } from "lucide-react";
import mapbox_logo from '/mapbox.png';
import resqwave_logo from '/resqwave_logo.png';

export function LandingFooter() {
  return (
    <footer className="w-full bg-[#171717] text-white py-12 px-8 md:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Left Section - Logo and Info */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <img src={resqwave_logo} alt="ResQWave Logo" className="h-auto w-8" />
              <span className="font-semibold text-lg">ResQWave</span>
            </div>
            <p className="text-gray-400 text-sm">Stronger Signals, Safer Communities</p>
            <p className="text-gray-500 text-xs mt-2">All Rights Reserved ©ResQWave2026</p>
          </div>

          {/* Middle Section - Project Info and Powered By */}
          <div className="flex flex-col gap-6 md:items-end md:text-right">
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">A PROJECT OF</h3>
              {/* Add project info here if needed */}
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">POWERED BY</p>
              <a 
                href="https://www.mapbox.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity cursor-pointer"
              >
                <img src={mapbox_logo} alt="Mapbox" className="h-6 w-auto" />
              </a>
            </div>
          </div>

          {/* Right Section - Contact */}
          <div className="flex flex-col gap-4 md:items-end md:text-right">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">CONTACT US</h3>
            <div className="flex items-center gap-4">
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-blue-400 transition-colors cursor-pointer"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-blue-400 transition-colors cursor-pointer"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a 
                href="mailto:contact@resqwave.com" 
                className="hover:text-blue-400 transition-colors cursor-pointer"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
