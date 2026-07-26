import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import ItemModal from './ItemModal'
import './AdminPanel.css'

interface MenuItem {
  id: string
  category: string
  item: string
  portion: string
  description: string
  price: number
  status: boolean
  created_at: string
}

const CATEGORIES = [
  'Espresso & Coffee',
  'Specialty Drinks',
  'Food & Bakes',
]

export default function MenuItems() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    fetchItems()
  }, [])

  async function fetchItems() {
    setLoading(true)

    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('category')
      .order('item')

    if (!error && data) {
      setItems(data)
    }

    setLoading(false)
  }

  function handleAdd() {
    setEditingItem(null)
    setIsModalOpen(true)
  }

  function handleEdit(item: MenuItem) {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  async function handleSave(data: any) {
    if (editingItem) {
      const { error } = await supabase
        .from('menu_items')
        .update(data)
        .eq('id', editingItem.id)

      if (error) throw error
    } else {
      const { error } = await supabase
        .from('menu_items')
        .insert(data)

      if (error) throw error
    }

    await fetchItems()

    setIsModalOpen(false)
    setEditingItem(null)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id)

    if (!error) {
      fetchItems()
    }

    setDeleteConfirm(null)
  }

  const grouped = CATEGORIES.map((category) => ({
    category,
    items: items.filter((i) => i.category === category),
  }))

  return (
    <div className="admin-section">

      <div className="admin-section-header">
        <h2 className="admin-section-title">
          Menu Items
        </h2>

        <span className="admin-section-count">
          {items.length} items
        </span>
      </div>

      <button
        className="admin-btn-primary"
        onClick={handleAdd}
      >
        + Add Item
      </button>

      <ItemModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingItem(null)
        }}
        onSave={handleSave}
        initialData={editingItem}
      />

      {loading ? (
        <div className="admin-loading-text">
          Loading items...
        </div>
      ) : items.length === 0 ? (
        <div className="admin-empty">
          No menu items found.
        </div>
      ) : (
        grouped.map(
          (group) =>
            group.items.length > 0 && (
              <div
                key={group.category}
                className="admin-group"
              >
                <h4 className="admin-group-title">
                  {group.category}
                </h4>

                <div className="admin-table">

                  <div className="admin-table-head">
                    <span>Item</span>
                    <span>Portion</span>
                    <span>Description</span>
                    <span>Price</span>
                    <span>Status</span>
                    <span>Actions</span>
                  </div>

                  {group.items.map((menuItem) => (
                    <div
                      key={menuItem.id}
                      className="admin-table-row"
                    >
                      <span className="admin-item-name">
                        {menuItem.item}
                      </span>

                      <span>
                        {menuItem.portion || '—'}
                      </span>

                      <span>
                        {menuItem.description || '—'}
                      </span>

                      <span>
                        ₹{menuItem.price}
                      </span>

                      <span>
                        <span
                          className={`admin-status-badge ${
                            menuItem.status
                              ? 'active'
                              : 'inactive'
                          }`}
                        >
                          {menuItem.status
                            ? 'Active'
                            : 'Inactive'}
                        </span>
                      </span>

                      <span className="admin-item-actions">

                        {deleteConfirm === menuItem.id ? (
                          <>
                            <span className="admin-confirm-text">
                              Delete?
                            </span>

                            <button
                              className="admin-btn-delete"
                              onClick={() =>
                                handleDelete(menuItem.id)
                              }
                            >
                              Yes
                            </button>

                            <button
                              className="admin-btn-secondary-sm"
                              onClick={() =>
                                setDeleteConfirm(null)
                              }
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="admin-btn-edit"
                              onClick={() =>
                                handleEdit(menuItem)
                              }
                            >
                              Edit
                            </button>

                            <button
                              className="admin-btn-delete"
                              onClick={() =>
                                setDeleteConfirm(menuItem.id)
                              }
                            >
                              Delete
                            </button>
                          </>
                        )}

                      </span>
                    </div>
                  ))}

                </div>
              </div>
            )
        )
      )}
    </div>
  )
}