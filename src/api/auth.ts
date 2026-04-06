import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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
      return res.status(403).json({ error: 'Invalid or expired token' });
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

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { 
          username, 
          passwordHash,
          // First user is automatically admin and approved
          isAdmin: isFirstUser,
          isApproved: isFirstUser
      },
    });

    res.status(201).json({ 
        message: isFirstUser ? 'Admin account created' : 'Account registered. Waiting for admin approval.', 
        userId: user.id 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
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
        { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, username: user.username, isAdmin: user.isAdmin } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
