import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as authApi from '../../api/auth'
import { useAuth } from '../../auth/useAuth'
import { resetPasswordSchema, type ResetPasswordValues } from '../../schemas/auth'
import { toServerMessage } from '@/hooks/toServerMessage'
import {
  MissingResetToken,
  ResetPasswordForm,
} from '../../components/reset-password-form'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { loginWithToken } = useAuth()
  const token = searchParams.get('token') ?? ''
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  })
  const passwordReset = useMutation({
    mutationFn: (values: ResetPasswordValues) => authApi.resetPassword({ token, ...values }),
    onSuccess: async response => {
      await loginWithToken(response.access_token)
      navigate('/')
    },
  })
  const error = passwordReset.error
  const serverError = toServerMessage(error) ?? (error ? 'Reset failed' : null)

  if (!token) {
    return <MissingResetToken />
  }

  return (
    <ResetPasswordForm
      register={register}
      errors={errors}
      isSubmitting={passwordReset.isPending}
      serverError={serverError}
      onSubmit={handleSubmit(values => passwordReset.mutate(values))}
    />
  )
}
