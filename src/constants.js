import { UtensilsCrossed, Car, ShoppingBag, Sparkles, Tag } from 'lucide-react'

export const TASK_TYPES = [
  { id: 'meals',     label: 'Meals',     Icon: UtensilsCrossed },
  { id: 'rides',     label: 'Rides',     Icon: Car },
  { id: 'groceries', label: 'Groceries', Icon: ShoppingBag },
  { id: 'cleaning',  label: 'Cleaning',  Icon: Sparkles },
]

export const TASK_ICON_MAP = {
  meals:     UtensilsCrossed,
  rides:     Car,
  groceries: ShoppingBag,
  cleaning:  Sparkles,
  custom:    Tag,
}

export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
