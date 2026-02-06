import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AxiosError } from 'axios'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { changePassword } from '../api/auth'

const schema = z.object({
  old_password: z.string().min(8),
  new_password1: z.string().min(8),
  new_password2: z.string().min(8)
}).refine((values) => values.new_password1 === values.new_password2, {
  message: 'Passwords do not match',
  path: ['new_password2']
})

type ChangePasswordValues = z.infer<typeof schema>

export const ChangePasswordPage = () => {
  const { register, handleSubmit, formState, reset } = useForm<ChangePasswordValues>({
    resolver: zodResolver(schema)
  })
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (values: ChangePasswordValues) => {
    setMessage(null)
    setError(null)
    setLoading(true)
    try {
      await changePassword(values)
      setMessage('Password updated successfully.')
      reset()
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail ?? 'Unable to update password.')
      } else {
        setError('Unable to update password.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 p-6 dark:bg-surface-950">
      <Card className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Change password</h1>
          <p className="text-sm text-surface-500">Update your password to keep your account secure.</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="text-xs font-semibold text-surface-500">Current password</label>
            <Input type="password" {...register('old_password')} />
          </div>
          <div>
            <label className="text-xs font-semibold text-surface-500">New password</label>
            <Input type="password" {...register('new_password1')} />
          </div>
          <div>
            <label className="text-xs font-semibold text-surface-500">Confirm new password</label>
            <Input type="password" {...register('new_password2')} />
          </div>
          {formState.errors.old_password && (
            <p className="text-xs text-accent-600">Password must be 8+ chars.</p>
          )}
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
        </form>
      </Card>
    </div>
  )
}
