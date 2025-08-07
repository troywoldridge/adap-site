"use client";

import Link from "next/link";
import Image from "next/image";
import {
  FaFacebookF,
  FaInstagram,
  FaYoutube,
  FaLinkedinIn,
} from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        {/* 1) Logo */}
        <div className="footer-logo">
          {/* swap this out for your real logo image or Cloudflare URL */}
          <Image
            src="/adap_logo_1.webp"
            alt="SinaLite logo"
            width={140}
            height={40}
            priority
          />
        </div>

        {/* 2) Business Hours + Social */}
        <div className="footer-hours">
          <h3>Business Hours</h3>
          <p>Monday to Friday</p>
          <p>Customer Service: 8 AM – 5 PM EST</p>
          <p>Local Pickup: 8 AM – 4 PM EST</p>
          <p className="phone">
            📞 <Link href="tel:1-866-899-2499">1-866-899-2499</Link>
          </p>

          <div className="social">
            <p>Follow us on social media</p>
            <div className="social-icons">
            <a href="https://facebook.com/yourpage" aria-label="Facebook">
              <FaFacebookF />
            </a>
            <a href="https://instagram.com/yourpage" aria-label="Instagram">
              <FaInstagram />
            </a>
            <a href="https://youtube.com/yourchannel" aria-label="YouTube">
              <FaYoutube />
            </a>
            <a href="https://linkedin.com/yourcompany" aria-label="LinkedIn">
              <FaLinkedinIn />
            </a>
          </div>
          </div>
        </div>

        {/* 3) SinaLite column */}
        <div className="footer-links footer-divider">
          <h3>ADAP</h3>
          <ul>
            <li><Link href="/about">About American Design And Printing</Link></li>
            <li><Link href="/reviews">Reviews</Link></li>
            <li><Link href="/careers">Careers</Link></li>
            <li><Link href="/terms">Terms of Service</Link></li>
            <li><Link href="/privacy">Privacy Policy</Link></li>
            <li><Link href="/sitemap">Sitemap</Link></li>
            <li><Link href="/contact">Contact Us</Link></li>
          </ul>
        </div>

        {/* 4) Our Services */}
        <div className="footer-links">
          <h3>Our Services</h3>
          <ul>
            <li><Link href="/guarantees">Our Guarantees</Link></li>
            <li><Link href="/shipping">Shipping Options</Link></li>
            <li><Link href="/turnaround">Turnaround Options</Link></li>
            <li><Link href="/quotes">Custom Quotes</Link></li>
            <li><Link href="/custom-order">Submit Custom Order</Link></li>
          </ul>
        </div>

        {/* 5) Resources */}
        <div className="footer-links">
          <h3>Resources</h3>
          <ul>
            <li><Link href="/support">Support Center</Link></li>
            <li><Link href="/artwork-guides">Artwork Setup Guides</Link></li>
            <li><Link href="/business-tools">Business Tools</Link></li>
            <li><Link href="/accessibility">Accessibility</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
