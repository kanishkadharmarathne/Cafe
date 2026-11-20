import './Pages.css'

export default function OurCafe() {
  return (
    <main className="page inner-page">
      <div className="page-header">
        <span className="page-eyebrow">Welcome</span>
        <h1>Our Restaurant</h1>
        <div className="divider" />
      </div>

      <section className="content-section two-col">
        <div className="text-block">
          <h2>A Restaurant Inspired by Ceylon</h2>
          <p>
            Taste of Ceylon is a Sri Lankan-inspired restaurant concept for Arad,
            Romania. Its identity is rooted in the vibrant flavours and generous
            hospitality associated with the island.
          </p>
          <p>
            This page shares the ideas behind the restaurant. Menu, address,
            contact, and opening-hour details will be added when confirmed.
          </p>
        </div>
        <div className="highlight-card">
          <div className="stat">
            <span className="stat-number">01</span>
            <span className="stat-label">Sri Lankan inspiration</span>
          </div>
          <div className="stat">
            <span className="stat-number">02</span>
            <span className="stat-label">Rooted in Arad</span>
          </div>
          <div className="stat">
            <span className="stat-number">03</span>
            <span className="stat-label">Made to welcome</span>
          </div>
        </div>
      </section>

      <section className="content-section">
        <h2>Our Values</h2>
        <div className="cards-row">
          {[
            { icon: '🌿', title: 'A Sense of Place', desc: 'Sri Lankan food culture, shared in Arad.' },
            { icon: '🌶️', title: 'Bold Flavours', desc: 'A cuisine celebrated for its vivid spices and ingredients.' },
            { icon: '🤝', title: 'Warm Welcome', desc: 'A welcoming spirit at the heart of the restaurant.' },
          ].map((v) => (
            <div className="value-card" key={v.title}>
              <span className="value-icon">{v.icon}</span>
              <h3>{v.title}</h3>
              <p>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
