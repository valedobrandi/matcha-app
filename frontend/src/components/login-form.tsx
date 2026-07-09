import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { LoginValues } from '@/schemas/auth'
import heroImage from '@/assets/hero.png'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

type LoginFormProps = {
  register: UseFormRegister<LoginValues>
  errors: FieldErrors<LoginValues>
  isSubmitting: boolean
  serverError: string | null
  showResendLink: boolean
  onSubmit: React.FormEventHandler<HTMLFormElement>
  onFortyTwoLogin: () => void
} & Omit<React.ComponentProps<'div'>, 'onSubmit'>

export function LoginForm({
  className,
  register,
  errors,
  isSubmitting,
  serverError,
  showResendLink,
  onSubmit,
  onFortyTwoLogin,
  ...props
}: LoginFormProps) {
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form onSubmit={onSubmit} className="p-6 md:p-8">
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-balance text-muted-foreground">
                  Login to your Matcha account
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder="your_username"
                  aria-invalid={!!errors.username}
                  {...register('username')}
                />
                <FieldError errors={[errors.username]} />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Link
                    to="/auth/forgot-password"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
                <FieldError errors={[errors.password]} />
              </Field>
              {serverError && <FieldError>{serverError}</FieldError>}
              {showResendLink && (
                <FieldDescription>
                  <Link to="/auth/resend-verification">
                    Resend verification email
                  </Link>
                </FieldDescription>
              )}
              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Logging in...' : 'Login'}
                </Button>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or continue with
              </FieldSeparator>
              <Field>
                <Button
                  variant="outline"
                  type="button"
                  className="w-full"
                  onClick={onFortyTwoLogin}
                >
                  Login with 42
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Don&apos;t have an account?{' '}
                <Link to="/auth/register">Register</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="relative hidden bg-muted md:block">
            <img
              src={heroImage}
              alt="Matcha"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
