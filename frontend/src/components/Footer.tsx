import React from 'react';
import { ShieldCheck, Headphones, Zap, Users } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-16 bg-white border-t border-slate-200">
      {/* 4 Feature Badges Section from reference design */}
      <div className="max-w-[1600px] mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Feature 1 */}
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Secure & Reliable</h4>
              <p className="text-xs text-slate-500 mt-0.5">Your data is safe with us</p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">24/7 Support</h4>
              <p className="text-xs text-slate-500 mt-0.5">We're here to help you</p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Fast & Easy</h4>
              <p className="text-xs text-slate-500 mt-0.5">Complete in few simple steps</p>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Trusted by Thousands</h4>
              <p className="text-xs text-slate-500 mt-0.5">Join our growing community</p>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright & Legal Links Bar */}
      <div className="border-t border-slate-100 py-6">
        <div className="max-w-[1600px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 space-y-4 sm:space-y-0">
          <p>© 2025 DealFlow360. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <a href="#terms" className="hover:text-slate-800 transition">Terms of Service</a>
            <a href="#privacy" className="hover:text-slate-800 transition">Privacy Policy</a>
            <a href="#help" className="hover:text-slate-800 transition">Help Center</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
