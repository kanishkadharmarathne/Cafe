import { NavLink } from 'react-router-dom'
import './Footer.css'
import { IoCall } from "react-icons/io5";
import { IoMdMail } from "react-icons/io";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">

        {/* Map */}
        <div className="footer-map">
          <h3 className="footer-section-title">Find Us</h3>
          <div className="map-wrapper">
            <iframe
              title="Brewed Bliss Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3888.0059!2d77.6073!3d12.9716!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae1670c9b44e6d%3A0xf8dfc3e8517e4fe0!2sMG%20Road%2C%20Bengaluru%2C%20Karnataka!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
              width="100%"
              height="220"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <p className="footer-address">12, Coffee Lane, MG Road · Bengaluru 560001</p>
        </div>

        {/* Quick links */}
        <div className="footer-links">
          <h3 className="footer-section-title">Quick Links</h3>
          <nav aria-label="Footer navigation">
            <ul>
              <li><NavLink to="/">Home</NavLink></li>
              <li><NavLink to="/our-cafe">Our Cafe</NavLink></li>
              <li><NavLink to="/menu">Menu</NavLink></li>
              <li><NavLink to="/contact">Contact</NavLink></li>
              <li><NavLink to="/our-legacy">Our Legacy</NavLink></li>
            </ul>
          </nav>
        </div>

        {/* Hours */}
        <div className="footer-hours">
          <h3 className="footer-section-title">Opening Hours</h3>
          <ul className="hours-list">
            <li><span>Mon – Fri</span><span>7:00 AM – 9:00 PM</span></li>
            <li><span>Saturday</span><span>8:00 AM – 10:00 PM</span></li>
            <li><span>Sunday</span><span>8:00 AM – 10:00 PM</span></li>
          </ul>
          <div className="footer-contact-row">
            <a href="tel:+919876543210"><IoCall /> +91 98765 43210</a>
            <a href="mailto:hello@brewedbliss.in"><IoMdMail /> hello@brewedbliss.in</a>
          </div>
        </div>

      </div>

      <div className="footer-bottom">
        <span>☕ Brewed Bliss</span>
        <span>© {new Date().getFullYear()} · Crafted with love in Bengaluru</span>
      </div>
    </footer>
  )
}
