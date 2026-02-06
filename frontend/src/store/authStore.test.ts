import { act } from 'react'
import { useAuthStore } from './authStore'

describe('authStore', () => {
  it('sets user and tokens', () => {
    act(() => {
      useAuthStore.getState().setUser({ id: 1, name: 'Test', email: 'test@example.com' })
      useAuthStore.getState().setTokens({ accessToken: 'access', refreshToken: 'refresh' })
    })

    const state = useAuthStore.getState()
    expect(state.user?.name).toBe('Test')
    expect(state.accessToken).toBe('access')
    expect(state.refreshToken).toBe('refresh')
  })
})
