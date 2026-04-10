'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: '홈', icon: '🏠' },
  { href: '/log', label: '운동기록', icon: '➕' },
  { href: '/history', label: '히스토리', icon: '📊' },
  { href: '/profile', label: '프로필', icon: '👤' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 safe-area-bottom">
      <div className="max-w-lg mx-auto flex justify-around items-center h-16 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 scale-105'
                  : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
