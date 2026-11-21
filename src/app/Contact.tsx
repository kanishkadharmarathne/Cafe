import { useEffect, useState } from 'react'
import './Pages.css'
import { supabase } from '../lib/supabase'
import { IoLocationSharp } from 'react-icons/io5'

interface Message {
  id: string
  name: string
  email: string
  message: string
  created_at: string
  is_read: boolean
  is_starred: boolean
}

export default function Contact() {

  const [form, setForm] = useState({
    name: '',
    email: '',
    message: ''
  })

  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<Message[]>([])


  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }


  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {

    e.preventDefault()

    setLoading(true)

    const { error } = await supabase
      .from('messages')
      .insert([
        {
          name: form.name,
          email: form.email,
          message: form.message
        }
      ])


    setLoading(false)


    if (error) {
      console.error(error)
      alert("Message sending failed")
      return
    }


    setSent(true)

    setForm({
      name: '',
      email: '',
      message: ''
    })
  }



  async function fetchStarredMessages() {

    setLoading(true)


    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('isstarred', true)
      .order('created_at', {
        ascending: false
      })


    setLoading(false)


    if (error) {
      console.error(error)
      return
    }


    setFeedback(data || [])
  }



  useEffect(() => {
    fetchStarredMessages()
  }, [])



  return (
    <main className="page inner-page">

      <div className="page-header">
        <span className="page-eyebrow">
          Get in Touch
        </span>

        <h1>Contact</h1>

        <div className="divider" />
      </div>



      <section className="content-section two-col contact-layout">

        <div className="contact-info">

          <h2>Find Us</h2>

          <div className="contact-detail">
            <span className="contact-icon"><IoLocationSharp aria-hidden="true" /></span>
            <div>
              <strong>Location</strong>
              <p>Arad, Romania</p>
              <a
                href="https://www.google.com/maps/search/?api=1&query=46.193694%2C21.308167"
                target="_blank"
                rel="noreferrer"
              >
                Get directions on Google Maps
              </a>
            </div>
          </div>

          <iframe
            className="contact-map"
            title="Taste of Ceylon location on Google Maps"
            src="https://maps.google.com/maps?q=46.193694%2C21.308167&z=17&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />

        </div>



        <div className="contact-form-wrap">

          {sent ? (

            <div className="form-success">
              <span>☕</span>
              <h3>Thank you!</h3>
              <p>
                Your message has been received.
              </p>
            </div>

          ) : (

            <form 
              className="contact-form" 
              onSubmit={handleSubmit}
            >

              <h2>
                Share Feedback or Ask Us Anything
              </h2>


              <div className="form-group">

                <label>Name</label>

                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Your name"
                  value={form.name}
                  onChange={handleChange}
                />

              </div>



              <div className="form-group">

                <label>Email</label>

                <input
                  name="email"
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={handleChange}
                />

              </div>



              <div className="form-group">

                <label>Message</label>

                <textarea
                  name="message"
                  required
                  rows={5}
                  placeholder="How can we help?"
                  value={form.message}
                  onChange={handleChange}
                />

              </div>



              <button 
                type="submit" 
                className="btn-primary"
                disabled={loading}
              >

                {loading ? "Sending..." : "Send Message"}

              </button>


            </form>

          )}

        </div>

      </section>



      <section className="feedback-section">

        <div className="feedback-header">
          <span className="page-eyebrow">
            Kind Words
          </span>

          <h4>Customer Feedback</h4>

          <p className="feedback-intro">
            Notes from guests who enjoyed the food, service, and atmosphere.
          </p>
        </div>

        <div className="feedback-container">

          {feedback.length === 0 ? (
            <div className="feedback-empty">
              No featured feedback yet.
            </div>
          ) : (
            feedback.map(item => (
              <div 
                key={item.id} 
                className="feedback-card"
              >
                <span className="feedback-quote-mark">“</span>

                <h5>{item.name}</h5>

                <p>
                  {item.message}
                </p>
              </div>
            ))
          )}

        </div>

      </section>


    </main>
  )
}