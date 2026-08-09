import { useNavigate } from 'react-router-dom'
import './Pages.css'
import { IoLocationSharp } from "react-icons/io5";
import { FaClock } from "react-icons/fa";

const features = [
  {
    icon: '🌿',
    title: 'Single-Origin Beans',
    desc: 'Every batch is sourced directly from family-owned farms in Ethiopia, Colombia, and Sumatra — traceable from crop to cup.',
  },
  {
    icon: '🔥',
    title: 'In-House Roastery',
    desc: 'We roast fresh every week in our glass-walled roastery. No stale bags, no guesswork — just perfectly timed roasts.',
  },
  {
    icon: '🤍',
    title: 'Made with Intention',
    desc: 'Our baristas train for months before they pull a single shot. Craft, consistency, and care in every cup we serve.',
  },
  {
    icon: '🌍',
    title: 'Sustainably Sourced',
    desc: 'We pay above fair-trade prices, support regenerative farming, and use 100% compostable packaging across our café.',
  },
]

const highlights = [
  { number: '15+', label: 'Years of Craft' },
  { number: '8', label: 'Origin Roasts' },
  { number: '200+', label: 'Happy Regulars' },
  { number: '4.9★', label: 'Average Rating' },
]

const specialties = [
  { name: 'Cardamom Latte', desc: 'House-spiced with ground green cardamom', price: '₹210' },
  { name: 'Bliss Cold Brew', desc: 'Cold brew over tonic with orange peel', price: '₹260' },
  { name: 'Honey Lavender Latte', desc: 'Floral, sweet and perfectly calming', price: '₹230' },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="home-wrapper">

      {/* ── Hero ── */}
      <section className="page home-page">
        <div className="home-content">
          <p className="home-tagline">Est. 2008 · Handcrafted with Love</p>
          <h1 className="home-title">Brewed Bliss</h1>
          <p className="home-subtitle">
            Where every cup tells a story. Slow coffee, warm moments, and a place
            you'll always want to return to.
          </p>
          <div className="home-actions">
            <button className="btn-primary" onClick={() => navigate('/menu')}>
              Explore Menu
            </button>
            <button className="btn-outline" onClick={() => navigate('/our-cafe')}>
              Our Story
            </button>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="home-stats-bar">
        {highlights.map((h) => (
          <div className="home-stat" key={h.label}>
            <span className="home-stat-number">{h.number}</span>
            <span className="home-stat-label">{h.label}</span>
          </div>
        ))}
      </section>

      {/* ── Why us ── */}
      <section className="home-section">
        <div className="home-section-header">
          <span className="page-eyebrow">Why Brewed Bliss</span>
          <h2>Coffee the Way It Should Be</h2>
          <p className="home-section-desc">
            We started with one conviction — that great coffee deserves great care at every step.
            From the farmer to your cup, nothing is left to chance.
          </p>
        </div>
        <div className="home-features-grid">
          {features.map((f) => (
            <div className="home-feature-card" key={f.title}>
              <span className="home-feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Signature drinks ── */}
      <section className="home-section home-section-dark">
        <div className="home-section-header">
          <span className="page-eyebrow">On The Menu</span>
          <h2>Guest Favourites</h2>
          <p className="home-section-desc">
            A few cups that keep our regulars coming back week after week.
          </p>
        </div>
        <div className="home-specialties">
          {specialties.map((s) => (
            <div className="home-specialty-card" key={s.name}>
              <div>
                <h3>{s.name}</h3>
                <p>{s.desc}</p>
              </div>
              <span className="home-specialty-price">{s.price}</span>
            </div>
          ))}
        </div>
        <button className="btn-outline home-menu-btn" onClick={() => navigate('/menu')}>
          View Full Menu
        </button>
      </section>

      {/* ── Visit us callout ── */}
      <section className="home-section home-callout">
        <div className="home-callout-inner">
          <span className="home-callout-icon">☕</span>
          <h2>Come in for a Cup</h2>
          <p>
            Whether you're settling in with a book or catching up with a friend, our doors are open
            and the coffee is ready. We'd love to see you.
          </p>
          <div className="home-callout-meta">
            <span><IoLocationSharp/> 12, Coffee Lane, MG Road, Bengaluru</span>
            <span><FaClock/> Mon–Fri 7 AM – 9 PM · Weekends 8 AM – 10 PM</span>
          </div>
          <button className="btn-primary" onClick={() => navigate('/contact')}>
            Get Directions
          </button>
        </div>
      </section>

    </div>
  )
}
