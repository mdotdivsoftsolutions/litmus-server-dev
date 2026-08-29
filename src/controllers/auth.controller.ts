import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import logger from '../utils/logger';

const getCookieOptions = (maxAge?: number) => {
  const isSecure = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
  const cookieDomain = process.env.COOKIE_DOMAIN || (isSecure ? '.litmuslabs.in' : undefined);

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: (isSecure ? 'lax' : 'lax') as 'lax' | 'none' | 'strict',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
};

export class AuthController {
  static async sendOtp(req: Request, res: Response): Promise<void> {
    try {
      const { email, phone } = req.body;
      const result = await AuthService.sendOtp(email, phone);
      res.status(200).json(result);
    } catch (error: any) {
      logger.error(`SendOTP Error: ${error.message}`);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async checkAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { email, phone } = req.body;
      const result = await AuthService.checkAvailability(email, phone);
      if (!result.available) {
        res.status(400).json({ success: false, message: result.message, field: result.field });
        return;
      }
      res.status(200).json({ success: true, message: 'Available' });
    } catch (error: any) {
      logger.error(`CheckAvailability Error: ${error.message}`);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const result = await AuthService.forgotPassword(req.body.email);
      res.status(200).json(result);
    } catch (error: any) {
      logger.error(`ForgotPassword Error: ${error.message}`);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async verifyOtp(req: Request, res: Response): Promise<void> {
    try {
      const result = await AuthService.verifyOtp(req.body);
      res.status(200).json(result);
    } catch (error: any) {
      logger.error(`VerifyOtp Error: ${error.message}`);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const result = await AuthService.resetPassword(req.body);
      res.status(200).json(result);
    } catch (error: any) {
      logger.error(`ResetPassword Error: ${error.message}`);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { user, accessToken, refreshToken } = await AuthService.register(req.body);

      res.cookie('refreshToken', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));
      res.cookie('accessToken', accessToken, getCookieOptions(15 * 60 * 1000));

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

      res.cookie('refreshToken', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));
      res.cookie('accessToken', accessToken, getCookieOptions(15 * 60 * 1000));

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
    res.clearCookie('refreshToken', getCookieOptions());
    res.clearCookie('accessToken', getCookieOptions());
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  }

  static async getMe(req: Request, res: Response): Promise<void> {
    try {
      const user = await AuthService.getProfile(req.user!.id);
      res.status(200).json({ success: true, data: user });
    } catch (error: any) {
      logger.error(`GetMe Error: ${error.message}`);
      const status = error.message === 'User not found' ? 404 : 500;
      res.status(status).json({ success: false, message: error.message });
    }
  }

  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = await AuthService.updateProfile(req.user!.id, req.body);
      res.status(200).json({ success: true, message: 'Profile updated successfully', data: user });
    } catch (error: any) {
      logger.error(`UpdateProfile Error: ${error.message}`);
      const status = error.message === 'User not found' ? 404 : 400;
      res.status(status).json({ success: false, message: error.message });
    }
  }

  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await AuthService.changePassword(req.user!.id, currentPassword, newPassword);
      res.status(200).json(result);
    } catch (error: any) {
      logger.error(`ChangePassword Error: ${error.message}`);
      const status = error.message === 'User not found' ? 404 : (error.message === 'Incorrect current password' ? 401 : 400);
      res.status(status).json({ success: false, message: error.message });
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

      res.cookie('refreshToken', newRefreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));
      res.cookie('accessToken', accessToken, getCookieOptions(15 * 60 * 1000));

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
