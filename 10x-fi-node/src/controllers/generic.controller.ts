import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { serializeBigInts } from '../utils/bigint-serializer';

const prisma = new PrismaClient();

// Define a type that represents a Prisma model with the methods we need
type PrismaModel<T = any> = {
  findMany: (args?: any) => Promise<T[]>;
  findUnique: (args: any) => Promise<T | null>;
  create: (args: { data: any }) => Promise<T>;
  update: (args: { where: any; data: any }) => Promise<T>;
  delete: (args: { where: any }) => Promise<T>;
  count: (args?: any) => Promise<number>;
  // Add other methods as needed
};
// Get the model names from Prisma client type
export type ModelName = Exclude<
  keyof PrismaClient,
  | '$connect'
  | '$disconnect'
  | '$on'
  | '$transaction'
  | '$use'
  | '$executeRaw'
  | '$queryRaw'
  | '$executeRawUnsafe'
  | '$queryRawUnsafe'
  | '$runCommandRaw'
  | '$runCommandRawUnsafe'
  | '$extends'
>;
// Create a type-safe model getter
function getModel<T extends ModelName>(modelName: T): PrismaModel {
  return prisma[modelName] as unknown as PrismaModel;
}
export const genericController = (modelName: ModelName) => {
  const model = getModel(modelName);
  return {
    // Create a new record
    create: async (req: Request, res: Response) => {
      try {
        const record = await model.create({
          data: req.body,
        });
        // Use the BigInt serializer for create response
        const serializedRecord = serializeBigInts(record);
        res.status(201).json({
          success: true,
          data: serializedRecord,
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          message: `Error creating ${String(modelName)}`,
          error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    },
    // Get all records with pagination
    findAll: async (req: Request, res: Response) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
          model.findMany({
            skip,
            take: limit,
          }),
          model.count(),
        ]);
        // Use the BigInt serializer to handle BigInt values in the response
        const serializedData = serializeBigInts(data);
        res.json({
          success: true,
          data: serializedData,
          meta: {
            total,
            page,
            limit,
            pages: Math.ceil(Number(total) / limit),
          },
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          message: `Error fetching ${String(modelName)} list`,
          error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    },

    // Get a single record by ID
    findOne: async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const record = await model.findUnique({
          where: { ID: Number(id) || id },
        });
        if (!record) {
          return res.status(404).json({
            success: false,
            message: `${String(modelName)} not found`,
          });
        }
        // Use the BigInt serializer for single record responses
        const serializedRecord = serializeBigInts(record);
        res.json({
          success: true,
          data: serializedRecord,
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          message: `Error fetching ${String(modelName)}`,
          error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    },

    // Update a record
    update: async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const record = await model.update({
          where: { id: Number(id) || id },
          data: req.body,
        });
        // Use the BigInt serializer for update response
        const serializedRecord = serializeBigInts(record);
        res.json({
          success: true,
          data: serializedRecord,
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          message: `Error updating ${String(modelName)}`,
          error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    },

    // Delete a record
    remove: async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        // @ts-ignore - Dynamic model access
        await prisma[modelName].delete({
          where: { id: Number(id) },
        });

        res.json({
          success: true,
          message: `${String(modelName)} deleted successfully`,
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          message: `Error deleting ${String(modelName)}`,
          error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }
  };
};

export default genericController;
