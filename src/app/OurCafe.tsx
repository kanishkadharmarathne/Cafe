import './Pages.css'

export default function OurCafe() {
  return (
    <main className="page inner-page">
      <div className="page-header">
        <span className="page-eyebrow">Welcome</span>
        <h1>Our Cafe</h1>
        <div className="divider" />
      </div>

      <section className="content-section two-col">
        <div className="text-block">
          <h2>A Corner Worth Finding</h2>
          <p>
            Nestled in the heart of the neighbourhood, Brewed Bliss was born from
            a simple belief — that a great cup of coffee should be unhurried. We
            source single-origin beans from small farms across Ethiopia, Colombia,
            and Sumatra, roasting them in-house every week to guarantee freshness.
          </p>
          <p>
            Our space was designed to feel like a living room you never want to
            leave. Warm lighting, reclaimed-wood tables, and the constant aroma of
            freshly ground coffee greet every guest at the door.
          </p>
        </div>
        <div className="highlight-card">
          <div className="stat">
            <span className="stat-number">15+</span>
            <span className="stat-label">Years of Craft</span>
          </div>
          <div className="stat">
            <span className="stat-number">8</span>
            <span className="stat-label">Origin Roasts</span>
          </div>
          <div className="stat">
            <span className="stat-number">200+</span>
            <span className="stat-label">Happy Regulars</span>
          </div>
        </div>
      </section>

      <section className="content-section">
        <h2>Our Values</h2>
        <div className="cards-row">
          {[
            { icon: '🌱', title: 'Sustainable Sourcing', desc: 'Direct trade with farmers who share our ethics.' },
            { icon: '🔥', title: 'In-House Roasting', desc: 'Roasted fresh every week, never stale.' },
            { icon: '🤝', title: 'Community First', desc: 'A space for conversations that matter.' },
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
