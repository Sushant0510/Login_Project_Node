import { Router } from 'express';
import { body } from 'express-validator';
import { login, register } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();

router.post(
  '/register',
  [
    body('username')
      .exists({ checkFalsy: true })
      .withMessage('Mobile number is required')
      .isLength({ min: 10, max: 15 })
      .withMessage('Mobile number must be between 10 to 15 digits')
      .matches(/^[0-9]+$/)
      .withMessage('Mobile number must contain only numbers'),
    body('password')
      .exists({ checkFalsy: true })
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('email')
      .optional({ checkFalsy: true, nullable: true })
      .isEmail()
      .withMessage('Please provide a valid email'),
  ],
  validateRequest,
  register
);

router.post(
  '/login',
  [
    body('username')
      .exists({ checkFalsy: true })
      .withMessage('Mobile number is required')
      .isLength({ min: 10, max: 15 })
      .withMessage('Mobile number must be between 10 to 15 digits')
      .matches(/^[0-9]+$/)
      .withMessage('Mobile number must contain only numbers'),
    body('password')
      .exists({ checkFalsy: true })
      .withMessage('Password is required'),
  ],
  validateRequest,
  login
);

export default router;
