import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AxiosError } from 'axios'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { requestPasswordReset } from '../api/auth'

const schema = z.object({
  email: z.string().email()
})

type ForgotPasswordValues = z.infer<typeof schema>

export const ForgotPasswordPage = () => {
  const { register, handleSubmit, formState } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(schema)
  })
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (values: ForgotPasswordValues) => {
    setMessage(null)
    setError(null)
    setLoading(true)
    try {
      await requestPasswordReset(values.email)
      setMessage('If an account exists, we sent a reset link to your email.')
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail ?? 'Unable to request a reset link.')
      } else {
        setError('Unable to request a reset link.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 p-6 dark:bg-surface-950">
      <Card className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Reset your password</h1>
          <p className="text-sm text-surface-500">
            Enter your email and we will send you a reset link.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="text-xs font-semibold text-surface-500">Email</label>
            <Input type="email" {...register('email')} />
          </div>
          {formState.errors.email && <p className="text-xs text-accent-600">Enter a valid email.</p>}
          {message && <p className="text-xs text-emerald-600">{message}</p>}
          {error && <p className="text-xs text-accent-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
