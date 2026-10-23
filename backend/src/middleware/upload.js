import multer from 'multer'
import { BadRequestError } from '../utils/ApiError.js'

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new BadRequestError('Only JPEG, PNG, and WebP images are allowed'))
    }

    cb(null, true)
  },
})

export const uploadImage = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (!err) {
      return next()
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new BadRequestError('Image must be 5MB or smaller'))
      }

      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new BadRequestError('Only one image file is allowed'))
      }
    }

    next(err)
  })
}

const uploadIdCardPairMulter = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 2,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new BadRequestError('Only JPEG, PNG, and WebP images are allowed'))
    }
    cb(null, true)
  },
})

export const uploadIdCardPair = (req, res, next) => {
  if (req.is('application/json')) {
    return next()
  }

  uploadIdCardPairMulter.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 },
  ])(req, res, (err) => {
    if (!err) {
      return next()
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new BadRequestError('Each ID card image must be 10MB or smaller'))
      }
      return next(new BadRequestError(`Upload error: ${err.message}`))
    }

    next(err)
  })
}

