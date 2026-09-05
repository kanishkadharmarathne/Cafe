import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import ItemModal from './ItemModal'
import './AdminPanel.css'

interface MenuItem {
  id: string
  category_id: string | null
  item: string
  portion: string
  description: string
  price: number
  status: boolean
  created_at: string
  categories?: {
    id: string
    category_name: string
  } | {
    id: string
    category_name: string
  }[] | null
}

interface Category {
  id: string
  category_name: string
}

export default function MenuItems() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [categoryError, setCategoryError] = useState('')

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    fetchCategories()
    fetchItems()
  }, [])

  function getCategoryRef(item: MenuItem) {
    if (!item.categories) return null
    return Array.isArray(item.categories)
      ? item.categories[0] || null
      : item.categories
  }

  async function fetchCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('id, category_name')
      .order('category_name')

    if (!error && data) {
      setCategories(data)
    } else if (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  async function fetchItems() {
    setLoading(true)

    const { data, error } = await supabase
      .from('menu_items')
      .select(`
        *,
        categories (
          id,
          category_name
        )
      `)
      .order('item')

    if (!error && data) {
      setItems(data)
    } else if (error) {
      console.error('Failed to fetch menu items:', error)

      const { data: fallbackData, error: fallbackError } = await supabase
        .from('menu_items')
        .select('id, category_id, item, portion, description, price, status, created_at')
        .order('item')

      if (!fallbackError && fallbackData) {
        setItems(fallbackData)
      } else if (fallbackError) {
        console.error('Fallback menu_items fetch failed:', fallbackError)
      }
    }

    setLoading(false)
  }

  function handleAdd() {
    setEditingItem(null)
    setIsModalOpen(true)
  }

  function openCategoryModal() {
    setNewCategoryName('')
    setCategoryError('')
    setIsCategoryModalOpen(true)
  }

  async function handleCreateCategory() {
    const categoryName = newCategoryName.trim()

    if (!categoryName) {
      setCategoryError('Category name is required')
      return
    }

    setCreatingCategory(true)
    setCategoryError('')

    const { error } = await supabase
      .from('categories')
      .insert({ category_name: categoryName })

    if (error) {
      setCreatingCategory(false)

      if (error.code === '23505') {
        setCategoryError('Category already exists')
      } else {
        setCategoryError(error.message || 'Failed to create category')
      }

      return
    }

    await fetchCategories()
    await fetchItems()

    setCreatingCategory(false)
    setIsCategoryModalOpen(false)
    setNewCategoryName('')
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

  const categoryNameById = new Map(
    categories.map((category) => [category.id, category.category_name])
  )

  const grouped = Array.from(
    items.reduce((groups, item) => {
      const relatedCategory = getCategoryRef(item)
      const categoryKey = item.category_id || relatedCategory?.id || 'uncategorized'
      const categoryName =
        relatedCategory?.category_name ||
        (item.category_id ? categoryNameById.get(item.category_id) : null) ||
        'Uncategorized'

      if (!groups.has(categoryKey)) {
        groups.set(categoryKey, {
          id: categoryKey,
          category: categoryName,
          items: [] as MenuItem[],
        })
      }

      groups.get(categoryKey)?.items.push(item)
      return groups
    }, new Map<string, { id: string; category: string; items: MenuItem[] }>()).values()
  )

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

      <div className="admin-top-actions">
        <button
          className="admin-btn-primary-catogory"
          onClick={openCategoryModal}
        >
          Create Category
        </button>

        <button
          className="admin-btn-primary"
          onClick={handleAdd}
        >
          + Add Item
        </button>
      </div>

      <ItemModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingItem(null)
        }}
        onSave={handleSave}
        initialData={editingItem}
        categories={categories}
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
        <>
          {grouped.map(
            (group) =>
              group.items.length > 0 && (
                <div
                  key={group.id}
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
                          <span className="admin-item-value">{menuItem.item}</span>
                        </span>

                        <span>
                          <span className="admin-item-value">{menuItem.portion || '—'}</span>
                        </span>

                        <span>
                          <span className="admin-item-value">{menuItem.description || '—'}</span>
                        </span>

                        <span>
                          <span className="admin-item-value">₹{menuItem.price}</span>
                        </span>

                        <span>
                          <span className="admin-item-value">
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
                        </span>

                        <span className="admin-item-actions">
                          <span className="admin-item-action-buttons">
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
                        </span>
                      </div>
                    ))}

                  </div>
                </div>
              )
          )}

        </>
      )}

      {isCategoryModalOpen && (
        <div
          className="admin-modal-overlay"
          onClick={() => {
            if (!creatingCategory) {
              setIsCategoryModalOpen(false)
            }
          }}
        >
          <div
            className="admin-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="admin-modal-close"
              onClick={() => setIsCategoryModalOpen(false)}
              disabled={creatingCategory}
            >
              ✕
            </button>

            <h3 className="admin-form-heading">
              + Create Category
            </h3>

            <div className="admin-form-group">
              <label>Category Name *</label>

              <input
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="Espresso & Coffee"
                autoFocus
              />
            </div>

            {categoryError && (
              <p className="admin-error">
                {categoryError}
              </p>
            )}

            <div className="admin-form-actions">
              <button
                className="admin-btn-primary"
                onClick={handleCreateCategory}
                disabled={creatingCategory}
              >
                {creatingCategory ? 'Creating...' : 'Create Category'}
              </button>

              <button
                className="admin-btn-secondary"
                onClick={() => setIsCategoryModalOpen(false)}
                disabled={creatingCategory}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}