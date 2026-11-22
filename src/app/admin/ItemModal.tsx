import { useState } from 'react'
import { uploadMenuImage, type Category, type MenuItem } from '../../lib/menu'
import './AdminPanel.css'

export type MenuItemInput = Omit<MenuItem, 'id'>

interface ItemModalProps {
  onClose: () => void
  onSave: (data: MenuItemInput) => Promise<void>
  initialData: MenuItem | null
  categories: Category[]
}

export default function ItemModal({ onClose, onSave, initialData, categories }: ItemModalProps) {
  const [form, setForm] = useState<MenuItemInput>(() => ({
    category_id: initialData?.category_id || categories[0]?.id || null,
    item_name_en: initialData?.item_name_en || '',
    item_name_ro: initialData?.item_name_ro || '',
    description_en: initialData?.description_en || '',
    description_ro: initialData?.description_ro || '',
    ingredients_en: initialData?.ingredients_en || '',
    ingredients_ro: initialData?.ingredients_ro || '',
    portion: initialData?.portion || '',
    price: initialData?.price ?? 0,
    image_url: initialData?.image_url || '',
    is_available: initialData?.is_available ?? true,
    is_featured: initialData?.is_featured ?? false,
    is_active: initialData?.is_active ?? true,
    display_order: initialData?.display_order ?? 0,
  }))
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (!form.category_id || (!form.item_name_en?.trim() && !form.item_name_ro?.trim()) || !Number.isFinite(form.price) || form.price <= 0) {
      setError('Select a category, enter a name and a valid price greater than zero.')
      return
    }
    setSaving(true)
    setError('')
    try {
      let imageUrl = form.image_url
      if (file) {
        imageUrl = await uploadMenuImage(file)
        setForm(previous => ({ ...previous, image_url: imageUrl }))
        setFile(null)
      }
      await onSave({ ...form, image_url: imageUrl })
    } catch (err) {
      console.error('Failed to save product:', err)
      setError('Could not save product or upload image. Check permissions and try again.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="admin-modal-overlay"><div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="item-modal-title">
    <button className="admin-modal-close" onClick={onClose} disabled={saving} aria-label="Close">✕</button>
    <h3 className="admin-form-heading" id="item-modal-title">{initialData ? 'Edit product' : 'Add product'}</h3>
    <form onSubmit={handleSave}>
      <div className="admin-form-grid">
        <div className="admin-form-group"><label htmlFor="item-en">Name (English)</label><input id="item-en" value={form.item_name_en || ''} onChange={event => setForm({ ...form, item_name_en: event.target.value })} /></div>
        <div className="admin-form-group"><label htmlFor="item-ro">Name (Romanian)</label><input id="item-ro" value={form.item_name_ro || ''} onChange={event => setForm({ ...form, item_name_ro: event.target.value })} /></div>
        <div className="admin-form-group"><label htmlFor="item-category">Category</label><select id="item-category" required value={form.category_id || ''} onChange={event => setForm({ ...form, category_id: event.target.value })}><option value="">Select category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.category_name_en || category.category_name_ro}</option>)}</select></div>
        <div className="admin-form-group"><label htmlFor="item-price">Price (RON)</label><input id="item-price" type="number" min="0.01" step="0.01" required value={form.price} onChange={event => setForm({ ...form, price: event.target.valueAsNumber })} /></div>
        <div className="admin-form-group"><label htmlFor="item-portion">Portion</label><input id="item-portion" value={form.portion || ''} onChange={event => setForm({ ...form, portion: event.target.value })} /></div>
        <div className="admin-form-group"><label htmlFor="item-order">Display order</label><input id="item-order" type="number" step="1" required value={form.display_order ?? 0} onChange={event => setForm({ ...form, display_order: event.target.valueAsNumber })} /></div>
        {(['description_en', 'description_ro', 'ingredients_en', 'ingredients_ro'] as const).map(field => <div className="admin-form-group" key={field}><label htmlFor={`item-${field}`}>{field.startsWith('description') ? 'Description' : 'Ingredients'} ({field.endsWith('_en') ? 'English' : 'Romanian'})</label><textarea id={`item-${field}`} rows={3} value={form[field] || ''} onChange={event => setForm({ ...form, [field]: event.target.value })} /></div>)}
        <div className="admin-form-group admin-form-full"><label htmlFor="item-image-url">Image URL</label><input id="item-image-url" type="url" value={form.image_url || ''} onChange={event => setForm({ ...form, image_url: event.target.value })} /></div>
        <div className="admin-form-group admin-form-full"><label htmlFor="item-image">Upload product image</label><input id="item-image" type="file" accept="image/*" onChange={event => setFile(event.target.files?.[0] || null)} /></div>
        {(['is_active', 'is_available', 'is_featured'] as const).map(field => <label key={field}><input type="checkbox" checked={form[field]} onChange={event => setForm({ ...form, [field]: event.target.checked })} /> {field === 'is_active' ? 'Active' : field === 'is_available' ? 'Available' : 'Featured'}</label>)}
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <div className="admin-form-actions"><button className="admin-btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save product'}</button><button type="button" className="admin-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button></div>
    </form>
  </div></div>
}
