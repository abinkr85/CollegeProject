import { z } from 'zod'

const strongPassword = z
  .string()
  .min(8)
  .max(128)
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character')

const changedPassword = z
  .string()
  .min(8, 'New password must be at least 8 characters')
  .max(128, 'New password must be 128 characters or fewer')
  .regex(/[0-9]/, 'New password must include at least one number')
  .regex(/[^A-Za-z0-9]/, 'New password must include at least one symbol')

const baseRegisterSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  password: strongPassword,
})

export const studentRegisterSchema = baseRegisterSchema

export const adminRegisterSchema = baseRegisterSchema.extend({
  adminRegistrationKey: z.string().trim().min(1),
})

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
})

export const verifyMfaSchema = z.object({
  mfaToken: z.string().uuid(),
  code: z.string().trim().regex(/^\d{6}$/, 'Verification code must be 6 digits'),
})

export const resendMfaSchema = z.object({
  mfaToken: z.string().uuid(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: changedPassword,
  confirmPassword: z.string().min(1),
}).refine((data) => {
  return data.newPassword === data.confirmPassword
}, {
  message: "New password and confirmation password do not match",
  path: ["confirmPassword"],
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
})

export const resetPasswordSchema = z.object({
  resetToken: z.string().uuid('Invalid reset token'),
  email: z.string().trim().email().toLowerCase(),
  code: z.string().trim().regex(/^\d{6}$/, 'Verification code must be 6 digits'),
  newPassword: strongPassword,
  confirmPassword: z.string().min(1),
}).refine((data) => {
  return data.newPassword === data.confirmPassword
}, {
  message: "New password and confirmation password do not match",
  path: ["confirmPassword"],
})

