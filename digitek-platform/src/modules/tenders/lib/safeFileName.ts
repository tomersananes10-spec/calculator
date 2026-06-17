// Supabase Storage rejects non-ASCII characters (Hebrew, spaces, etc.) in keys.
// This helper sanitizes the filename to ASCII-only while preserving the extension.
export function safeFileName(name: string): string {
  const lastDot = name.lastIndexOf('.')
  const base = lastDot > 0 ? name.slice(0, lastDot) : name
  const ext = lastDot > 0 ? name.slice(lastDot) : ''
  const safeBase = base
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '')
  return (safeBase || 'file') + safeExt
}
