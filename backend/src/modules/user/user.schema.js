import { z } from 'zod'

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  department: z.string().trim().max(100, 'Department cannot exceed 100 characters').nullable().optional(),
})

export const updateNotificationsSchema = z.object({
  emailInstantAlerts: z.boolean(),
  emailDailyDigest: z.boolean(),
})
