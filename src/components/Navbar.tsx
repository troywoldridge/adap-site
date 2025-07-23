// app/components/Navbar.tsx
import NavbarClient from '@/components/NavbarClient';
import { getNavbarData } from '@/lib/queries/getNavbarData';

export default async function Navbar() {
  const navItems = await getNavbarData();
  return <NavbarClient navItems={navItems} />;
}
