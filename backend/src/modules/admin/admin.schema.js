import { z } from 'zod'
import { paginationSchema } from '../../utils/paginate.js'

const enumFromString = (values) =>
  z.preprocess(
    value => (typeof value === 'string' ? value.toUpperCase() : value),
    z.enum(values)
  )

const prioritySchema = enumFromString(['HIGH', 'MEDIUM', 'LOW'])
const statusSchema = enumFromString(['OPEN', 'IN_PROGRESS', 'RESOLVED'])

export const adminComplaintIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const adminComplaintQuerySchema = paginationSchema.extend({
  category: z.string().trim().min(1).max(50).optional(),
  priority: prioritySchema.optional(),
  status: statusSchema.optional(),
  department: z.string().trim().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(200).optional(),
})

export const adminExportQuerySchema = adminComplaintQuerySchema.omit({
  page: true,
  limit: true,
})

export const updateComplaintSchema = z.object({
  status: statusSchema,
  department: z.string().trim().min(1).max(100).optional().nullable(),
  adminNote: z.string().trim().max(2000).optional().nullable(),
  admin_note: z.string().trim().max(2000).optional().nullable(),
}).transform(value => ({
  status: value.status,
  department: value.department,
  adminNote: value.adminNote ?? value.admin_note ?? null,
}))

export const publicUpdateSchema = z.object({
  message: z.string().trim().min(1).max(2000),
})

export const internalNoteSchema = z.object({
  note: z.string().trim().min(1).max(2000),
})

export const patchStatusSchema = z.object({
  status: statusSchema,
})

export const patchAssignmentSchema = z.object({
  department: z.string().trim().min(1).max(100).nullable().optional(),
})

export const patchPrioritySchema = z.object({
  priority: prioritySchema,
})

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100),
})

export const notificationPrefsSchema = z.object({
  emailInstantAlerts: z.boolean(),
  emailDailyDigest: z.boolean(),
})

export const systemPrefsSchema = z.object({
  defaultTimezone: z.enum(['America/New_York', 'Europe/London', 'Asia/Kolkata']),
  dataRetentionPolicy: z.enum(['1', '3', '5', 'never']),
})

export const notificationIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const adminUserIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const adminUsersQuerySchema = paginationSchema.extend({
  search: z.string().trim().min(1).max(200).optional(),
  role: enumFromString(['STUDENT', 'ADMIN']).optional(),
  department: z.string().trim().min(1).max(100).optional(),
  status: z.enum(['all', 'active', 'locked']).optional().default('all'),
})
