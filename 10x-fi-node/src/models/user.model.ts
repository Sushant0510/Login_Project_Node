

export interface User {
  id: number;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateUserInput =
  Omit<User, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateUserInput = Partial<CreateUserInput>;
