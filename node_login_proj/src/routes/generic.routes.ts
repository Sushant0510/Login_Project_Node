import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { genericController, ModelName } from '../controllers/generic.controller';
import { validateRequest } from '../middleware/validate-request';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

declare global {
  namespace Express {
    interface Request {
      validatedModel?: ModelName;
    }
  }
}

const router = Router();

// List of models that should be excluded from generic routes
const EXCLUDED_MODELS = ['_prisma_migrations', '_prisma_migrations_scripts'];

// Get all model names from Prisma Client
export function getModelNames(prisma: any): string[] {
  const modelNames = Object.keys(prisma).filter(
    (key) =>
      !key.startsWith('_') &&
      !key.startsWith('$') &&
      typeof prisma[key]?.findMany === 'function' &&
      !EXCLUDED_MODELS.includes(key)
  );
  return modelNames;
}

// Middleware to check if model exists
const checkModelExists = (req: Request, res: Response, next: NextFunction) => {
  const modelName = req.params.model as string;
  if (!modelName) {
    return res.status(400).json({
      success: false,
      message: 'Model name is required',
    });
  }

  const modelNames = getModelNames(prisma);
  if (!modelNames.includes(modelName)) {
    return res.status(400).json({
      success: false,
      message: 'Model not found',
      availableModels: modelNames,
    });
  }
  
  // Add the validated model name to the request object
  req.validatedModel = modelName as ModelName;
  next();
};

// Generic CRUD routes for all models
router.get('/:model', checkModelExists, (req: Request, res: Response) => {
  if (!req.validatedModel) {
    return res.status(400).json({ error: 'Model validation failed' });
  }
  const controller = genericController(req.validatedModel);
  return controller.findAll(req, res);
});

router.get(
  '/:model/:id',
  [checkModelExists, param('id').isNumeric().withMessage('ID must be a number')],
  validateRequest,
  (req: Request, res: Response) => {
    if (!req.validatedModel) {
      return res.status(400).json({ error: 'Model validation failed' });
    }
    const controller = genericController(req.validatedModel);
    return controller.findOne(req, res);
  }
);

router.post(
  '/:model',
  [
    checkModelExists,
    body().isObject().withMessage('Request body must be a valid object'),
  ],
  validateRequest,
  (req: Request, res: Response) => {
    if (!req.validatedModel) {
      return res.status(400).json({ error: 'Model validation failed' });
    }
    const controller = genericController(req.validatedModel);
    return controller.create(req, res);
  }
);

router.put(
  '/:model/:id',
  [
    checkModelExists,
    param('id').isNumeric().withMessage('ID must be a number'),
    body().isObject().withMessage('Request body must be a valid object'),
  ],
  validateRequest,
  (req: Request, res: Response) => {
    if (!req.validatedModel) {
      return res.status(400).json({ error: 'Model validation failed' });
    }
    const controller = genericController(req.validatedModel);
    return controller.update(req, res);
  }
);

router.delete(
  '/:model/:id',
  [
    checkModelExists,
    param('id').isNumeric().withMessage('ID must be a number'),
  ],
  validateRequest,
  (req: Request, res: Response) => {
    if (!req.validatedModel) {
      return res.status(400).json({ error: 'Model validation failed' });
    }
    const controller = genericController(req.validatedModel);
    return controller.remove(req, res);
  }
);

// List all available models
router.get('/', (req: Request, res: Response) => {
  const modelNames = getModelNames(prisma);
  
  res.json({
    success: true,
    data: modelNames,
  });
});

export { router as genericRouter };
