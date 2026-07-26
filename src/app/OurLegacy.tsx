import './Pages.css'

const timeline = [
  {
    year: '2008',
    title: 'A Dream in a Garage',
    desc: 'Founders Meera and Arjun began roasting beans in a rented garage, selling bags to neighbours on weekends.',
  },
  {
    year: '2011',
    title: 'First Doors Open',
    desc: 'Brewed Bliss opened its first 400 sq ft café on MG Road, Bengaluru. The queue stretched around the block on day one.',
  },
  {
    year: '2015',
    title: 'Direct Trade Partnerships',
    desc: 'We travelled to Coorg and Chikmagalur to build relationships directly with estate farmers, cutting out middlemen.',
  },
  {
    year: '2018',
    title: 'Decade of the Blend',
    desc: 'Our signature "Bliss Blend" — dark chocolate notes with a honey finish — became the bestselling espresso in the city.',
  },
  {
    year: '2022',
    title: 'In-House Roastery',
    desc: 'We launched a glass-walled roastery inside the café so guests can watch the craft unfold with every batch.',
  },
  {
    year: '2025',
    title: 'Looking Forward',
    desc: 'Expanding slowly, intentionally. Our focus remains quality over quantity — one perfect cup at a time.',
  },
]

export default function OurLegacy() {
  return (
    <main className="page inner-page">
      <div className="page-header">
        <span className="page-eyebrow">Since 2008</span>
        <h1>Our Legacy</h1>
        <div className="divider" />
        <p className="page-desc">
          Every great café has a story. Here is ours.
        </p>
      </div>

      <section className="content-section">
        <div className="timeline">
          {timeline.map((item, i) => (
            <div className={`timeline-item ${i % 2 === 0 ? 'left' : 'right'}`} key={item.year}>
              <div className="timeline-dot" />
              <div className="timeline-card">
                <span className="timeline-year">{item.year}</span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="content-section legacy-quote-section">
        <blockquote className="legacy-quote">
          "We never set out to build a brand. We just wanted to make the best
          coffee we'd ever tasted — and share it with everyone who walked through
          our door."
          <cite>— Meera &amp; Arjun, Founders</cite>
        </blockquote>
      </section>
    </main>
  )
}
