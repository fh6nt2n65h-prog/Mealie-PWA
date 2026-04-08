import { BookOpenText, CalendarRange, Settings2, ShoppingBasket } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import clsx from 'clsx'

const items = [
  { to: '/recipes', label: 'Recipes', icon: BookOpenText },
  { to: '/meal-plan', label: 'Meal Plan', icon: CalendarRange },
  { to: '/shopping-list', label: 'Shopping List', icon: ShoppingBasket },
  { to: '/settings', label: 'Settings', icon: Settings2 }
]

export function BottomNav() {
  return (
    <nav className="safe-bottom border-t border-t-taupe/70 bg-parchment/95 px-4 pb-4 pt-3 backdrop-blur-sm">
      <ul className="grid grid-cols-4 gap-2 rounded-[1.6rem] bg-cream/90 p-1.5 shadow-paper">
        {items.map((item) => {
          const Icon = item.icon

          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    'flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-[1.25rem] px-2 py-2 text-[0.63rem] font-semibold uppercase tracking-[0.14em] transition-colors',
                    isActive ? 'bg-oat text-ink' : 'text-oliveGray hover:text-ink'
                  )
                }
              >
                <Icon className="h-5 w-5 stroke-[1.7]" />
                <span className="block w-full text-center leading-tight">{item.label}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}