import { Request, Response } from 'express';
import User from '../models/User';
import Laboratory from '../models/Laboratory';
import { UserRole, Permission } from '../types';
import logger from '../utils/logger';
import { sendEmployeeWelcomeEmail } from '../utils/mailer';
import crypto from 'crypto';

export class LabEmployeeController {
  // Helper to get labId based on user role (LAB owner vs LAB_EMPLOYEE)
  private static async getLabIdForUser(userId: string, role: string, userLabId?: string): Promise<string | null> {
    if (role === UserRole.LAB) {
      const lab = await Laboratory.findOne({ userId });
      return lab ? lab._id.toString() : null;
    }
    return userLabId ? userLabId.toString() : null;
  }

  // Create a new lab employee
  static async createEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { firstName, lastName, email, phone, permissions, isActive, profilePic, designation, department } = req.body;
      const creatorId = req.user!.id;
      const creatorRole = req.user!.role;
      const creatorLabId = (req.user as any).labId;

      const labIdStr = await LabEmployeeController.getLabIdForUser(creatorId, creatorRole, creatorLabId as string);
      if (!labIdStr) {
        res.status(404).json({ success: false, message: 'Laboratory not found for this user' });
        return;
      }

      // Check if user already exists
      const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
      if (existingUser) {
        res.status(400).json({ success: false, message: 'User with this email or phone already exists' });
        return;
      }

      // Generate a random password
      const plainPassword = crypto.randomBytes(4).toString('hex');

      const employee = await User.create({
        firstName,
        lastName,
        email,
        phone,
        password: plainPassword,
        role: UserRole.LAB_EMPLOYEE,
        labId: labIdStr,
        permissions: permissions || [],
        isActive: isActive !== undefined ? isActive : true,
        profilePic,
        designation,
        department,
      });

      // Get Lab name for the email
      const lab = await Laboratory.findById(labIdStr);
      const portalName = lab ? `${lab.labName} Portal` : 'Lab Portal';

      // Send welcome email with password
      await sendEmployeeWelcomeEmail(email, firstName, plainPassword, portalName);

      res.status(201).json({
        success: true,
        message: 'Lab Employee created successfully and email sent',
        data: {
          id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          phone: employee.phone,
          permissions: employee.permissions,
          labId: employee.labId,
          isActive: employee.isActive,
          profilePic: employee.profilePic,
          designation: employee.designation,
          department: employee.department,
        },
      });
    } catch (error: any) {
      logger.error(`Create Lab Employee Error: ${error.message}`);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get all lab employees for the current lab
  static async getEmployees(req: Request, res: Response): Promise<void> {
    try {
      const creatorId = req.user!.id;
      const creatorRole = req.user!.role;
      const creatorLabId = (req.user as any).labId;

      const labIdStr = await LabEmployeeController.getLabIdForUser(creatorId, creatorRole, creatorLabId as string);
      if (!labIdStr) {
        res.status(404).json({ success: false, message: 'Laboratory not found for this user' });
        return;
      }

      const employees = await User.find({ role: UserRole.LAB_EMPLOYEE, labId: labIdStr }).select('-password -__v');
      res.status(200).json({ success: true, data: employees });
    } catch (error: any) {
      logger.error(`Get Lab Employees Error: ${error.message}`);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Update lab employee
  static async updateEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { firstName, lastName, phone, permissions, isActive, profilePic, designation, department } = req.body;
      
      const creatorId = req.user!.id;
      const creatorRole = req.user!.role;
      const creatorLabId = (req.user as any).labId;

      const labIdStr = await LabEmployeeController.getLabIdForUser(creatorId, creatorRole, creatorLabId as string);
      if (!labIdStr) {
        res.status(404).json({ success: false, message: 'Laboratory not found for this user' });
        return;
      }

      const updateData: any = {};
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (phone) updateData.phone = phone;
      if (permissions) updateData.permissions = permissions;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (profilePic !== undefined) updateData.profilePic = profilePic;
      if (designation !== undefined) updateData.designation = designation;
      if (department !== undefined) updateData.department = department;

      const employee = await User.findOneAndUpdate(
        { _id: id, role: UserRole.LAB_EMPLOYEE, labId: labIdStr },
        updateData,
        { new: true, runValidators: true }
      ).select('-password -__v');

      if (!employee) {
        res.status(404).json({ success: false, message: 'Lab Employee not found or access denied' });
        return;
      }

      res.status(200).json({ success: true, message: 'Lab Employee updated successfully', data: employee });
    } catch (error: any) {
      logger.error(`Update Lab Employee Error: ${error.message}`);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Delete/Deactivate lab employee
  static async deleteEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const creatorId = req.user!.id;
      const creatorRole = req.user!.role;
      const creatorLabId = (req.user as any).labId;

      const labIdStr = await LabEmployeeController.getLabIdForUser(creatorId, creatorRole, creatorLabId as string);
      if (!labIdStr) {
        res.status(404).json({ success: false, message: 'Laboratory not found for this user' });
        return;
      }

      const employee = await User.findOneAndUpdate(
        { _id: id, role: UserRole.LAB_EMPLOYEE, labId: labIdStr },
        { isActive: false },
        { new: true }
      );

      if (!employee) {
        res.status(404).json({ success: false, message: 'Lab Employee not found or access denied' });
        return;
      }

      res.status(200).json({ success: true, message: 'Lab Employee deleted successfully' });
    } catch (error: any) {
      logger.error(`Delete Lab Employee Error: ${error.message}`);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}
