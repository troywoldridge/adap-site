// src/components/SiteNav.tsx
import Link from 'next/link';
import { categories } from '@/lib/data';

export default function SiteNav() {
  return (
    <nav className="bg-blue-600 text-white py-2">
      <ul className="container mx-auto flex flex-wrap gap-4">
        {categories.map((cat) => (
          <li key={cat.id}>
            <Link
              href={`/category/${cat.slug}`}
              className="hover:underline"
            >
              {cat.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
