import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8)
})

type RegisterValues = z.infer<typeof schema>

export const RegisterPage = () => {
  const { register, handleSubmit, formState } = useForm<RegisterValues>({
    resolver: zodResolver(schema)
  })

  const onSubmit = (values: RegisterValues) => {
    console.info('register', values)
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
            <label className="text-xs font-semibold text-surface-500">Name</label>
            <Input {...register('name')} />
          </div>
          <div>
            <label className="text-xs font-semibold text-surface-500">Email</label>
            <Input type="email" {...register('email')} />
          </div>
          <div>
            <label className="text-xs font-semibold text-surface-500">Password</label>
            <Input type="password" {...register('password')} />
          </div>
          {formState.errors.password && <p className="text-xs text-accent-600">Password must be 8+ chars.</p>}
          <Button type="submit" className="w-full">Create account</Button>
        </form>
      </Card>
    </div>
  )
}
