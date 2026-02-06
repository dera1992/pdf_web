import { act } from 'react'
import { useAuthStore } from './authStore'

describe('authStore', () => {
  it('sets user and token', () => {
    act(() => {
      useAuthStore.getState().setUser({ id: '1', name: 'Test', email: 'test@example.com' })
      useAuthStore.getState().setToken('token')
    })

    const state = useAuthStore.getState()
    expect(state.user?.name).toBe('Test')
    expect(state.token).toBe('token')
  })
})
