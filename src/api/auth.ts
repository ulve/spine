import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import prisma from '../db.js';
import { getRequiredEnv } from '../config.js';

const router = Router();
const JWT_SECRET = getRequiredEnv('JWT_SECRET');

type AuthenticatedUser = {
  userId: string;
  username: string;
  isAdmin: boolean;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

// Middleware to protect routes
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(403).json({ error: 'Invalid token' });
    }
    (req as AuthenticatedRequest).user = user as AuthenticatedUser;
    next();
  });
};

export const attachOptionalUser = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) {
      (req as AuthenticatedRequest).user = user as AuthenticatedUser;
    }
    next();
  });
};

// Middleware to check for Admin
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user || !user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Use a transaction so that the first-user check and creation are atomic
    const user = await prisma.$transaction(async (tx) => {
      const count = await tx.user.count();
      const isFirstUser = count === 0;
      return tx.user.create({
        data: {
          username,
          passwordHash,
          isAdmin: isFirstUser,
          isApproved: isFirstUser,
        },
      });
    });

    const isAdmin = user.isAdmin;
    res.status(201).json({
      message: isAdmin ? 'Admin account created' : 'Account registered. Waiting for admin approval.',
      userId: user.id,
    });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2002') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (!user.isApproved) {
        return res.status(403).json({ error: 'Your account is pending approval' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
        { userId: user.id, username: user.username, isAdmin: user.isAdmin }, 
        JWT_SECRET, 
        { expiresIn: '30d' }
    );
    res.json({ token, user: { id: user.id, username: user.username, isAdmin: user.isAdmin } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/refresh — issue a new token using an existing valid one
router.post('/refresh', authenticateToken, (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const token = jwt.sign(
    { userId: user.userId, username: user.username, isAdmin: user.isAdmin },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
  res.json({ token });
});

export default router;
