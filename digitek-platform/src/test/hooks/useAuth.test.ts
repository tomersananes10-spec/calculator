import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '../../hooks/useAuth'

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

describe('useAuth', () => {
  it('starts with loading true and no user', async () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
  })

  it('sets loading false after session check', async () => {
    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await new Promise(r => setTimeout(r, 0))
    })
    expect(result.current.loading).toBe(false)
    expect(result.current.user).toBeNull()
  })
})
