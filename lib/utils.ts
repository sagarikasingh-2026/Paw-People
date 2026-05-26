import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string) {
  return format(parseISO(dateStr), 'dd MMM yyyy')
}

export function getFollowUpUrgency(dueDateStr: string): 'overdue' | 'today' | 'tomorrow' | 'upcoming' {
  const date = parseISO(dueDateStr)
  if (isPast(date) && !isToday(date)) return 'overdue'
  if (isToday(date)) return 'today'
  if (isTomorrow(date)) return 'tomorrow'
  return 'upcoming'
}

export function patientTypeBadgeColor(type: string) {
  switch (type) {
    case 'IPD': return 'bg-red-100 text-red-700'
    case 'Resident': return 'bg-purple-100 text-purple-700'
    case 'Visit': return 'bg-blue-100 text-blue-700'
    case 'House Visit': return 'bg-green-100 text-green-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

export function treatmentTypeBadgeColor(type: string) {
  switch (type) {
    case 'Vaccination': return 'bg-blue-100 text-blue-700'
    case 'Deworming': return 'bg-yellow-100 text-yellow-700'
    case 'General': return 'bg-gray-100 text-gray-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}
