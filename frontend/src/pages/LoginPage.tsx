import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AxiosError } from 'axios'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { loginUser } from '../api/auth'
import { useAuthStore } from '../store/authStore'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

type LoginValues = z.infer<typeof schema>

export const LoginPage = () => {
  const { register, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(schema)
  })
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)
  const setUser = useAuthStore((state) => state.setUser)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (values: LoginValues) => {
    setError(null)
    setLoading(true)
    try {
      const { data } = await loginUser(values)
      setTokens({ accessToken: data.access, refreshToken: data.refresh })
      setUser(data.user)
      navigate('/dashboard')
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.non_field_errors?.[0] ?? 'Unable to sign in. Please try again.')
      } else {
        setError('Unable to sign in. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 p-6 dark:bg-surface-950">
      <Card className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm text-surface-500">Sign in to collaborate on PDFs.</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="text-xs font-semibold text-surface-500">Email</label>
            <Input type="email" {...register('email')} />
          </div>
          <div>
            <label className="text-xs font-semibold text-surface-500">Password</label>
            <Input type="password" {...register('password')} />
          </div>
          {formState.errors.email && <p className="text-xs text-accent-600">Enter a valid email.</p>}
          {formState.errors.password && <p className="text-xs text-accent-600">Password must be 8+ chars.</p>}
          {error && <p className="text-xs text-accent-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
          <div className="flex items-center justify-between text-xs text-surface-500">
            <a className="hover:text-surface-700" href="/forgot-password">
              Forgot password?
            </a>
            <a className="hover:text-surface-700" href="/register">
              Create an account
            </a>
          </div>
          <div className="relative py-2 text-center text-xs text-surface-400">
            <span className="bg-white px-2 dark:bg-surface-950">or</span>
            <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-surface-200 dark:bg-surface-800" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="secondary" className="w-full">
              Continue with Google
            </Button>
            <Button type="button" variant="secondary" className="w-full">
              Continue with Facebook
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
