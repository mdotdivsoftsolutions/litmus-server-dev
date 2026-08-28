import { Router } from 'express';
import { LabEmployeeController } from '../controllers/labEmployee.controller';
import { authMiddleware, permissionMiddleware } from '../middleware/auth.middleware';
import { Permission } from '../types';

const router = Router();

// Lab employees routes are accessible by Lab Owners, and LAB_EMPLOYEES with MANAGE_LAB_EMPLOYEES permission
router.use(authMiddleware);

// Only Lab Owners or Lab Employees with MANAGE_LAB_EMPLOYEES can manage employees
// Using permissionMiddleware alone handles this (since LAB and ADMIN get passed through automatically, and LAB_EMPLOYEE needs the specific permission)
router.use(permissionMiddleware([Permission.MANAGE_LAB_EMPLOYEES]));

router.post('/', LabEmployeeController.createEmployee);
router.get('/', LabEmployeeController.getEmployees);
router.put('/:id', LabEmployeeController.updateEmployee);
router.delete('/:id', LabEmployeeController.deleteEmployee);

export default router;
