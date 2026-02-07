import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { socialLoginWithFacebook, socialLoginWithGoogle } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { useToastStore } from '../store/toastStore'

const getAccessTokenFromHash = () => {
  const hashParams = new URLSearchParams(window.location.hash.replace('#', ''))
  return hashParams.get('access_token')
}

export const SocialAuthCallbackPage = () => {
  const { provider } = useParams<{ provider: 'google' | 'facebook' }>()
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)
  const setUser = useAuthStore((state) => state.setUser)
  const pushToast = useToastStore((state) => state.push)
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [message, setMessage] = useState<string>('Completing sign-in...')

  useEffect(() => {
    const finalize = async () => {
      const accessToken = getAccessTokenFromHash()
      if (!provider || !accessToken) {
        setStatus('error')
        setMessage('Missing social access token. Please try again.')
        return
      }
      try {
        const request =
          provider === 'google' ? socialLoginWithGoogle(accessToken) : socialLoginWithFacebook(accessToken)
        const { data } = await request
        const resolvedAccess =
          'access' in data
            ? data.access
            : 'access_token' in data
              ? data.access_token
              : undefined
        const resolvedRefresh =
          'refresh' in data
            ? data.refresh
            : 'refresh_token' in data
              ? data.refresh_token
              : undefined
        if (!resolvedAccess || !resolvedRefresh) {
          throw new Error('Missing authentication tokens.')
        }
        setTokens({ accessToken: resolvedAccess, refreshToken: resolvedRefresh })
        if (data.user) {
          setUser(data.user)
        }
        pushToast({
          id: crypto.randomUUID(),
          title: 'Signed in successfully.',
          description: 'Welcome back!',
          tone: 'success'
        })
        navigate('/dashboard')
      } catch (error) {
        setStatus('error')
        setMessage('Unable to complete social login. Please try again.')
      }
    }

    void finalize()
  }, [navigate, provider, pushToast, setTokens, setUser])

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 p-6 dark:bg-surface-950">
      <Card className="w-full max-w-md space-y-3 text-center">
        <h1 className="text-xl font-semibold">Signing you in</h1>
        <p className="text-sm text-surface-500">{message}</p>
        {status === 'error' && (
          <button
            className="text-sm font-semibold text-surface-700 hover:underline"
            onClick={() => navigate('/login')}
          >
            Back to sign in
          </button>
        )}
      </Card>
    </div>
  )
}
