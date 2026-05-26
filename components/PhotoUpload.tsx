'use client'
import { useRef, useState } from 'react'
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react'
import { cn, uploadFile } from '@/lib/utils'

interface Props {
  currentUrl?: string | null
  onUploaded: (url: string) => void
  folder: string
  label?: string
  className?: string
}

export default function PhotoUpload({ currentUrl, onUploaded, folder, label = 'Photo', className }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null)

  async function handleFile(file: File) {
    if (!file) return
    setUploading(true)
    const path = `${folder}/${Date.now()}-${file.name.replace(/\s/g, '_')}`
    const url = await uploadFile(file, path)
    setUploading(false)
    if (url) { setPreview(url); onUploaded(url) }
    else alert('Upload failed — check Supabase storage bucket is set up')
  }

  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>

      {preview ? (
        <div className="relative inline-block">
          <img src={preview} alt="uploaded" className="w-32 h-32 object-cover rounded-2xl border border-gray-200" />
          <button onClick={() => setPreview(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5">
            <X size={12} />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button type="button" disabled={uploading}
            onClick={() => cameraRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50">
            <Camera size={16} />
            <span>Camera</span>
          </button>
          <button type="button" disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50">
            <Upload size={16} />
            <span>{uploading ? 'Uploading...' : 'Gallery / File'}</span>
          </button>
        </div>
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
    </div>
  )
}
