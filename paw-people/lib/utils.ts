import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string) {
  return format(parseISO(dateStr), 'dd MMM yyyy')
}

export function formatDateShort(dateStr: string) {
  return format(parseISO(dateStr), 'dd MMM')
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

export function timeOfDayColor(tod: string) {
  switch (tod) {
    case 'Morning': return 'bg-amber-100 text-amber-700'
    case 'Evening': return 'bg-indigo-100 text-indigo-700'
    case 'Both': return 'bg-purple-100 text-purple-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

// Sanitize quantity to positive number with up to 2 decimals
export function sanitizeQuantity(raw: string): string {
  if (raw === '' || raw === '.') return raw
  let v = raw.replace(/[^0-9.]/g, '')
  const parts = v.split('.')
  if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('')
  // limit to 2 decimal places
  const [whole, dec] = v.split('.')
  if (dec !== undefined) v = whole + '.' + dec.slice(0, 2)
  return v
}

export async function uploadFile(file: File, path: string): Promise<string | null> {
  const { supabase } = await import('./supabase')
  const { data, error } = await supabase.storage
    .from('paw-people')
    .upload(path, file, { upsert: true })
  if (error) { console.error('Upload error:', error); return null }
  const { data: urlData } = supabase.storage.from('paw-people').getPublicUrl(data.path)
  return urlData.publicUrl
}
