import express from 'express';
import { verifyToken } from '../config/jwt.js';

export const protect =  async(req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = await verifyToken(token);
      req.user = decoded.id; // Add the decoded user ID to the request object
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed', error });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export default protect;
