import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { productApi } from '../services/api'

const ShopContext = createContext(null)

const normalizeProduct = (p) => ({
  id: p.id,
  name: p.name,
  price: p.price,
  description: p.description || '',
  imageUrl: p.imageUrl || '',
  brand: p.brandName || p.brand || '',
  category: p.categoryName || p.category || '',
  stock: p.stockQuantity ?? p.stock ?? 0,
  featured: p.featured ?? false,
  status: p.status ?? 'Active'
})

export function ShopProvider({ children }) {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lumiere-cart')) || [] }
    catch { return [] }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    const loadProducts = async () => {
      try {
        setLoading(true)
        const data = await productApi.getAll()
        if (mounted) setProducts(data.map(normalizeProduct))
      } catch (err) {
        console.error('Failed to load products from backend:', err)
        if (mounted) setError(err.message)
        if (mounted) setProducts([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadProducts()
    return () => { mounted = false }
  }, [])

  useEffect(() => localStorage.setItem('lumiere-cart', JSON.stringify(cart)), [cart])

  const addToCart = (product) => setCart(current => {
    const found = current.find(item => item.id === product.id)
    return found ? current.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { ...product, quantity: 1 }]
  })
  const updateQuantity = (id, quantity) => setCart(current => quantity <= 0 ? current.filter(item => item.id !== id) : current.map(item => item.id === id ? { ...item, quantity } : item))
  const removeFromCart = (id) => setCart(current => current.filter(item => item.id !== id))

  const saveProduct = async (product) => {
    const payload = {
      name: product.name,
      price: product.price,
      description: product.description || '',
      stockQuantity: product.stock,
      imageUrl: product.imageUrl || '',
      sku: product.sku || `SKU-${Date.now()}`,
      brandId: 1,
      categoryId: 1
    }
    let saved
    if (product.id && String(product.id).startsWith('P-')) {
      saved = await productApi.create(payload)
    } else if (product.id) {
      saved = await productApi.update(product.id, payload)
    } else {
      saved = await productApi.create(payload)
    }
    const normalized = normalizeProduct(saved)
    setProducts(current => [normalized, ...current.filter(p => p.id !== normalized.id)])
    return normalized
  }

  const deleteProduct = async (id) => {
    await productApi.remove(id)
    setProducts(current => current.filter(p => p.id !== id))
  }

  const value = useMemo(() => ({ products, cart, loading, error, addToCart, updateQuantity, removeFromCart, saveProduct, deleteProduct }), [products, cart, loading, error])
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}



export const useShop = () => useContext(ShopContext)
