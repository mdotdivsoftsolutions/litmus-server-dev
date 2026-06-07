import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import User from '../models/User';
import logger from '../utils/logger';

export class AuthController {
  static async sendOtp(req: Request, res: Response): Promise<void> {
    try {
      const result = await AuthService.sendOtp(req.body.email);
      res.status(200).json(result);
    } catch (error: any) {
      logger.error(`SendOTP Error: ${error.message}`);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { user, accessToken, refreshToken } = await AuthService.register(req.body);
      
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 15 * 60 * 1000, // 15 mins
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { user, accessToken },
      });
    } catch (error: any) {
      logger.error(`Register Error: ${error.message}`);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { user, accessToken, refreshToken } = await AuthService.login(req.body);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 15 * 60 * 1000, // 15 mins
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: { user, accessToken },
      });
    } catch (error: any) {
      logger.error(`Login Error: ${error.message}`);
      res.status(401).json({ success: false, message: error.message });
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie('refreshToken');
    res.clearCookie('accessToken');
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  }

  static async getMe(req: Request, res: Response): Promise<void> {
    try {
      const user = await User.findById(req.user?.id).select('-password');
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }
      res.status(200).json({ success: true, data: user });
    } catch (error: any) {
      logger.error(`GetMe Error: ${error.message}`);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      // Disallow updating sensitive fields like role or password via this endpoint
      const { role, password, email, ...updateData } = req.body;
      
      const user = await User.findByIdAndUpdate(
        req.user?.id,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      res.status(200).json({ success: true, message: 'Profile updated successfully', data: user });
    } catch (error: any) {
      logger.error(`UpdateProfile Error: ${error.message}`);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        res.status(401).json({ success: false, message: 'Refresh token not found' });
        return;
      }

      const { accessToken, refreshToken: newRefreshToken } = await AuthService.refreshToken(refreshToken);

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 15 * 60 * 1000, // 15 mins
      });

      res.status(200).json({
        success: true,
        data: { accessToken },
      });
    } catch (error: any) {
      logger.error(`RefreshToken Error: ${error.message}`);
      res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
  }
}
