// src/app/admin/layout.tsx
export const metadata = {
  title: 'Image Admin',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
