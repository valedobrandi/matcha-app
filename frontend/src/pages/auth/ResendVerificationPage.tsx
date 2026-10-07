import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as authApi from '../../api/auth'
import {
  resendVerificationSchema,
  type ResendVerificationValues,
} from '../../schemas/auth'
import { toServerMessage } from '@/hooks/toServerMessage'
import { ResendVerificationForm } from '../../components/resend-verification-form'

export function ResendVerificationPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResendVerificationValues>({
    resolver: zodResolver(resendVerificationSchema),
  })
  const resendRequest = useMutation({
    mutationFn: (values: ResendVerificationValues) => authApi.resendVerification(values.email),
  })
  const error = resendRequest.error
  const serverError = toServerMessage(error) ?? (error ? 'Request failed' : null)

  return (
    <ResendVerificationForm
      register={register}
      errors={errors}
      isSubmitting={resendRequest.isPending}
      serverError={serverError}
      successMessage={resendRequest.data?.message ?? null}
      onSubmit={handleSubmit(values => resendRequest.mutate(values))}
    />
  )
}
