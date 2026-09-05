import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AppError } from '../lib/errors';
import { UserRole, CustomerTier } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'dealflow360-development-secret';

export const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(UserRole),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const portalMagicLinkSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const signup = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role } = signupSchema.parse(req.body);

  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    throw new AppError('Email already registered', 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    token,
    user,
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    res.status(401).json({
      error: {
        message: 'Invalid credentials',
        statusCode: 401,
      },
    });
    return;
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);

  if (!isValidPassword) {
    res.status(401).json({
      error: {
        message: 'Invalid credentials',
        statusCode: 401,
      },
    });
    return;
  }

  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(200).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
};

export const portalMagicLink = async (req: Request, res: Response): Promise<void> => {
  const { email } = portalMagicLinkSchema.parse(req.body);

  // Look up or create Customer if not exists
  let customer = await prisma.customer.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!customer) {
    const derivedName = email.split('@')[0].replace(/[._-]/g, ' ');
    customer = await prisma.customer.create({
      data: {
        email: email.toLowerCase(),
        name: derivedName.charAt(0).toUpperCase() + derivedName.slice(1),
        tier: CustomerTier.BRONZE,
      },
    });
  }

  // Generate 1-hour portal JWT
  // NOTE: Simulated for hackathon demo purposes. In production this token would be emailed as a link.
  const magicLinkToken = jwt.sign(
    {
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
      type: 'portal',
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.status(200).json({
    magicLinkToken,
  });
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({ user });
};
