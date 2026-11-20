import { NavLink } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-map">
          <h3 className="footer-section-title">Taste of Ceylon</h3>
          <p className="footer-address">Sri Lankan-inspired dining in Arad, Romania.</p>
          <a
            className="footer-location-link"
            href="https://www.google.com/maps/search/?api=1&query=Arad%2C%20Romania"
            target="_blank"
            rel="noreferrer"
          >
            Explore Arad on Google Maps
          </a>
        </div>

        <div className="footer-links">
          <h3 className="footer-section-title">Quick Links</h3>
          <nav aria-label="Footer navigation">
            <ul>
              <li><NavLink to="/">Home</NavLink></li>
              <li><NavLink to="/our-cafe">Our Restaurant</NavLink></li>
              <li><NavLink to="/menu">Menu</NavLink></li>
              <li><NavLink to="/contact">Contact</NavLink></li>
              <li><NavLink to="/our-legacy">Our Philosophy</NavLink></li>
            </ul>
          </nav>
        </div>

      </div>

      <div className="footer-bottom">
        <span>Taste of Ceylon</span>
        <span>© {new Date().getFullYear()} · Arad, Romania</span>
      </div>
    </footer>
  )
}
