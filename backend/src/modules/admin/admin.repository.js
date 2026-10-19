import { prisma } from '../../config/prisma.js'
import { getPrismaSkipTake } from '../../utils/paginate.js'

const buildWhereClause = ({ category, priority, status, department, search } = {}) => {
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
      {
        user: {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
      },
    ]
  }

  return where
}

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
}

export const findComplaints = async (filters, { page, limit }) => {
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
          select: USER_SELECT,
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

export const findComplaintForUpdate = (id) =>
  prisma.complaint.findUnique({
    where: {
      id,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  })

export const updateComplaintAndLog = async (id, updateData, logData) => {
  const [updated] = await prisma.$transaction([
    prisma.complaint.update({
      where: {
        id,
      },
      data: updateData,
    }),
    prisma.complaintLog.create({
      data: logData,
    }),
  ])

  return updated
}

export const findComplaintsForExport = (filters) =>
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

export const createPublicUpdateAndLog = async (updateData, logData) => {
  const [pubUpdate] = await prisma.$transaction([
    prisma.publicUpdate.create({
      data: updateData,
    }),
    prisma.complaint.update({
      where: {
        id: updateData.complaintId,
      },
      data: {
        adminNote: updateData.message,
      },
    }),
    prisma.complaintLog.create({
      data: logData,
    }),
  ])

  return pubUpdate
}

export const createInternalNoteAndLog = async (noteData, logData) => {
  const [intNote] = await prisma.$transaction([
    prisma.internalNote.create({
      data: noteData,
    }),
    prisma.complaintLog.create({
      data: logData,
    }),
  ])

  return intNote
}

export const findUserById = (id) =>
  prisma.user.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailInstantAlerts: true,
      emailDailyDigest: true,
      isSuperAdmin: true,
    },
  })

export const updateUser = (id, data) =>
  prisma.user.update({
    where: {
      id,
    },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailInstantAlerts: true,
      emailDailyDigest: true,
      isSuperAdmin: true,
    },
  })

export const getSystemPreference = (key) =>
  prisma.systemPreference.findUnique({
    where: {
      key,
    },
  })

export const upsertSystemPreference = (key, value) =>
  prisma.systemPreference.upsert({
    where: {
      key,
    },
    update: {
      value,
    },
    create: {
      key,
      value,
    },
  })

export const findUsers = async (filters, { page, limit }) => {
  const where = {}

  if (filters.role) {
    where.role = filters.role
  }

  if (filters.department) {
    where.department = { contains: filters.department, mode: 'insensitive' }
  }

  if (filters.search) {
    const s = filters.search.trim()
    where.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } },
      { department: { contains: s, mode: 'insensitive' } },
    ]
  }

  const now = new Date()
  if (filters.status === 'locked') {
    where.lockedUntil = { gt: now }
  } else if (filters.status === 'active') {
    where.AND = [
      {
        OR: [
          { lockedUntil: null },
          { lockedUntil: { lte: now } },
        ],
      },
    ]
  }

  const [users, total, totalStudents, totalLocked] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      ...getPrismaSkipTake({ page, limit }),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        createdAt: true,
        loginFailedAttempts: true,
        lockedUntil: true,
        _count: {
          select: {
            complaints: true,
          },
        },
        complaints: {
          select: {
            status: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { lockedUntil: { gt: now } } }),
  ])

  const formattedUsers = users.map((u) => {
    const isLocked = u.lockedUntil ? new Date(u.lockedUntil) > now : false
    const complaintsSummary = {
      total: u._count.complaints,
      open: u.complaints.filter((c) => c.status === 'OPEN').length,
      inProgress: u.complaints.filter((c) => c.status === 'IN_PROGRESS').length,
      resolved: u.complaints.filter((c) => c.status === 'RESOLVED').length,
    }

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      createdAt: u.createdAt,
      loginFailedAttempts: u.loginFailedAttempts,
      lockedUntil: u.lockedUntil,
      isLocked,
      complaintsCount: u._count.complaints,
      complaintsSummary,
    }
  })

  return {
    users: formattedUsers,
    total,
    metrics: {
      totalStudents,
      totalLocked,
      activeStudents: Math.max(0, totalStudents - totalLocked),
    },
  }
}

export const unlockUserById = (id) =>
  prisma.user.update({
    where: { id },
    data: {
      lockedUntil: null,
      loginFailedAttempts: 0,
    },
    select: {
      id: true,
      name: true,
      email: true,
      lockedUntil: true,
      loginFailedAttempts: true,
    },
  })
