import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findUsers: vi.fn(),
  findUserById: vi.fn(),
  unlockUserById: vi.fn(),
  deleteUserById: vi.fn(),
  setUserBlockedStatus: vi.fn(),
  setAdminStudentDeletionPermission: vi.fn(),
  updateStaffProfileById: vi.fn(),
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
  config: {},
}))

vi.mock('../src/modules/admin/admin.repository.js', () => ({
  findUsers: mocks.findUsers,
  findUserById: mocks.findUserById,
  unlockUserById: mocks.unlockUserById,
  deleteUserById: mocks.deleteUserById,
  setUserBlockedStatus: mocks.setUserBlockedStatus,
  setAdminStudentDeletionPermission: mocks.setAdminStudentDeletionPermission,
  updateStaffProfileById: mocks.updateStaffProfileById,
}))

vi.mock('../src/config/index.js', () => ({
  config: mocks.config,
}))

vi.mock('../src/utils/logger.js', () => ({
  logger: mocks.logger,
}))

vi.mock('../src/queues/email.queue.js', () => ({
  emailQueue: { add: vi.fn() },
}))

vi.mock('../src/config/redis.js', () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    scan: vi.fn(),
  },
  redisSubscriber: {
    subscribe: vi.fn(),
    on: vi.fn(),
    publish: vi.fn(),
  },
}))

vi.mock('../src/utils/cache.js', () => ({
  withCache: vi.fn((key, ttl, loader) => loader()),
  invalidateCachePattern: vi.fn(),
  invalidateCache: vi.fn(),
}))

vi.mock('../src/modules/auth/token.service.js', () => ({
  revokeAllUserTokens: vi.fn(),
}))

const adminService = await import('../src/modules/admin/admin.service.js')
const { NotFoundError, ForbiddenError, BadRequestError } = await import('../src/utils/ApiError.js')

describe('Admin Users Directory Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUsers', () => {
    it('returns formatted users and pagination from repository', async () => {
      const mockResult = {
        users: [
          {
            id: '11111111-1111-1111-1111-111111111111',
            name: 'Alice Student',
            email: 'alice@example.com',
            role: 'STUDENT',
            department: 'Computer Science',
            createdAt: new Date().toISOString(),
            isLocked: false,
            complaintsCount: 2,
            complaintsSummary: { total: 2, open: 1, inProgress: 1, resolved: 0 },
          },
        ],
        total: 1,
        metrics: {
          totalStudents: 1,
          totalLocked: 0,
          activeStudents: 1,
        },
      }

      mocks.findUsers.mockResolvedValue(mockResult)

      const result = await adminService.getUsers({ search: 'Alice' }, { page: 1, limit: 10 })

      expect(mocks.findUsers).toHaveBeenCalledWith({ search: 'Alice' }, { page: 1, limit: 10 })
      expect(result).toEqual(mockResult)
    })
  })

  describe('unlockUser', () => {
    it('throws NotFoundError when user does not exist', async () => {
      mocks.findUserById.mockResolvedValue(null)

      await expect(adminService.unlockUser('non-existent-id')).rejects.toThrow(NotFoundError)
      expect(mocks.unlockUserById).not.toHaveBeenCalled()
    })

    it('successfully unlocks user account and resets lockout counters', async () => {
      const mockUser = {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Bob Student',
        email: 'bob@example.com',
      }

      const mockUnlocked = {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        lockedUntil: null,
        loginFailedAttempts: 0,
      }

      mocks.findUserById.mockResolvedValue(mockUser)
      mocks.unlockUserById.mockResolvedValue(mockUnlocked)

      const result = await adminService.unlockUser(mockUser.id)

      expect(mocks.findUserById).toHaveBeenCalledWith(mockUser.id)
      expect(mocks.unlockUserById).toHaveBeenCalledWith(mockUser.id)
      expect(result).toEqual(mockUnlocked)
    })
  })

  describe('deleteUser permissions', () => {
    it('allows Super Admin to delete student or staff account', async () => {
      const superAdmin = { id: 'super-admin-id', isSuperAdmin: true, email: 'super@campus.edu' }
      const student = { id: 'student-id', role: 'STUDENT', email: 'stu@campus.edu' }

      mocks.findUserById.mockImplementation(async (id) => {
        if (id === superAdmin.id) return superAdmin
        if (id === student.id) return student
        return null
      })
      mocks.deleteUserById.mockResolvedValue({ id: student.id })

      const result = await adminService.deleteUser(superAdmin.id, student.id)
      expect(mocks.deleteUserById).toHaveBeenCalledWith(student.id)
      expect(result).toEqual({ id: student.id })
    })

    it('allows regular Admin with canDeleteStudents to delete student account', async () => {
      const admin = { id: 'admin-id', isSuperAdmin: false, canDeleteStudents: true, email: 'admin@campus.edu' }
      const student = { id: 'student-id', role: 'STUDENT', email: 'stu@campus.edu' }

      mocks.findUserById.mockImplementation(async (id) => {
        if (id === admin.id) return admin
        if (id === student.id) return student
        return null
      })
      mocks.deleteUserById.mockResolvedValue({ id: student.id })

      const result = await adminService.deleteUser(admin.id, student.id)
      expect(mocks.deleteUserById).toHaveBeenCalledWith(student.id)
      expect(result).toEqual({ id: student.id })
    })

    it('rejects regular Admin without canDeleteStudents when attempting to delete student', async () => {
      const admin = { id: 'admin-id', isSuperAdmin: false, canDeleteStudents: false, email: 'admin@campus.edu' }
      const student = { id: 'student-id', role: 'STUDENT', email: 'stu@campus.edu' }

      mocks.findUserById.mockImplementation(async (id) => {
        if (id === admin.id) return admin
        if (id === student.id) return student
        return null
      })

      await expect(adminService.deleteUser(admin.id, student.id)).rejects.toThrow(ForbiddenError)
      expect(mocks.deleteUserById).not.toHaveBeenCalled()
    })

    it('rejects regular Admin with canDeleteStudents when attempting to delete another Admin', async () => {
      const admin = { id: 'admin-id', isSuperAdmin: false, canDeleteStudents: true, email: 'admin@campus.edu' }
      const otherAdmin = { id: 'other-admin-id', role: 'ADMIN', email: 'other@campus.edu' }

      mocks.findUserById.mockImplementation(async (id) => {
        if (id === admin.id) return admin
        if (id === otherAdmin.id) return otherAdmin
        return null
      })

      await expect(adminService.deleteUser(admin.id, otherAdmin.id)).rejects.toThrow(ForbiddenError)
      expect(mocks.deleteUserById).not.toHaveBeenCalled()
    })
  })

  describe('blockUser', () => {
    it('allows Super Admin to block staff account', async () => {
      const superAdmin = { id: 'super-admin-id', isSuperAdmin: true }
      const staff = { id: 'staff-id', role: 'ADMIN', email: 'staff@campus.edu' }

      mocks.findUserById.mockImplementation(async (id) => {
        if (id === superAdmin.id) return superAdmin
        if (id === staff.id) return staff
        return null
      })
      mocks.setUserBlockedStatus.mockResolvedValue({ id: staff.id, isBlocked: true })

      const result = await adminService.blockUser(superAdmin.id, staff.id, true)
      expect(mocks.setUserBlockedStatus).toHaveBeenCalledWith(staff.id, true)
      expect(result).toEqual({ id: staff.id, isBlocked: true })
    })

    it('prevents non-Super Admin from blocking accounts', async () => {
      const admin = { id: 'admin-id', isSuperAdmin: false }
      const staff = { id: 'staff-id', role: 'ADMIN' }

      mocks.findUserById.mockImplementation(async (id) => {
        if (id === admin.id) return admin
        if (id === staff.id) return staff
        return null
      })

      await expect(adminService.blockUser(admin.id, staff.id, true)).rejects.toThrow(ForbiddenError)
      expect(mocks.setUserBlockedStatus).not.toHaveBeenCalled()
    })
  })
})
