import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller';
import { authMiddleware, adminMiddleware, permissionMiddleware } from '../middleware/auth.middleware';
import { Permission } from '../types';

const router = Router();

// Only SUPER ADMIN (or users with MANAGE_EMPLOYEES permission if we want to be granular) 
// should be able to manage employees. Let's restrict this to just ADMIN or EMPLOYEE with MANAGE_EMPLOYEES
router.use(authMiddleware);
// If it's an admin, they pass. If it's an employee, they need MANAGE_EMPLOYEES
router.use(permissionMiddleware([Permission.MANAGE_EMPLOYEES]));

router.post('/', EmployeeController.createEmployee);
router.get('/', EmployeeController.getEmployees);
router.put('/:id', EmployeeController.updateEmployee);
router.delete('/:id', EmployeeController.deleteEmployee);

export default router;
