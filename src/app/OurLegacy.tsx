import './Pages.css'

const principles = [
  {
    title: 'Inspired by Sri Lanka',
    desc: 'A restaurant identity shaped by the island’s food culture and welcoming traditions.',
  },
  {
    title: 'Made for Arad',
    desc: 'A place for sharing Sri Lankan-inspired flavours with the local community.',
  },
  {
    title: 'Details to Come',
    desc: 'Our confirmed menu and restaurant details will tell the next chapter.',
  },
]

export default function OurLegacy() {
  return (
    <main className="page inner-page">
      <div className="page-header">
        <span className="page-eyebrow">Taste of Ceylon</span>
        <h1>Our Philosophy</h1>
        <div className="divider" />
        <p className="page-desc">
          A Sri Lankan-inspired restaurant in Arad, Romania.
        </p>
      </div>

      <section className="content-section">
        <div className="cards-row">
          {principles.map((principle) => (
            <article className="value-card" key={principle.title}>
              <span className="value-icon" aria-hidden="true">✦</span>
              <h3>{principle.title}</h3>
              <p>{principle.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section legacy-quote-section">
        <blockquote className="legacy-quote">
          A table is at its best when there is room to share.
          <cite>— Taste of Ceylon</cite>
        </blockquote>
      </section>
    </main>
  )
}
