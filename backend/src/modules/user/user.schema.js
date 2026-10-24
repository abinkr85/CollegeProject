import { z } from 'zod'

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  phone: z.string().trim().max(30, 'Phone cannot exceed 30 characters').nullable().optional(),
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
  name: z.string().trim().max(100).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  frontImage: z.string().optional(),
  backImage: z.string().optional(),
  department: z.string().trim().max(100).nullable().optional(),
  batch: z.string().trim().max(50).nullable().optional(),
  year: z.string().trim().max(50).nullable().optional(),
  validUpto: z.string().trim().max(50).nullable().optional(),
  emergencyPhone: z.string().trim().max(30).nullable().optional(),
})


