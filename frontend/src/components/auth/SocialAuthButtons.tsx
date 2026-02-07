import { Button } from '../ui/Button'
import { useToastStore } from '../../store/toastStore'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const facebookAppId = import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined

const buildGoogleUrl = (redirectUri: string) => {
  if (!googleClientId) return null
  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: 'profile email',
    include_granted_scopes: 'true',
    prompt: 'consent'
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

const buildFacebookUrl = (redirectUri: string) => {
  if (!facebookAppId) return null
  const params = new URLSearchParams({
    client_id: facebookAppId,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: 'email,public_profile'
  })
  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`
}

export const SocialAuthButtons = () => {
  const pushToast = useToastStore((state) => state.push)
  const redirectBase = `${window.location.origin}/auth/callback`
  const googleUrl = buildGoogleUrl(`${redirectBase}/google`)
  const facebookUrl = buildFacebookUrl(`${redirectBase}/facebook`)

  const handleMissingConfig = (provider: 'google' | 'facebook') => {
    pushToast({
      id: crypto.randomUUID(),
      title: `${provider === 'google' ? 'Google' : 'Facebook'} login unavailable`,
      description: `Set ${provider === 'google' ? 'VITE_GOOGLE_CLIENT_ID' : 'VITE_FACEBOOK_APP_ID'} in the frontend environment to enable this.`,
      tone: 'warning'
    })
  }

  const handleRedirect = (url: string | null, provider: 'google' | 'facebook') => {
    if (!url) {
      handleMissingConfig(provider)
      return
    }
    window.location.assign(url)
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button type="button" variant="secondary" className="w-full" onClick={() => handleRedirect(googleUrl, 'google')}>
        Continue with Google
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => handleRedirect(facebookUrl, 'facebook')}
      >
        Continue with Facebook
      </Button>
      {!googleClientId && (
        <p className="text-xs text-surface-400 sm:col-span-2">
          Google login requires <code className="font-semibold">VITE_GOOGLE_CLIENT_ID</code>.
        </p>
      )}
      {!facebookAppId && (
        <p className="text-xs text-surface-400 sm:col-span-2">
          Facebook login requires <code className="font-semibold">VITE_FACEBOOK_APP_ID</code>.
        </p>
      )}
    </div>
  )
}
