import { z } from 'zod'
import { paginationSchema } from '../../utils/paginate.js'

const statusSchema = z.preprocess(
  value => (typeof value === 'string' ? value.toUpperCase() : value),
  z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED'])
)

const prioritySchema = z.preprocess(
  value => (typeof value === 'string' ? value.toUpperCase() : value),
  z.enum(['LOW', 'MEDIUM', 'HIGH'])
)

export const complaintIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const submitComplaintSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(5000),
  category: z.string().trim().max(50).optional(),
})

export const complaintListQuerySchema = paginationSchema.extend({
  status: statusSchema.optional(),
})

export const complaintHistoryQuerySchema = paginationSchema.extend({
  status: statusSchema.optional(),
  category: z.string().trim().min(1).max(50).optional(),
  priority: prioritySchema.optional(),
  search: z.string().trim().min(1).max(200).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'status', 'priority']).default('createdAt'),
  sortOrder: z.preprocess(
    value => (typeof value === 'string' ? value.toLowerCase() : value),
    z.enum(['asc', 'desc']).default('desc')
  ),
})

export const submitFollowUpSchema = z.object({
  message: z.string().trim().min(3).max(2000),
})
