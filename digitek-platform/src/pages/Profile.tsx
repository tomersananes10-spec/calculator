import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import styles from './Profile.module.css'

export function Profile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setEmail(user.email ?? '')
    setFullName(user.user_metadata?.full_name ?? '')
    setAvatarUrl(user.user_metadata?.avatar_url ?? null)

    supabase
      .from('profiles')
      .select('phone, address, logo_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setPhone(data.phone ?? '')
          setAddress(data.address ?? '')
          setLogoUrl(data.logo_url ?? null)
        }
      })
  }, [user?.id])

  const uploadFile = async (file: File, bucket: string, path: string) => {
    const ext = file.name.split('.').pop()
    const fullPath = ext ? `${path}.${ext}` : path
    const { error: uploadError } = await supabase.storage.from(bucket).upload(fullPath, file, { upsert: true })
    if (uploadError) {
      setError(`שגיאה בהעלאת קובץ: ${uploadError.message}`)
      return null
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(fullPath)
    return `${data.publicUrl}?t=${Date.now()}`
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setError(null)
    const url = await uploadFile(file, 'logos', `${user.id}/logo`)
    if (url) setLogoUrl(url)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setError(null)
    const url = await uploadFile(file, 'avatars', `${user.id}/avatar`)
    if (url) setAvatarUrl(url)
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setSuccess(false)
    setError(null)

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, full_name: fullName, phone, address, logo_url: logoUrl, avatar_url: avatarUrl })

      if (profileError) {
        setError(`שגיאה בעדכון פרופיל: ${profileError.message}`)
        setSaving(false)
        return
      }

      await supabase.auth.updateUser({
        data: { full_name: fullName, avatar_url: avatarUrl },
      })

      setSaving(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e: unknown) {
      setError(`שגיאה לא צפויה: ${e instanceof Error ? e.message : String(e)}`)
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const initial = (fullName || email)?.[0]?.toUpperCase() ?? '?'

  return (
    <div className={styles.page}>
      {/* Hero Banner */}
      <div className={styles.heroBanner}>
        <div className={styles.avatarWrapper}>
          <div className={styles.heroAvatar} onClick={() => avatarInputRef.current?.click()}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="תמונת פרופיל" />
            ) : (
              <div className={styles.heroAvatarPlaceholder}>{initial}</div>
            )}
            <div className={styles.avatarOverlay}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
        </div>
        <div className={styles.heroInfo}>
          <span className={styles.heroName}>{fullName || 'שם מלא'}</span>
          <span className={styles.heroEmail}>{email}</span>
        </div>
      </div>

      {/* Actions Bar */}
      <div className={styles.actionsBar}>
        <Link to="/" className={styles.backLink}>
          חזרה
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </Link>
        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
          {saving ? 'שומר...' : 'שמור'}
        </button>
      </div>

      {success && <div className={styles.successMsg}>הפרופיל עודכן בהצלחה</div>}
      {error && <div className={styles.errorMsg}>{error}</div>}

      {/* Personal Details */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={`${styles.cardIcon} ${styles.cardIcon_blue}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <span className={styles.cardTitle}>פרטים אישיים</span>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.fields}>
            <div className={styles.field}>
              <label className={styles.label}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                שם מלא
              </label>
              <input className={styles.input} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="הזן שם מלא" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
                טלפון
              </label>
              <input className={styles.input} value={phone} onChange={e => setPhone(e.target.value)} placeholder="050-0000000" dir="ltr" style={{ textAlign: 'right' }} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>
                מייל
              </label>
              <input className={styles.input} value={email} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                כתובת
              </label>
              <input className={styles.input} value={address} onChange={e => setAddress(e.target.value)} placeholder="עיר, רחוב" />
            </div>
          </div>
        </div>
      </div>

      {/* Logo */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={`${styles.cardIcon} ${styles.cardIcon_purple}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          </div>
          <span className={styles.cardTitle}>לוגו חברה</span>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.logoSection}>
            <div className={styles.logoPreview}>
              {logoUrl ? (
                <img src={logoUrl} alt="לוגו" />
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              )}
            </div>
            <div className={styles.logoInfo}>
              <p className={styles.logoHint}>הלוגו יוצג בהצעות מחיר, חשבוניות ומסמכי PDF</p>
              <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={handleLogoUpload} />
              <button className={styles.uploadBtn} onClick={() => logoInputRef.current?.click()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                {logoUrl ? 'החלף לוגו' : 'העלה לוגו'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <div className={styles.signOutSection}>
        <button className={styles.signOutBtn} onClick={handleSignOut}>
          התנתקות מהמערכת
        </button>
      </div>
    </div>
  )
}
