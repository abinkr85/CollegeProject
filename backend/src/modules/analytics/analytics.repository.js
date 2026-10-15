import { prisma } from '../../config/prisma.js'

export const getSummaryStats = async () => {
  const [total, pending, resolved, avgResult, statusCounts] = await Promise.all([
    prisma.complaint.count(),
    prisma.complaint.count({
      where: {
        status: {
          not: 'RESOLVED',
        },
      },
    }),
    prisma.complaint.count({
      where: {
        status: 'RESOLVED',
      },
    }),
    prisma.$queryRaw`
      SELECT ROUND(
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400)::NUMERIC, 2
      ) AS avg_days
      FROM complaints
      WHERE resolved_at IS NOT NULL
    `,
    prisma.complaint.groupBy({
      by: ['status'],
      _count: {
        _all: true,
      },
    }),
  ])

  const statusMap = {
    OPEN: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
  }
  
  if (Array.isArray(statusCounts)) {
    statusCounts.forEach(row => {
      if (row.status) {
        statusMap[row.status.toUpperCase()] = row._count._all
      }
    })
  }

  return {
    total,
    pending,
    resolved,
    avgResolutionDays: Number(avgResult[0]?.avg_days ?? 0),
    statusDistribution: statusMap,
  }
}

export const getByCategory = () =>
  prisma.complaint
    .groupBy({
      by: ['category'],
      _count: {
        _all: true,
      },
      where: {
        category: {
          not: null,
        },
      },
      orderBy: {
        _count: {
          category: 'desc',
        },
      },
    })
    .then(rows =>
      rows.map(row => ({
        category: row.category,
        count: row._count._all,
      }))
    )

export const getMonthlyTrend = () =>
  prisma
    .$queryRaw`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
        DATE_TRUNC('month', created_at) AS month_start,
        COUNT(*)::INT AS count,
        COUNT(*) FILTER (WHERE status = 'RESOLVED')::INT AS resolved
      FROM complaints
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month_start ASC
    `
    .then(rows =>
      rows.map(row => ({
        month: row.month,
        count: Number(row.count),
        resolved: Number(row.resolved ?? 0),
      }))
    )

export const getDepartmentPerformance = () =>
  prisma
    .$queryRaw`
      SELECT
        department,
        COUNT(*)::INT AS total,
        COUNT(*) FILTER (WHERE status = 'RESOLVED')::INT AS resolved,
        ROUND(
          (
            AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400)
            FILTER (WHERE resolved_at IS NOT NULL)
          )::NUMERIC,
          2
        ) AS avg_days
      FROM complaints
      WHERE department IS NOT NULL
      GROUP BY department
      ORDER BY avg_days ASC NULLS LAST
    `
    .then(rows =>
      rows.map(row => ({
        department: row.department,
        total: Number(row.total),
        resolved: Number(row.resolved),
        avgDays: row.avg_days === null ? null : Number(row.avg_days),
      }))
    )

export const getPriorityDistribution = () =>
  prisma.complaint
    .groupBy({
      by: ['priority'],
      _count: {
        _all: true,
      },
      where: {
        priority: {
          not: null,
        },
      },
    })
    .then(rows =>
      rows.map(row => ({
        priority: row.priority,
        count: row._count._all,
      }))
    )
