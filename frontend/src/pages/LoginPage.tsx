import { useEffect, useState } from 'react'
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
import { useToastStore } from '../store/toastStore'
import { SocialAuthButtons } from '../components/auth/SocialAuthButtons'

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
  const accessToken = useAuthStore((state) => state.accessToken)
  const pushToast = useToastStore((state) => state.push)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const getErrorMessage = (err: AxiosError) => {
    const data = err.response?.data as
      | {
          non_field_errors?: string[]
          detail?: string
          email?: string[]
          password?: string[]
        }
      | undefined
    return (
      data?.non_field_errors?.[0] ??
      data?.detail ??
      data?.email?.[0] ??
      data?.password?.[0] ??
      'Unable to sign in. Please try again.'
    )
  }

  useEffect(() => {
    if (accessToken) {
      navigate('/dashboard')
    }
  }, [accessToken, navigate])

  const onSubmit = async (values: LoginValues) => {
    setError(null)
    setLoading(true)
    try {
      const { data } = await loginUser(values)
      const accessToken =
        'access' in data
          ? data.access
          : 'access_token' in data
            ? data.access_token
            : undefined
      const refreshToken =
        'refresh' in data
          ? data.refresh
          : 'refresh_token' in data
            ? data.refresh_token
            : undefined
      if (!accessToken || !refreshToken) {
        setError('Login succeeded but missing authentication tokens.')
        return
      }
      setTokens({ accessToken, refreshToken })
      if (data.user) {
        setUser(data.user)
      }
      pushToast({
        id: crypto.randomUUID(),
        title: 'Signed in successfully.',
        description: 'Welcome back!',
        tone: 'success'
      })
      navigate('/')
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(getErrorMessage(err))
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
          <SocialAuthButtons />
        </form>
      </Card>
    </div>
  )
}
