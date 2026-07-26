import { useEffect, useState } from 'react'
import './Messages.css'
import './AdminPanel.css'
import { supabase } from '../../lib/supabase'

interface Message {
  id: string
  name: string
  email: string
  message: string
  created_at: string
  isread: boolean
  isstarred: boolean
}

export default function Messages() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Message[]>([])

  async function fetchMessages() {
    setLoading(true)

    const { data } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setItems(data)

    setLoading(false)
  }

  useEffect(() => {
    fetchMessages()
  }, [])

  async function toggleStar(message: Message) {
    await supabase
      .from('messages')
      .update({
        isstarred: !message.isstarred,
      })
      .eq('id', message.id)

    fetchMessages()
  }

  async function markAsRead(message: Message) {
    if (message.isread) return

    await supabase
      .from('messages')
      .update({
        isread: true,
      })
      .eq('id', message.id)

    fetchMessages()
  }

  return (
    <div className="messages-page">

      <div className="admin-section-header">
        <h2 className="admin-section-title">Customer Messages</h2>

        <span className="admin-section-count">
          {items.length} Messages
        </span>
      </div>

      {loading ? (
        <div className="loading">
          Loading...
        </div>
      ) : items.length === 0 ? (
        <div className="empty">
          No messages received.
        </div>
      ) : (
        <div className="messages-table">

          <div className="messages-table-head">
            <span>Name</span>
            <span>Email</span>
            <span>Message</span>
            <span>Read</span>
            <span>Star</span>
            <span>Date</span>
          </div>

          {items.map((item) => (
            <div
              key={item.id}
              className={`messages-row ${!item.isread ? 'unread' : ''}`}
            >
              <span>{item.name}</span>

              <span>{item.email}</span>

              <span className="message-text">
                {item.message}
              </span>

              <span>
                <button
                  className="read-btn"
                  onClick={() => markAsRead(item)}
                >
                  {item.isread ? '✓' : 'Mark Read'}
                </button>
              </span>

              <span>
                <button
                  className="star-btn"
                  onClick={() => toggleStar(item)}
                >
                  {item.isstarred ? '⭐' : '☆'}
                </button>
              </span>

              <span>
                {new Date(item.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}

        </div>
      )}

    </div>
  )
}