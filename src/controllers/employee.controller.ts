import { Request, Response } from 'express';
import User from '../models/User';
import { UserRole, Permission } from '../types';
import logger from '../utils/logger';
import { sendEmployeeWelcomeEmail } from '../utils/mailer';
import crypto from 'crypto';

export class EmployeeController {
  // Create a new employee
  static async createEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { firstName, lastName, email, phone, permissions, isActive, profilePic, designation, department } = req.body;

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
        role: UserRole.EMPLOYEE,
        permissions: permissions || [],
        isActive: isActive !== undefined ? isActive : true,
        profilePic,
        designation,
        department,
      });

      // Send welcome email with password
      await sendEmployeeWelcomeEmail(email, firstName, plainPassword);

      res.status(201).json({
        success: true,
        message: 'Employee created successfully and email sent',
        data: {
          id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          phone: employee.phone,
          permissions: employee.permissions,
          isActive: employee.isActive,
          profilePic: employee.profilePic,
          designation: employee.designation,
          department: employee.department,
        },
      });
    } catch (error: any) {
      logger.error(`Create Employee Error: ${error.message}`);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get all employees
  static async getEmployees(req: Request, res: Response): Promise<void> {
    try {
      const employees = await User.find({ role: UserRole.EMPLOYEE }).select('-password -__v');
      res.status(200).json({ success: true, data: employees });
    } catch (error: any) {
      logger.error(`Get Employees Error: ${error.message}`);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Update employee
  static async updateEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { firstName, lastName, phone, permissions, isActive, profilePic, designation, department } = req.body;

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
        { _id: id, role: UserRole.EMPLOYEE },
        updateData,
        { new: true, runValidators: true }
      ).select('-password -__v');

      if (!employee) {
        res.status(404).json({ success: false, message: 'Employee not found' });
        return;
      }

      res.status(200).json({ success: true, message: 'Employee updated successfully', data: employee });
    } catch (error: any) {
      logger.error(`Update Employee Error: ${error.message}`);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Delete/Deactivate employee
  static async deleteEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const employee = await User.findOneAndDelete({ _id: id, role: UserRole.EMPLOYEE });

      if (!employee) {
        res.status(404).json({ success: false, message: 'Employee not found' });
        return;
      }

      res.status(200).json({ success: true, message: 'Employee deleted successfully' });
    } catch (error: any) {
      logger.error(`Delete Employee Error: ${error.message}`);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}
