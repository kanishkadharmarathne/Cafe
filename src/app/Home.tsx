import { useNavigate } from 'react-router-dom'
import './Pages.css'
import { IoLocationSharp } from 'react-icons/io5'

const values = [
  {
    icon: '🌿',
    title: 'Sri Lankan Roots',
    desc: 'A food identity inspired by the flavours, ingredients, and hospitality of Sri Lanka.',
  },
  {
    icon: '🌶️',
    title: 'Aromatic Flavours',
    desc: 'A celebration of the colour, warmth, and layered spices found in Sri Lankan cooking.',
  },
  {
    icon: '🤍',
    title: 'Warm Hospitality',
    desc: 'A welcoming table in Arad, where good food and good company belong together.',
  },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="home-wrapper">
      <section className="page home-page">
        <div className="home-content">
          <p className="home-tagline">Sri Lankan flavours · Arad, Romania</p>
          <h1 className="home-title">Taste of Ceylon</h1>
          <p className="home-subtitle">
            A welcoming restaurant inspired by the colour, spice, and generous
            hospitality of Sri Lanka.
          </p>
          <div className="home-actions">
            <button className="btn-primary" onClick={() => navigate('/menu')}>
              Explore the Menu
            </button>
            <button className="btn-outline" onClick={() => navigate('/our-cafe')}>
              Our Restaurant
            </button>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-header">
          <span className="page-eyebrow">Our Inspiration</span>
          <h2>A Taste of Sri Lanka in Arad</h2>
          <p className="home-section-desc">
            Taste of Ceylon brings Sri Lankan culinary inspiration to Romania,
            with a focus on vibrant flavours and a warm, welcoming atmosphere.
          </p>
        </div>
        <div className="home-features-grid">
          {values.map((value) => (
            <div className="home-feature-card" key={value.title}>
              <span className="home-feature-icon" aria-hidden="true">{value.icon}</span>
              <h3>{value.title}</h3>
              <p>{value.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section home-section-dark">
        <div className="home-section-header">
          <span className="page-eyebrow">Discover</span>
          <h2>Explore the Menu</h2>
          <p className="home-section-desc">
            Browse the current selection and find something new to enjoy.
          </p>
        </div>
        <button className="btn-outline home-menu-btn" onClick={() => navigate('/menu')}>
          View Menu
        </button>
      </section>

      <section className="home-section home-callout">
        <div className="home-callout-inner">
          <span className="home-callout-icon" aria-hidden="true">🍛</span>
          <h2>Find Us in Arad</h2>
          <p>
            Taste of Ceylon is based in Arad, Romania. Explore the city location
            while restaurant visit details are being confirmed.
          </p>
          <div className="home-callout-meta">
            <span><IoLocationSharp aria-hidden="true" /> Arad, Romania</span>
          </div>
          <a
            className="btn-primary"
            href="https://www.google.com/maps/search/?api=1&query=Arad%2C%20Romania"
            target="_blank"
            rel="noreferrer"
          >
            Explore Arad
          </a>
        </div>
      </section>
    </div>
  )
}
