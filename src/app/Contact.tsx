import { useEffect, useState } from 'react'
import './Pages.css'
import { supabase } from '../lib/supabase'

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

          <h2>Visit Us</h2>

          <div className="contact-detail">
            <span className="contact-icon">📍</span>
            <div>
              <strong>Address</strong>
              <p>
                12, Coffee Lane, MG Road
                <br />
                Bengaluru, Karnataka 560001
              </p>
            </div>
          </div>


          <div className="contact-detail">
            <span className="contact-icon">🕐</span>
            <div>
              <strong>Hours</strong>
              <p>
                Mon – Fri: 7:00 AM – 9:00 PM
                <br />
                Sat – Sun: 8:00 AM – 10:00 PM
              </p>
            </div>
          </div>


          <div className="contact-detail">
            <span className="contact-icon">📞</span>
            <div>
              <strong>Phone</strong>
              <p>+91 98765 43210</p>
            </div>
          </div>


          <div className="contact-detail">
            <span className="contact-icon">✉️</span>
            <div>
              <strong>Email</strong>
              <p>hello@brewedbliss.in</p>
            </div>
          </div>


        </div>



        <div className="contact-form-wrap">

          {sent ? (

            <div className="form-success">
              <span>☕</span>
              <h3>Thank you!</h3>
              <p>
                We'll get back to you over a warm cup.
              </p>
            </div>

          ) : (

            <form 
              className="contact-form" 
              onSubmit={handleSubmit}
            >

              <h2>
                Send a Message/Inquiry/Review
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
            Notes from guests who enjoyed the coffee, food, and atmosphere.
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