import { Link } from "wouter";
import { Facebook, Twitter, Linkedin, Instagram, Youtube } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#111111] text-white pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h3 className="font-semibold mb-4 text-gray-200">For Clients</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link href="/freelancers" className="hover:text-white transition-colors">How to Hire</Link></li>
              <li><Link href="/freelancers" className="hover:text-white transition-colors">Talent Marketplace</Link></li>
              <li><Link href="/enterprise" className="hover:text-white transition-colors">Enterprise</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/payroll" className="hover:text-white transition-colors">Payroll Services</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4 text-gray-200">For Talent</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link href="/jobs" className="hover:text-white transition-colors">How to Find Work</Link></li>
              <li><Link href="/jobs" className="hover:text-white transition-colors">Find Freelance Jobs</Link></li>
              <li><Link href="/agencies" className="hover:text-white transition-colors">Find Agency Jobs</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4 text-gray-200">Resources</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link href="/help" className="hover:text-white transition-colors">Help & Support</Link></li>
              <li><Link href="/trust" className="hover:text-white transition-colors">Trust & Safety</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/community" className="hover:text-white transition-colors">Community</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4 text-gray-200">Company</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/leadership" className="hover:text-white transition-colors">Leadership</Link></li>
              <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-gray-400">
            <span className="font-semibold text-white">TrustFirst+</span>
            <span className="text-sm">© 2026 TrustFirst Inc.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/accessibility" className="hover:text-white transition-colors">Accessibility</Link>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="text-gray-400 hover:text-white transition-colors"><Facebook className="h-5 w-5" /></a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors"><Linkedin className="h-5 w-5" /></a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors"><Twitter className="h-5 w-5" /></a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors"><Youtube className="h-5 w-5" /></a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors"><Instagram className="h-5 w-5" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
