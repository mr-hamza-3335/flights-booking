import { Plane } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-blue-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Plane className="w-4 h-4 text-sky-300" />
            </div>
            <div>
              <p className="font-bold text-white">SkyRequest</p>
              <p className="text-xs text-blue-300">Powered by real-time flight data</p>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-blue-300">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-blue-800 text-center text-xs text-blue-400">
          © 2026 SkyRequest. All rights reserved. This is a lead generation portal — no payments are processed here.
        </div>
      </div>
    </footer>
  );
}
