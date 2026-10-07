import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as authApi from '../../api/auth'
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from '../../schemas/auth'
import { toServerMessage } from '@/hooks/toServerMessage'
import { ForgotPasswordForm } from '../../components/forgot-password-form'

export function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  })
  const resetLinkRequest = useMutation({ mutationFn: authApi.forgotPassword })
  const error = resetLinkRequest.error
  const serverError = toServerMessage(error) ?? (error ? 'Request failed' : null)

  return (
    <ForgotPasswordForm
      register={register}
      errors={errors}
      isSubmitting={resetLinkRequest.isPending}
      serverError={serverError}
      successMessage={resetLinkRequest.data?.message ?? null}
      onSubmit={handleSubmit(values => resetLinkRequest.mutate(values))}
    />
  )
}
