'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

// Example static data (replace with API or DB fetch later)
const PRODUCTS = {
  '80lb-gloss-text-8.5x5.5': {
    name: '80lb Gloss Text (8.5 x 5.5)',
    description: 'High-quality gloss text brochure paper, 80lb weight, perfect for flyers.',
    options: ['Matte Finish', 'Gloss Finish', 'UV Coating'],
  },
  'matte-bookmarks': {
    name: 'Matte Bookmarks',
    description: 'Smooth matte finish bookmarks for a classic look.',
    options: ['10pt Matte Finish', '14pt Matte Finish', '16pt Matte Finish'],
  },
  // Add more products here...
}

export default function ProductPage() {
  const pathname = usePathname()
  const slug = pathname?.split('/').pop() || ''

  const [selectedOption, setSelectedOption] = useState('')
  const [product, setProduct] = useState(null)

  useEffect(() => {
    if (!slug) {
      return
    }

    const prod = PRODUCTS[slug]

    if (prod) {
      setProduct(prod)
      setSelectedOption(prod.options[0])
    } else {
      setProduct(null)
    }
  }, [slug])

  if (!product) {
    return <h1>Product not found</h1>
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>{product.name}</h1>
      <p>{product.description}</p>

      <label htmlFor="options">Choose an option:</label>
      <select
        id="options"
        value={selectedOption}
        onChange={(e) => setSelectedOption(e.target.value)}
        style={{ marginLeft: '1rem', padding: '0.5rem' }}
      >
        {product.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>

      <p style={{ marginTop: '1rem' }}>
        Selected option: <strong>{selectedOption}</strong>
      </p>
    </div>
  )
}
