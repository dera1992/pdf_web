import { useEffect, useState } from 'react'
import { AxiosError } from 'axios'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { fetchProfile, updateProfile } from '../api/auth'
import type { Profile } from '../types/api'

type ProfileForm = {
  full_name: string
  phone_number: string
  email: string
  avatar: File | null
}

export const SettingsPage = () => {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState<ProfileForm>({
    full_name: '',
    phone_number: '',
    email: '',
    avatar: null
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      setStatus('loading')
      setError(null)
      try {
        const { data } = await fetchProfile()
        setProfile(data)
        setForm({
          full_name: data.full_name ?? '',
          phone_number: data.phone_number ?? '',
          email: data.email,
          avatar: null
        })
      } catch {
        setError('Unable to load profile.')
      } finally {
        setStatus('idle')
      }
    }

    void loadProfile()
  }, [])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setForm((prev) => ({ ...prev, avatar: file }))
  }

  const handleSubmit = async () => {
    setStatus('saving')
    setMessage(null)
    setError(null)
    try {
      if (form.avatar) {
        const payload = new FormData()
        payload.append('full_name', form.full_name)
        payload.append('phone_number', form.phone_number)
        payload.append('avatar', form.avatar)
        const { data } = await updateProfile(payload)
        setProfile(data)
      } else {
        const { data } = await updateProfile({
          full_name: form.full_name,
          phone_number: form.phone_number
        })
        setProfile(data)
      }
      setMessage('Profile updated successfully.')
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail ?? 'Unable to update profile.')
      } else {
        setError('Unable to update profile.')
      }
    } finally {
      setStatus('idle')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-surface-500">Manage profile and preferences.</p>
      </div>
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Profile</h2>
          {profile?.avatar && (
            <img
              src={profile.avatar}
              alt="Profile avatar"
              className="h-12 w-12 rounded-full object-cover"
            />
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-surface-500">Full name</label>
            <Input
              name="full_name"
              placeholder="Full name"
              value={form.full_name}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-surface-500">Phone number</label>
            <Input
              name="phone_number"
              placeholder="Phone number"
              value={form.phone_number}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-semibold text-surface-500">Email</label>
            <Input name="email" value={form.email} disabled />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-semibold text-surface-500">Avatar</label>
            <Input type="file" accept="image/*" onChange={handleFileChange} />
          </div>
        </div>
        {status === 'loading' && <p className="text-xs text-surface-500">Loading profile...</p>}
        {message && <p className="text-xs text-emerald-600">{message}</p>}
        {error && <p className="text-xs text-accent-600">{error}</p>}
        <Button onClick={handleSubmit} disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving...' : 'Save changes'}
        </Button>
        <a className="text-xs text-surface-500 hover:text-surface-700" href="/change-password">
          Change password
        </a>
      </Card>
    </div>
  )
}
