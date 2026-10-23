import { Router } from 'express'
import * as controller from './user.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { uploadIdCardPair, uploadSingleCardScan } from '../../middleware/upload.js'
import {
  updateNotificationsSchema,
  updateProfileSchema,
  uploadIdCardSchema,
} from './user.schema.js'

const router = Router()

// All user settings endpoints require authentication
router.use(authenticate)

router.get('/profile', asyncHandler(controller.getProfile))
router.put('/profile', validate({ body: updateProfileSchema }), asyncHandler(controller.updateProfile))
router.put('/notifications', validate({ body: updateNotificationsSchema }), asyncHandler(controller.updateNotifications))
router.post('/revoke-sessions', asyncHandler(controller.revokeSessions))
router.post(
  '/id-card/scan-crop',
  uploadSingleCardScan,
  asyncHandler(controller.scanAndCropCard)
)
router.post(
  '/id-card',
  uploadIdCardPair,
  validate({ body: uploadIdCardSchema }),
  asyncHandler(controller.uploadIdCard)
)

export default router
