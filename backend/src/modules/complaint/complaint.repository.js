import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { getPrismaSkipTake } from '../../utils/paginate.js'

const COMPLAINT_SUMMARY_SELECT = {
  id: true,
  title: true,
  description: true,
  imageUrl: true,
  category: true,
  priority: true,
  nlpConfidence: true,
  status: true,
  department: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
}
export const findUserById = (id) =>
  prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      department: true,
      batch: true,
      year: true,
      isBlocked: true,
    },
  })

export const buildWhereClause = ({ category, priority, status, department, search } = {}) => {
  const where = {}

  if (category) {
    where.category = category
  }

  if (priority) {
    where.priority = priority
  }

  if (status) {
    where.status = status
  }

  if (department) {
    where.department = department
  }

  if (search) {
    where.OR = [
      {
        title: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        description: {
          contains: search,
          mode: 'insensitive',
        },
      },
    ]
  }

  return where
}

const HISTORY_SORT_COLUMNS = {
  createdAt: Prisma.sql`c.created_at`,
  updatedAt: Prisma.sql`c.updated_at`,
  title: Prisma.sql`c.title`,
  status: Prisma.sql`c.status::text`,
  priority: Prisma.sql`c.priority::text`,
}

const buildComplaintHistoryWhere = (userId, { status, category, priority, search } = {}) => {
  const filters = [Prisma.sql`c.user_id = ${userId}::uuid`]

  if (status) {
    filters.push(Prisma.sql`c.status::text = ${status}`)
  }

  if (category) {
    filters.push(Prisma.sql`c.category = ${category}`)
  }

  if (priority) {
    filters.push(Prisma.sql`c.priority::text = ${priority}`)
  }

  if (!search) {
    return Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`
  }

  const pattern = `%${search}%`
  filters.push(Prisma.sql`(
      c.id::text ILIKE ${pattern}
      OR c.title ILIKE ${pattern}
      OR c.description ILIKE ${pattern}
      OR COALESCE(c.category, '') ILIKE ${pattern}
      OR COALESCE(c.department, '') ILIKE ${pattern}
      OR COALESCE(u.name, '') ILIKE ${pattern}
      OR COALESCE(u.email, '') ILIKE ${pattern}
      OR c.status::text ILIKE ${pattern}
      OR COALESCE(c.priority::text, '') ILIKE ${pattern}
      OR to_char(c.created_at, 'YYYY-MM-DD') ILIKE ${pattern}
      OR to_char(c.created_at, 'DD Mon YYYY') ILIKE ${pattern}
  )`)

  return Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`
}

export const findComplaintHistoryByUser = async (
  userId,
  { status, category, priority, search, page, limit, sortBy = 'createdAt', sortOrder = 'desc' }
) => {
  const skip = (page - 1) * limit
  const whereClause = buildComplaintHistoryWhere(userId, { status, category, priority, search })
  const sortColumn = HISTORY_SORT_COLUMNS[sortBy] ?? HISTORY_SORT_COLUMNS.createdAt
  const sortDirection = sortOrder === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`

  const [data, countRows] = await Promise.all([
    prisma.$queryRaw(Prisma.sql`
      SELECT
        c.id::text AS id,
        c.user_id::text AS "userId",
        c.title,
        c.description,
        c.image_url AS "imageUrl",
        c.category,
        c.priority::text AS priority,
        c.nlp_confidence AS "nlpConfidence",
        c.status::text AS status,
        c.department,
        c.created_at AS "createdAt",
        c.updated_at AS "updatedAt",
        c.resolved_at AS "resolvedAt",
        u.name AS "studentName",
        u.email AS "studentEmail"
      FROM complaints c
      INNER JOIN users u ON u.id = c.user_id
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}, c.created_at DESC
      LIMIT ${limit}
      OFFSET ${skip}
    `),
    prisma.$queryRaw(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM complaints c
      INNER JOIN users u ON u.id = c.user_id
      ${whereClause}
    `),
  ])

  return {
    data,
    total: Number(countRows[0]?.count ?? 0),
  }
}

export const createComplaint = (data) =>
  prisma.complaint.create({
    data,
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  })

export const findComplaintsByUser = async (userId, { status, page, limit }) => {
  const where = {
    userId,
    ...(status && {
      status,
    }),
  }

  const [data, total] = await prisma.$transaction([
    prisma.complaint.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      ...getPrismaSkipTake({ page, limit }),
      select: COMPLAINT_SUMMARY_SELECT,
    }),
    prisma.complaint.count({
      where,
    }),
  ])

  return {
    data,
    total,
  }
}

export const findComplaintById = (id) =>
  prisma.complaint.findUnique({
    where: {
      id,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          studentIdNumber: true,
          idCardStatus: true,
          idCardFrontUrl: true,
          idCardBackUrl: true,
          department: true,
          batch: true,
          year: true,
          phone: true,
          emergencyPhone: true,
          idCardValidUpto: true,
          idCardScannedAt: true,
          idCardVerifiedAt: true,
        },
      },
      logs: {
        include: {
          admin: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          changedAt: 'desc',
        },
        take: 50,
      },
      publicUpdates: {
        include: {
          admin: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
      internalNotes: {
        include: {
          admin: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
      studentFollowUps: {
        include: {
          student: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  })

export const findAllComplaints = async (filters, { page, limit }) => {
  const where = buildWhereClause(filters)

  const [data, total] = await prisma.$transaction([
    prisma.complaint.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      ...getPrismaSkipTake({ page, limit }),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.complaint.count({
      where,
    }),
  ])

  return {
    data,
    total,
  }
}

export const findAllComplaintsForExport = (filters) =>
  prisma.complaint.findMany({
    where: buildWhereClause(filters),
    orderBy: {
      createdAt: 'desc',
    },
    take: 10000,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  })

export const updateComplaint = (id, data) =>
  prisma.complaint.update({
    where: {
      id,
    },
    data,
  })

export const createComplaintLog = (data) =>
  prisma.complaintLog.create({
    data,
  })

export const createFollowUpAndLog = async (followUpData, logData) => {
  const [followUp] = await prisma.$transaction([
    prisma.studentFollowUp.create({
      data: followUpData,
    }),
    prisma.complaint.update({
      where: {
        id: followUpData.complaintId,
      },
      data: {
        status: 'OPEN',
      },
    }),
    prisma.complaintLog.create({
      data: logData,
    }),
  ])

  return followUp
}
