import { useEffect, useState } from 'react'
import './AdminPanel.css'

const CATEGORIES = [
  'Espresso & Coffee',
  'Specialty Drinks',
  'Food & Bakes',
]

const EMPTY_FORM = {
  category: CATEGORIES[0],
  item: '',
  portion: '',
  description: '',
  price: '',
  status: true,
}

interface MenuForm {
  category: string
  item: string
  portion: string
  description: string
  price: string
  status: boolean
}

interface ItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void> | void
  initialData?: any
}

export default function ItemModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: ItemModalProps) {
  const [form, setForm] = useState<MenuForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          category: initialData.category,
          item: initialData.item,
          portion: initialData.portion || '',
          description: initialData.description || '',
          price: String(initialData.price),
          status: initialData.status,
        })
      } else {
        setForm(EMPTY_FORM)
      }

      setError('')
    }
  }, [initialData, isOpen])

  if (!isOpen) return null

  async function handleSave() {
    if (!form.item.trim()) {
      setError('Item name is required')
      return
    }

    if (!form.price || Number(form.price) <= 0) {
      setError('Please enter a valid price')
      return
    }

    setSaving(true)
    setError('')

    try {
      await onSave({
        category: form.category,
        item: form.item.trim(),
        portion: form.portion.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        status: form.status,
      })
    } catch (err: any) {
      setError(err.message || 'Failed to save item.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="admin-modal-overlay"
      onClick={onClose}
    >
      <div
        className="admin-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="admin-modal-close"
          onClick={onClose}
        >
          ✕
        </button>

        <h3 className="admin-form-heading">
          {initialData ? '✏️ Edit Item' : '＋ Add New Item'}
        </h3>

        <div className="admin-form-grid">

          <div className="admin-form-group">
            <label>Item *</label>
            <input
              value={form.item}
              onChange={(e) =>
                setForm({ ...form, item: e.target.value })
              }
              placeholder="Cappuccino"
            />
          </div>

          <div className="admin-form-group">
            <label>Price *</label>
            <input
              type="number"
              min="1"
              value={form.price}
              onChange={(e) =>
                setForm({ ...form, price: e.target.value })
              }
              placeholder="0"
            />
          </div>

          <div className="admin-form-group">
            <label>Category</label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value })
              }
            >
              {CATEGORIES.map((category) => (
                <option
                  key={category}
                  value={category}
                >
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-form-group">
            <label>Portion</label>
            <input
              value={form.portion}
              onChange={(e) =>
                setForm({ ...form, portion: e.target.value })
              }
              placeholder="Small / Large / Regular"
            />
          </div>

          <div className="admin-form-group">
            <label>Status</label>

            <div className="admin-toggle-row">

              <button
                type="button"
                className={`admin-toggle ${form.status ? 'on' : 'off'}`}
                onClick={() =>
                  setForm({
                    ...form,
                    status: !form.status,
                  })
                }
              >
                <span className="admin-toggle-knob"></span>
              </button>

              <span className="admin-toggle-label">
                {form.status ? 'Active' : 'Inactive'}
              </span>

            </div>
          </div>

          <div className="admin-form-group admin-form-full">
            <label>Description</label>

            <textarea
              rows={4}
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
              placeholder="Short description..."
            />
          </div>

        </div>

        {error && (
          <p className="admin-error">
            {error}
          </p>
        )}

        <div className="admin-form-actions">

          <button
            className="admin-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : initialData
              ? 'Update Item'
              : 'Add Item'}
          </button>

          <button
            className="admin-btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

        </div>

      </div>
    </div>
  )
}