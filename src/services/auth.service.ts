import jwt from 'jsonwebtoken';
import User from '../models/User';
import OTP from '../models/OTP';
import { RegisterInput, LoginInput, ResetPasswordInput, VerifyOtpInput } from '../validators/auth.validator';
import { IUser, JwtPayload } from '../types';
import { sendOtpEmail } from '../utils/mailer';

export class AuthService {
  static generateTokens(user: IUser) {
    const payload: JwtPayload = { 
      id: user._id.toString(), 
      role: user.role, 
      permissions: user.permissions,
      labId: user.labId ? user.labId.toString() : undefined
    };
    
    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, {
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any,
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, {
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
    });

    return { accessToken, refreshToken };
  }

  static async checkAvailability(email?: string, phone?: string) {
    if (email && email.trim()) {
      const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingEmail) {
        return { available: false, field: 'email', message: 'Email is already registered. Please login instead.' };
      }
    }

    if (phone && phone.trim()) {
      const existingPhone = await User.findOne({ phone: phone.trim() });
      if (existingPhone) {
        return { available: false, field: 'phone', message: 'Mobile number is already registered. Please use a different number.' };
      }
    }

    return { available: true, message: 'Available' };
  }

  static async sendOtp(email: string, phone?: string) {
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      throw new Error('Email is already registered. Please login instead.');
    }

    if (phone && phone.trim()) {
      const existingPhone = await User.findOne({ phone: phone.trim() });
      if (existingPhone) {
        throw new Error('Mobile number is already registered. Please use a different number.');
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
    
    // Clear old OTPs for this email
    await OTP.deleteMany({ email: email.toLowerCase().trim() });
    
    // Save new OTP
    await OTP.create({ email: email.toLowerCase().trim(), otp });
    
    // Send email
    await sendOtpEmail(email.toLowerCase().trim(), otp);
    
    return { success: true, message: 'OTP sent successfully' };
  }

  static async register(data: RegisterInput & { otp: string }) {
    const existingUser = await User.findOne({ $or: [{ email: data.email }, { phone: data.phone }] });
    if (existingUser) {
      if (existingUser.email === data.email) {
        throw new Error('Email already registered');
      }
      if (existingUser.phone === data.phone) {
        throw new Error('Mobile number is already registered');
      }
    }

    const otpRecord = await OTP.findOne({ email: data.email, otp: data.otp });
    if (!otpRecord) {
      throw new Error('Invalid or expired OTP');
    }

    const user = await User.create(data);
    await OTP.deleteOne({ _id: otpRecord._id }); // Clear OTP after success

    const { accessToken, refreshToken } = this.generateTokens(user);

    // Don't send password back
    const userResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      labId: user.labId,
    };

    return { user: userResponse, accessToken, refreshToken };
  }

  static async login(data: LoginInput) {
    const user = await User.findOne({ email: data.email }).select('+password');
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (user.isActive === false) {
      throw new Error('ACCOUNT_BLOCKED');
    }

    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const { accessToken, refreshToken } = this.generateTokens(user);

    const userResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      labId: user.labId,
    };

    return { user: userResponse, accessToken, refreshToken };
  }

  static async refreshToken(token: string) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as JwtPayload;
      const user = await User.findById(decoded.id);
      
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      user.lastLoginAt = new Date();
      await user.save();

      const { accessToken, refreshToken } = this.generateTokens(user);
      return { accessToken, refreshToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  static async forgotPassword(email: string) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
    
    // Clear old OTPs for this email
    await OTP.deleteMany({ email });
    
    // Save new OTP
    await OTP.create({ email, otp });
    
    // Send email
    await sendOtpEmail(email, otp);
    
    return { success: true, message: 'Password reset OTP sent successfully' };
  }

  static async verifyOtp(data: VerifyOtpInput) {
    const user = await User.findOne({ email: data.email });
    if (!user) {
      throw new Error('User not found');
    }

    const otpRecord = await OTP.findOne({ email: data.email, otp: data.otp });
    if (!otpRecord) {
      throw new Error('Invalid or expired OTP');
    }

    return { success: true, message: 'OTP verified successfully' };
  }

  static async resetPassword(data: ResetPasswordInput) {
    const user = await User.findOne({ email: data.email });
    if (!user) {
      throw new Error('User not found');
    }

    const otpRecord = await OTP.findOne({ email: data.email, otp: data.otp });
    if (!otpRecord) {
      throw new Error('Invalid or expired OTP');
    }

    user.password = data.newPassword;
    await user.save();

    await OTP.deleteOne({ _id: otpRecord._id });

    return { success: true, message: 'Password reset successfully' };
  }
}
