import apiClient from './client'
import type { AuthResponse, Profile } from '../types/api'

export type RegisterPayload = {
  email: string
  password1: string
  password2: string
}

export type LoginPayload = {
  email: string
  password: string
}

export type ProfileUpdatePayload = {
  full_name?: string
  phone_number?: string
  avatar?: File | null
}

export const registerUser = (payload: RegisterPayload) =>
  apiClient.post('/auth/register/', payload)

export const loginUser = (payload: LoginPayload) =>
  apiClient.post<AuthResponse>('/auth/login/', payload)

export const logoutUser = (refresh: string) =>
  apiClient.post('/auth/logout/', { refresh })

export const refreshAccessToken = (refresh: string) =>
  apiClient.post<{ access: string; refresh?: string }>('/auth/token/refresh/', { refresh })

export const requestPasswordReset = (email: string) =>
  apiClient.post('/auth/password/forgot/', { email })

export const confirmPasswordReset = (payload: {
  uid: string
  token: string
  new_password1: string
  new_password2: string
}) => apiClient.post('/auth/password/reset/confirm/', payload)

export const changePassword = (payload: {
  old_password: string
  new_password1: string
  new_password2: string
}) => apiClient.post('/auth/password/change/', payload)

export const fetchProfile = () =>
  apiClient.get<Profile>('/profile/')

export const updateProfile = (payload: ProfileUpdatePayload | FormData) =>
  apiClient.patch<Profile>('/profile/', payload)

export const socialLoginWithGoogle = (accessToken: string) =>
  apiClient.post<AuthResponse>('/auth/social/google/', { access_token: accessToken })

export const socialLoginWithFacebook = (accessToken: string) =>
  apiClient.post<AuthResponse>('/auth/social/facebook/', { access_token: accessToken })
