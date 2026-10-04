import { useAuth } from "@/auth/useAuth"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { accountSchema, passwordchangeSchema, type AccountValues, type PasswordChangeValues } from "@/schemas/users"
import type { UserProfile } from "@/types/user"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import edit from "@/assets/edit.png"
import * as usersApi from "../api/users"
import { ApiError } from "@/api/client"
import { resolveErrorMessage } from "@/i18n/errors"

function AccountTab({profile, onSaved} : {profile : UserProfile, onSaved: ()=>void}) {
    const { accessToken, user } = useAuth()
    const [accountEditing, setAccountEditing] = useState<boolean>(false)
    const [passwordEditing, setPasswordEditing] = useState<boolean>(false)
    const [serverError, setServerError] = useState<string | null>(null)
    const [passwordChangeCfm, setPasswordChangeCfm] = useState<string | null>(null)

    const {
        register,
        reset,
        handleSubmit,
        formState : { errors },
    } = useForm<AccountValues>({
        resolver: zodResolver(accountSchema),
        defaultValues: {
            username: profile.username,
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email
        }
    })

    const passwordForm = useForm<PasswordChangeValues>({
        resolver: zodResolver(passwordchangeSchema),
        defaultValues: {
            current_password: "",
            new_password: "",
            confirm_password: ""
        }
    })

    const onSubmitAccountChange = async (data: AccountValues) => {
        setServerError(null)
        try {
            await usersApi.editUserAccount(accessToken!, data)
            setAccountEditing(false)
            onSaved()
        } catch (err) {
            if (err instanceof ApiError) {
                setServerError(resolveErrorMessage(err.code, err.message))
            }
        }
    }

    const onSubmitPasswordChange = async (passwords: PasswordChangeValues) => {
        setServerError(null)
        try {
            const response = await usersApi.changePassword(accessToken!, passwords)
            setPasswordEditing(false)
            setPasswordChangeCfm(response.message)
        } catch (err) {
            if (err instanceof ApiError) {
                setServerError(resolveErrorMessage(err.code, err.message))
            } else {
                setServerError("Request failed")
            }
        }
    }
    
    const handleCancel = () => {
        setServerError(null)
        reset()
        if (accountEditing)
            setAccountEditing(false)
        if (passwordEditing)
            setPasswordEditing(false)
    }

    return (
        <Card>
            <CardHeader>
                <div>
                    <div className="flex justify-between items-center">
                        <CardTitle>Account</CardTitle>
                        <Button variant="outline" onClick={()=>setAccountEditing(true)}>
                            <img src={edit} alt="vues" className="w-5 h-5 object-cover rounded cursor-pointer"/>
                        </Button> 
                    </div>
                    <CardDescription>
                      These are your personal secret informations.
                    </CardDescription>
                </div>
                {accountEditing && (
                    <div>
                        <Button onClick={handleSubmit(onSubmitAccountChange)}>Save</Button>
                        <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                    </div>
                )}
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
                {serverError && (<FieldError>{serverError}</FieldError>)}
                <form>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="usernamer">Username</FieldLabel>
                            <Input id="username" type="text" disabled={!accountEditing} aria-invalid={!!errors.username}
                                {...register("username")}
                            />
                            <FieldError errors={[errors.username]}/>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="first_name">First name</FieldLabel>
                            <Input id="first_name" type="text" disabled={!accountEditing} aria-invalid={!!errors.first_name}
                                {...register("first_name")}
                            />
                            <FieldError errors={[errors.first_name]}/>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="last_name">Last name</FieldLabel>
                            <Input id="last_name" type="text" disabled={!accountEditing} aria-invalid={!!errors.last_name}
                                {...register("last_name")}
                            />                     
                            <FieldError errors={[errors.last_name]}/>  
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="new-email">Email address</FieldLabel>
                            <Input id="user-email" type="email" disabled={!accountEditing}
                                aria-invalid={!!errors.email}
                                {...register("email")}
                                />
                            <FieldError errors={[errors.email]}/>
                        </Field>
                        {user?.has_password && (
                            <>
                            <Field>
                                <div className="flex justify-between items-center">
                                    <FieldLabel>Reset your password</FieldLabel>
                                    <Button variant="outline" onClick={()=>setPasswordEditing(true)}>
                                        <img src={edit} alt="vues" className="w-5 h-5 object-cover rounded cursor-pointer"/>
                                    </Button>
                                </div>
                            </Field>
                            {passwordEditing && (
                            <Field>
                                <div>
                                    <FieldLabel htmlFor="current-pwd">Current password</FieldLabel>
                                        <Input id="current-pwd" type="password" disabled={!passwordEditing}
                                        aria-invalid={!!passwordForm.formState.errors.current_password}
                                        {...passwordForm.register("current_password")}
                                        />
                                    <FieldError errors={[passwordForm.formState.errors.current_password]}/>
                                </div>
                                <div>
                                    <FieldLabel htmlFor="reset-pwd">New password</FieldLabel>
                                    <Input id="reset-pwd" type="password" disabled={!passwordEditing}
                                    aria-invalid={!!passwordForm.formState.errors.new_password}
                                    {...passwordForm.register("new_password")}
                                    />
                                    <FieldError errors={[passwordForm.formState.errors.new_password]}/>
                                </div>
                                <div>
                                    <FieldLabel htmlFor="reset-pwd">Confirm new password</FieldLabel>
                                    <Input id="reset-pwd" type="password" disabled={!passwordEditing}
                                    aria-invalid={!!passwordForm.formState.errors.confirm_password}
                                    {...passwordForm.register("confirm_password")}
                                    />
                                    <FieldError errors={[passwordForm.formState.errors.confirm_password]}/>
                                </div>
                                <div>
                                    <Button onClick={passwordForm.handleSubmit(onSubmitPasswordChange)}>Reset</Button>
                                    <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                                    {passwordChangeCfm && (<p>{passwordChangeCfm}</p>)}
                                </div>
                            </Field>
                            )}
                            </>
                        )}
                        </FieldGroup>
                </form>
              </CardContent>
            </Card>
    )
}

export default AccountTab