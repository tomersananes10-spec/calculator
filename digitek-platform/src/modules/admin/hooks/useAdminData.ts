import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { AdminProfile } from '../types'

export function useAdminData(isAdmin: boolean) {
  const [profiles, setProfiles] = useState<AdminProfile[]>([])
  const [loading, setLoading] = useState(true)

  const loadProfiles = useCallback(async () => {
    if (!isAdmin) return
    setLoading(true)
    const { data } = await supabase.rpc('admin_get_all_profiles')
    setProfiles(
      (data ?? []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        full_name: (p.full_name as string) || null,
        email: (p.email as string) || null,
        avatar_url: (p.avatar_url as string) || null,
        phone: (p.phone as string) || null,
        company: (p.company as string) || null,
        company_id: (p.company_id as string) || null,
        address: (p.address as string) || null,
        specialization: (p.specialization as string) || null,
        created_at: p.created_at as string,
        is_admin: Boolean(p.is_admin),
        last_sign_in_at: (p.last_sign_in_at as string) || null,
        auth_provider: (p.auth_provider as string) || null,
        calculation_count: Number(p.calculation_count ?? 0),
        brief_count: Number(p.brief_count ?? 0),
      })),
    )
    setLoading(false)
  }, [isAdmin])

  useEffect(() => {
    loadProfiles()
  }, [loadProfiles])

  const toggleAdmin = useCallback(
    async (profileId: string, currentValue: boolean) => {
      const { error } = await supabase.rpc('admin_update_profile', {
        target_user_id: profileId,
        new_is_admin: !currentValue,
      })
      if (!error) {
        setProfiles(prev =>
          prev.map(p =>
            p.id === profileId ? { ...p, is_admin: !currentValue } : p,
          ),
        )
      }
    },
    [],
  )

  const updateName = useCallback(
    async (profileId: string, newName: string) => {
      const { error } = await supabase.rpc('admin_update_profile', {
        target_user_id: profileId,
        new_full_name: newName,
      })
      if (!error) {
        setProfiles(prev =>
          prev.map(p =>
            p.id === profileId ? { ...p, full_name: newName } : p,
          ),
        )
      }
    },
    [],
  )

  const deleteUser = useCallback(async (profileId: string) => {
    const { error } = await supabase.rpc('delete_user', {
      target_user_id: profileId,
    })
    if (!error) {
      setProfiles(prev => prev.filter(p => p.id !== profileId))
    }
  }, [])

  return {
    profiles,
    loading,
    toggleAdmin,
    updateName,
    deleteUser,
    refresh: loadProfiles,
  }
}
