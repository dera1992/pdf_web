import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AxiosError } from 'axios'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { registerUser } from '../api/auth'

const schema = z.object({
  email: z.string().email(),
  password1: z.string().min(8),
  password2: z.string().min(8)
}).refine((values) => values.password1 === values.password2, {
  message: 'Passwords do not match',
  path: ['password2']
})

type RegisterValues = z.infer<typeof schema>

export const RegisterPage = () => {
  const { register, handleSubmit, formState } = useForm<RegisterValues>({
    resolver: zodResolver(schema)
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (values: RegisterValues) => {
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      await registerUser(values)
      setSuccess('Check your email to verify your account before signing in.')
    } catch (err) {
      if (err instanceof AxiosError) {
        const message =
          err.response?.data?.email?.[0] ??
          err.response?.data?.password1?.[0] ??
          'Unable to create account. Please try again.'
        setError(message)
      } else {
        setError('Unable to create account. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 p-6 dark:bg-surface-950">
      <Card className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Create account</h1>
          <p className="text-sm text-surface-500">Start collaborating in minutes.</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="text-xs font-semibold text-surface-500">Email</label>
            <Input type="email" {...register('email')} />
          </div>
          <div>
            <label className="text-xs font-semibold text-surface-500">Password</label>
            <Input type="password" {...register('password1')} />
          </div>
          <div>
            <label className="text-xs font-semibold text-surface-500">Confirm password</label>
            <Input type="password" {...register('password2')} />
          </div>
          {formState.errors.password1 && <p className="text-xs text-accent-600">Password must be 8+ chars.</p>}
          {formState.errors.password2 && (
            <p className="text-xs text-accent-600">{formState.errors.password2.message}</p>
          )}
          {error && <p className="text-xs text-accent-600">{error}</p>}
          {success && <p className="text-xs text-emerald-600">{success}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
          <p className="text-center text-xs text-surface-500">
            Already have an account?{' '}
            <a className="font-semibold text-surface-700 hover:underline" href="/login">
              Sign in
            </a>
          </p>
        </form>
      </Card>
    </div>
  )
}
