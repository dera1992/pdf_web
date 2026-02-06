import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

type LoginValues = z.infer<typeof schema>

export const LoginPage = () => {
  const { register, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(schema)
  })

  const onSubmit = (values: LoginValues) => {
    console.info('login', values)
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
          <Button type="submit" className="w-full">Sign in</Button>
        </form>
      </Card>
    </div>
  )
}
