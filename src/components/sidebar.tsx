'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Layers,
  CreditCard,
  Settings,
  Package,
  LogOut,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Pelanggan', icon: Users },
  { href: '/services', label: 'Layanan', icon: Package },
  { href: '/subscriptions', label: 'Langganan', icon: Layers },
  { href: '/payments', label: 'Pembayaran', icon: CreditCard },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    router.push('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold tracking-tight">Mahiru Store</h1>
        <p className="text-xs text-gray-400 mt-1">Admin Panel</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 space-y-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
        <p className="text-xs text-gray-500 text-center">
          &copy; {new Date().getFullYear()} Mahiru Store
        </p>
      </div>
    </aside>
  );
}