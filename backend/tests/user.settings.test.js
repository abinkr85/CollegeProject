import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  revokeAllUserTokens: vi.fn().mockResolvedValue(true),
  logger: {
    info: vi.fn(),
  },
}))

vi.mock('../src/config/prisma.js', () => ({
  prisma: mocks.prisma,
}))

vi.mock('../src/utils/logger.js', () => ({
  logger: mocks.logger,
}))

vi.mock('../src/modules/auth/token.service.js', () => ({
  revokeAllUserTokens: mocks.revokeAllUserTokens,
}))

vi.mock('../src/config/index.js', () => ({
  config: {
    NLP_SERVICE_URL: 'http://localhost:5001',
    NLP_TIMEOUT_MS: 1000,
    RELOAD_SECRET: 'test-secret',
  },
}))

vi.mock('../src/config/cloudinary.js', () => ({
  uploadToCloudinary: vi.fn(),
}))

import {
  getUserSettings,
  revokeAllSessions,
  scanAndCropIdCard,
  updateNotifications,
  updateProfile,
} from '../src/modules/user/user.service.js'

describe('User Settings Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUserSettings', () => {
    it('returns structured profile and notification preferences', async () => {
      const mockUser = {
        id: 'usr-123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'STUDENT',
        department: 'Computer Science',
        createdAt: new Date('2026-01-01'),
        emailInstantAlerts: true,
        emailDailyDigest: false,
      }
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser)

      const result = await getUserSettings('usr-123')

      expect(result.profile.name).toBe('John Doe')
      expect(result.profile.email).toBe('john@example.com')
      expect(result.profile.department).toBe('Computer Science')
      expect(result.notifications.emailInstantAlerts).toBe(true)
      expect(result.notifications.emailDailyDigest).toBe(false)
    })

    it('throws NotFoundError if user not found', async () => {
      mocks.prisma.user.findUnique.mockResolvedValue(null)

      await expect(getUserSettings('non-existent')).rejects.toThrow('User not found')
    })
  })

  describe('updateProfile', () => {
    it('updates name and department in database', async () => {
      const updatedUser = {
        id: 'usr-123',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'STUDENT',
        department: 'Electronics',
        createdAt: new Date(),
      }
      mocks.prisma.user.update.mockResolvedValue(updatedUser)

      const result = await updateProfile('usr-123', {
        name: 'Jane Doe',
        department: 'Electronics',
      })

      expect(result.name).toBe('Jane Doe')
      expect(result.department).toBe('Electronics')
      expect(mocks.prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'usr-123' },
        data: { name: 'Jane Doe', department: 'Electronics' },
        select: expect.any(Object),
      })
    })
  })

  describe('updateNotifications', () => {
    it('updates email alert toggles', async () => {
      mocks.prisma.user.update.mockResolvedValue({
        emailInstantAlerts: false,
        emailDailyDigest: true,
      })

      const result = await updateNotifications('usr-123', {
        emailInstantAlerts: false,
        emailDailyDigest: true,
      })

      expect(result.emailInstantAlerts).toBe(false)
      expect(result.emailDailyDigest).toBe(true)
      expect(mocks.prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'usr-123' },
        data: { emailInstantAlerts: false, emailDailyDigest: true },
        select: expect.any(Object),
      })
    })
  })

  describe('revokeAllSessions', () => {
    it('calls revokeAllUserTokens', async () => {
      const result = await revokeAllSessions('usr-123')

      expect(mocks.revokeAllUserTokens).toHaveBeenCalledWith('usr-123')
      expect(result.message).toContain('signed out')
    })
  })

  describe('scanAndCropIdCard', () => {
    it('throws BadRequestError if no image is provided', async () => {
      await expect(scanAndCropIdCard({})).rejects.toThrow('No valid image provided for scanning')
    })

    it('returns cropped image response on success', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          detected: true,
          image: 'data:image/jpeg;base64,cropped123',
        }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const result = await scanAndCropIdCard({
        imageDataUrl: 'data:image/jpeg;base64,input123',
        orientation: 'vertical',
      })

      expect(result.success).toBe(true)
      expect(result.detected).toBe(true)
      expect(result.image).toBe('data:image/jpeg;base64,cropped123')
      vi.unstubAllGlobals()
    })
  })
})
