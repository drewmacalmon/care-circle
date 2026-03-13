import { UtensilsCrossed, ShoppingBag, Sparkles, Tag, Coffee } from 'lucide-react'

export const TASK_TYPES = [
  { id: 'dinners',  label: '3 dinners',  Icon: UtensilsCrossed },
  { id: 'cleaning', label: 'Cleaning',   Icon: Sparkles },
  { id: 'snack',    label: 'Snack drop', Icon: Coffee },
]

export const TASK_ICON_MAP = {
  dinners:  UtensilsCrossed,
  cleaning: Sparkles,
  snack:    Coffee,
  // legacy types
  meals:     UtensilsCrossed,
  rides:     ShoppingBag,
  groceries: ShoppingBag,
  custom:    Tag,
}

export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
