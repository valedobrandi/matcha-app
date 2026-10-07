import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { loginSchema, type LoginValues } from '../../schemas/auth'
import { toServerMessage } from '@/hooks/toServerMessage'
import { buildFortyTwoAuthorizeUrl } from '../../auth/oauthState'
import { LoginForm } from '@/components/login-form'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  })
  const loginRequest = useMutation({
    mutationFn: login,
    onSuccess: () => navigate('/'),
  })
  const error = loginRequest.error
  const serverError = toServerMessage(error) ?? (error ? 'Login failed' : null)
  const showResendLink = error instanceof ApiError && error.code === 'ACCOUNT_NOT_VERIFIED'

  return (
    <LoginForm
      register={register}
      errors={errors}
      isSubmitting={loginRequest.isPending}
      serverError={serverError}
      showResendLink={showResendLink}
      onSubmit={handleSubmit(values => loginRequest.mutate(values))}
      onFortyTwoLogin={() => {
        window.location.href = buildFortyTwoAuthorizeUrl()
      }}
    />
  )
}
