'use client'
import { useRef, useState } from 'react'
import { Upload, X, Camera } from 'lucide-react'
import { cn, uploadFile } from '@/lib/utils'

interface Props {
  currentUrl?: string | null
  onUploaded: (url: string) => void
  folder: string
  label?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function PhotoUpload({ currentUrl, onUploaded, folder, label = 'Photo', className, size = 'md' }: Props) {
  // Single file input — on mobile browsers, this opens a picker that includes Camera, Photo Library and Files
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null)
  const [err, setErr] = useState<string | null>(null)

  async function handleFile(file: File) {
    if (!file) return
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setErr('Please pick an image or PDF')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErr('File too large (max 5MB)')
      return
    }
    setErr(null)
    setUploading(true)
    const path = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const url = await uploadFile(file, path)
    setUploading(false)
    if (url) { setPreview(url); onUploaded(url) }
    else setErr('Upload failed — check Supabase storage bucket')
  }

  const sizeMap = { sm: 'w-20 h-20', md: 'w-28 h-28', lg: 'w-36 h-36' }
  const preview_box = sizeMap[size]

  return (
    <div className={cn('space-y-2', className)}>
      {label && <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>}

      <div className="flex items-start gap-3">
        {preview && (
          <div className="relative flex-shrink-0">
            <img src={preview} alt="" className={cn(preview_box, 'object-cover rounded-2xl border border-gray-200')} />
            <button type="button" onClick={() => { setPreview(null); onUploaded('') }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow">
              <X size={11} strokeWidth={3} />
            </button>
          </div>
        )}

        <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-100 hover:border-blue-300 disabled:opacity-50',
            preview && 'self-start'
          )}>
          {preview ? <Camera size={15} /> : <Upload size={15} />}
          <span>{uploading ? 'Uploading...' : preview ? 'Replace' : 'Upload photo'}</span>
        </button>

        {/* `capture` attribute is intentionally omitted — that way the OS picker shows Camera + Gallery + Files options on mobile, and just file picker on desktop */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      {err && <p className="text-xs text-red-500">{err}</p>}
    </div>
  )
}
