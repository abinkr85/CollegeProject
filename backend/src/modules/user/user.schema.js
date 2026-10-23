import { z } from 'zod'

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  department: z.string().trim().max(100, 'Department cannot exceed 100 characters').nullable().optional(),
  batch: z.string().trim().max(50, 'Batch cannot exceed 50 characters').nullable().optional(),
  year: z.string().trim().max(50, 'Year cannot exceed 50 characters').nullable().optional(),
})

export const updateNotificationsSchema = z.object({
  emailInstantAlerts: z.boolean(),
  emailDailyDigest: z.boolean(),
})

export const uploadIdCardSchema = z.object({
  studentIdNumber: z
    .string()
    .trim()
    .min(2, 'Student ID number must be at least 2 characters')
    .max(100, 'Student ID number cannot exceed 100 characters'),
  frontImage: z.string().optional(),
  backImage: z.string().optional(),
  department: z.string().trim().max(100).nullable().optional(),
  year: z.string().trim().max(50).nullable().optional(),
})

