import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AxiosError } from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { confirmPasswordReset } from '../api/auth'

const schema = z
  .object({
    new_password1: z.string().min(8),
    new_password2: z.string().min(8)
  })
  .refine((values) => values.new_password1 === values.new_password2, {
    message: 'Passwords do not match',
    path: ['new_password2']
  })

type ResetPasswordValues = z.infer<typeof schema>

export const ResetPasswordPage = () => {
  const { uid, token } = useParams<{ uid: string; token: string }>()
  const { register, handleSubmit, formState, reset } = useForm<ResetPasswordValues>({
    resolver: zodResolver(schema)
  })
  const navigate = useNavigate()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (values: ResetPasswordValues) => {
    if (!uid || !token) {
      setError('Reset link is incomplete. Please request a new one.')
      return
    }
    setMessage(null)
    setError(null)
    setLoading(true)
    try {
      await confirmPasswordReset({
        uid,
        token,
        new_password1: values.new_password1,
        new_password2: values.new_password2
      })
      setMessage('Password updated successfully. You can sign in now.')
      reset()
      setTimeout(() => navigate('/login'), 1200)
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail ?? 'Unable to reset password.')
      } else {
        setError('Unable to reset password.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 p-6 dark:bg-surface-950">
      <Card className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Set a new password</h1>
          <p className="text-sm text-surface-500">Choose a strong password to secure your account.</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="text-xs font-semibold text-surface-500">New password</label>
            <Input type="password" {...register('new_password1')} />
          </div>
          <div>
            <label className="text-xs font-semibold text-surface-500">Confirm new password</label>
            <Input type="password" {...register('new_password2')} />
          </div>
          {formState.errors.new_password1 && (
            <p className="text-xs text-accent-600">Password must be 8+ chars.</p>
          )}
          {formState.errors.new_password2 && (
            <p className="text-xs text-accent-600">{formState.errors.new_password2.message}</p>
          )}
          {message && <p className="text-xs text-emerald-600">{message}</p>}
          {error && <p className="text-xs text-accent-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Updating...' : 'Update password'}
          </Button>
          <button
            type="button"
            className="text-xs font-semibold text-surface-700 hover:underline"
            onClick={() => navigate('/login')}
          >
            Back to sign in
          </button>
        </form>
      </Card>
    </div>
  )
}
