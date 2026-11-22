import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/currency'
import { fetchAdminMenu, uploadMenuImage, type Category, type MenuItem } from '../../lib/menu'
import ItemModal, { type MenuItemInput } from './ItemModal'
import './AdminPanel.css'

type CategoryInput = Omit<Category, 'id'>

function CategoryModal({ initial, onClose, onSave }: { initial: Category | null; onClose: () => void; onSave: (category: CategoryInput) => Promise<void> }) {
  const [form, setForm] = useState<CategoryInput>(() => ({
    category_name_en: initial?.category_name_en || '',
    category_name_ro: initial?.category_name_ro || '',
    description_en: initial?.description_en || '',
    description_ro: initial?.description_ro || '',
    image_url: initial?.image_url || '',
    display_order: initial?.display_order ?? 0,
    is_active: initial?.is_active ?? true,
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.category_name_en?.trim() && !form.category_name_ro?.trim()) {
      setError('Enter at least one category name.')
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
      console.error('Failed to save category:', err)
      setError('Could not save category. Check permissions and try again.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="admin-modal-overlay"><div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="category-title">
    <button className="admin-modal-close" onClick={onClose} disabled={saving} aria-label="Close">✕</button>
    <h3 id="category-title" className="admin-form-heading">{initial ? 'Edit category' : 'Create category'}</h3>
    <form onSubmit={submit}><div className="admin-form-grid">
      {(['category_name_en', 'category_name_ro'] as const).map(field => <div className="admin-form-group" key={field}><label htmlFor={field}>Name ({field.endsWith('_en') ? 'English' : 'Romanian'})</label><input id={field} value={form[field] || ''} onChange={event => setForm({ ...form, [field]: event.target.value })} /></div>)}
      {(['description_en', 'description_ro'] as const).map(field => <div className="admin-form-group" key={field}><label htmlFor={field}>Description ({field.endsWith('_en') ? 'English' : 'Romanian'})</label><textarea id={field} rows={3} value={form[field] || ''} onChange={event => setForm({ ...form, [field]: event.target.value })} /></div>)}
      <div className="admin-form-group"><label htmlFor="category-image">Image URL</label><input id="category-image" type="url" value={form.image_url || ''} onChange={event => setForm({ ...form, image_url: event.target.value })} /></div>
      <div className="admin-form-group"><label htmlFor="category-image-upload">Upload category image</label><input id="category-image-upload" type="file" accept="image/*" onChange={event => setFile(event.target.files?.[0] || null)} /></div>
      <div className="admin-form-group"><label htmlFor="category-order">Display order</label><input id="category-order" type="number" step="1" required value={form.display_order ?? 0} onChange={event => setForm({ ...form, display_order: event.target.valueAsNumber })} /></div>
      <label><input type="checkbox" checked={form.is_active} onChange={event => setForm({ ...form, is_active: event.target.checked })} /> Active</label>
    </div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    <div className="admin-form-actions"><button className="admin-btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save category'}</button><button type="button" className="admin-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button></div>
    </form>
  </div></div>
}

export default function MenuItems() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingItem, setEditingItem] = useState<MenuItem | null | undefined>(undefined)
  const [editingCategory, setEditingCategory] = useState<Category | null | undefined>(undefined)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  async function refresh() {
    try {
      const { categories, items } = await fetchAdminMenu()
      setCategories(categories)
      setItems(items)
      setError('')
    } catch (err) {
      console.error('Failed to load administration menu:', err)
      setError('Could not load the menu. Please try again.')
    }
    setLoading(false)
  }

  useEffect(() => {
    let active = true
    void fetchAdminMenu().then(({ categories, items }) => {
      if (!active) return
      setCategories(categories)
      setItems(items)
      setLoading(false)
    }).catch((err: unknown) => {
      if (!active) return
      console.error('Failed to load administration menu:', err)
      setError('Could not load the menu. Please try again.')
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  async function saveItem(data: MenuItemInput) {
    const result = editingItem
      ? await supabase.from('menu_items').update(data).eq('id', editingItem.id).select('id').single()
      : await supabase.from('menu_items').insert(data).select('id').single()
    if (result.error) throw result.error
    setSuccess(editingItem ? 'Product updated.' : 'Product created.')
    setEditingItem(undefined)
    await refresh()
  }

  async function saveCategory(data: CategoryInput) {
    const result = editingCategory
      ? await supabase.from('categories').update(data).eq('id', editingCategory.id).select('id').single()
      : await supabase.from('categories').insert(data).select('id').single()
    if (result.error) throw result.error
    setSuccess(editingCategory ? 'Category updated.' : 'Category created.')
    setEditingCategory(undefined)
    await refresh()
  }

  async function deleteItem(id: string) {
    const { error } = await supabase.from('menu_items').delete().eq('id', id).select('id').single()
    if (error) {
      console.error('Failed to delete product:', error)
      setError('Could not delete the product.')
      return
    }
    setDeleteConfirm(null)
    setSuccess('Product deleted.')
    await refresh()
  }

  return <div className="admin-section">
    <div className="admin-section-header"><h2 className="admin-section-title">Menu items</h2><span className="admin-section-count">{items.length} items</span></div>
    <div className="admin-top-actions"><button className="admin-btn-primary-catogory" onClick={() => { setSuccess(''); setEditingCategory(null) }}>Create category</button><button className="admin-btn-primary" onClick={() => { setSuccess(''); setEditingItem(null) }}>+ Add item</button></div>
    {error && <p className="admin-error" role="alert">{error} <button type="button" onClick={() => void refresh()}>Retry</button></p>}
    {success && <p role="status">{success}</p>}
    {loading ? <div className="admin-loading-text">Loading items...</div> : <>
      <h3>Categories</h3>
      {categories.length === 0 && <p>No categories found.</p>}
      {categories.map(category => <div className="admin-group" key={category.id}>
        <h4 className="admin-group-title">{category.category_name_en || category.category_name_ro} {!category.is_active && '(inactive)'}</h4>
        <button className="admin-btn-edit" onClick={() => setEditingCategory(category)}>Edit category</button>
        <div className="admin-table">
          <div className="admin-table-head"><span>Item</span><span>Portion</span><span>Description</span><span>Price (RON)</span><span>Status</span><span>Actions</span></div>
          {items.filter(item => item.category_id === category.id).map(item => <div className="admin-table-row" key={item.id}>
            <span>{item.item_name_en || item.item_name_ro}</span><span>{item.portion || '—'}</span><span>{item.description_en || item.description_ro || '—'}</span><span>{formatCurrency(item.price)}</span>
            <span>{!item.is_active ? 'Inactive' : item.is_available ? 'Available' : 'Unavailable'}{item.is_featured ? ' · Featured' : ''}</span>
            <span className="admin-item-action-buttons">{deleteConfirm === item.id ? <><span>Delete?</span><button className="admin-btn-delete" onClick={() => void deleteItem(item.id)}>Yes</button><button className="admin-btn-secondary-sm" onClick={() => setDeleteConfirm(null)}>No</button></> : <><button className="admin-btn-edit" onClick={() => setEditingItem(item)}>Edit</button><button className="admin-btn-delete" onClick={() => setDeleteConfirm(item.id)}>Delete</button></>}</span>
          </div>)}
        </div>
      </div>)}
      {items.some(item => !item.category_id || !categories.some(category => category.id === item.category_id)) && <div className="admin-group"><h4>Uncategorized</h4>{items.filter(item => !item.category_id || !categories.some(category => category.id === item.category_id)).map(item => <div key={item.id}>{item.item_name_en || item.item_name_ro} <button className="admin-btn-edit" onClick={() => setEditingItem(item)}>Edit</button></div>)}</div>}
    </>}
    {editingItem !== undefined && <ItemModal initialData={editingItem} categories={categories} onClose={() => setEditingItem(undefined)} onSave={saveItem} />}
    {editingCategory !== undefined && <CategoryModal initial={editingCategory} onClose={() => setEditingCategory(undefined)} onSave={saveCategory} />}
  </div>
}
