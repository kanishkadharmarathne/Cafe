import { supabase } from './supabase'

export interface Category {
  id: string
  category_name_en: string | null
  category_name_ro: string | null
  description_en: string | null
  description_ro: string | null
  image_url: string | null
  display_order: number | null
  is_active: boolean
}

export interface MenuItem {
  id: string
  category_id: string | null
  item_name_en: string | null
  item_name_ro: string | null
  description_en: string | null
  description_ro: string | null
  ingredients_en: string | null
  ingredients_ro: string | null
  portion: string | null
  price: number
  image_url: string | null
  is_available: boolean
  is_featured: boolean
  is_active: boolean
  display_order: number | null
}

export async function uploadMenuImage(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'image'
  const path = `${crypto.randomUUID()}.${extension}`
  const bucket = supabase.storage.from('taste_of_ceylon_menu_images')
  const { error } = await bucket.upload(path, file, { contentType: file.type })
  if (error) throw error
  return bucket.getPublicUrl(path).data.publicUrl
}

export async function fetchPublicMenu() {
  const [categoriesResult, itemsResult] = await Promise.all([
    supabase.from('categories')
      .select('id,category_name_en,category_name_ro,description_en,description_ro,image_url,display_order,is_active')
      .eq('is_active', true).order('display_order'),
    supabase.from('menu_items')
      .select('id,category_id,item_name_en,item_name_ro,description_en,description_ro,ingredients_en,ingredients_ro,portion,price,image_url,is_available,is_featured,is_active,display_order')
      .eq('is_active', true).order('display_order'),
  ])
  if (categoriesResult.error) throw categoriesResult.error
  if (itemsResult.error) throw itemsResult.error
  return { categories: categoriesResult.data as Category[], items: itemsResult.data as MenuItem[] }
}

export async function fetchAdminMenu() {
  const [categoriesResult, itemsResult] = await Promise.all([
    supabase.from('categories').select('id,category_name_en,category_name_ro,description_en,description_ro,image_url,display_order,is_active').order('display_order'),
    supabase.from('menu_items').select('id,category_id,item_name_en,item_name_ro,description_en,description_ro,ingredients_en,ingredients_ro,portion,price,image_url,is_available,is_featured,is_active,display_order').order('display_order'),
  ])
  if (categoriesResult.error) throw categoriesResult.error
  if (itemsResult.error) throw itemsResult.error
  return { categories: categoriesResult.data as Category[], items: itemsResult.data as MenuItem[] }
}
