import { Router } from 'express';
import { body } from 'express-validator';
import { login, register, verifyPin } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();

// Common validation rules
const usernameValidation = [
  body('username')
    .exists({ checkFalsy: true })
    .withMessage('Mobile number is required')
    .isLength({ min: 10, max: 15 })
    .withMessage('Mobile number must be between 10 to 15 digits')
    .matches(/^[0-9]+$/)
    .withMessage('Mobile number must contain only numbers'),
];

const passwordValidation = [
  body('password')
    .exists({ checkFalsy: true })
    .withMessage('Password is required'),
];

const passwordWithLengthValidation = [
  body('password')
    .exists({ checkFalsy: true })
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

const emailValidation = [
  body('email')
    .optional({ checkFalsy: true, nullable: true })
    .isEmail()
    .withMessage('Please provide a valid email'),
];

const pinValidation = [
  body('pin')
    .exists({ checkFalsy: true })
    .withMessage('PIN is required')
    .isLength({ min: 4, max: 9 })
    .withMessage('PIN must be between 4 to 9 characters')
    .matches(/^[0-9]+$/)
    .withMessage('PIN must contain only numbers'),
];

// Routes
router.post(
  '/register',
  [...usernameValidation, ...passwordWithLengthValidation, ...emailValidation],
  validateRequest,
  register
);

router.post(
  '/login',
  [...usernameValidation, ...passwordValidation],
  validateRequest,
  login
);

router.post(
  '/verify-pin',
  [...usernameValidation, ...pinValidation],
  validateRequest,
  verifyPin
);

export default router;
