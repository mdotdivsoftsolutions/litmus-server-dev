import { Router } from 'express';
import authRoutes from './auth.routes';
import employeeRoutes from './employee.routes';
import labEmployeeRoutes from './labEmployee.routes';
import adminRoutes from './admin.routes';
import categoryRoutes from './category.routes';
import productRoutes from './product.routes';
import testRoutes from './test.routes';
import laboratoryRoutes from './laboratory.routes';
import bookingRoutes from './booking.routes';
import uploadRoutes from './upload.routes';
import paymentRoutes from './payment.routes';
import labPortalRoutes from './labPortal.routes';
import reviewRoutes from './review.routes';

import packageRoutes from './package.routes';
import tagRoutes from './tag.routes';
import testTypeRoutes from './testType.routes';
import logisticsRoutes from './logistics.routes';
import infrastructureRoutes from './infrastructure.routes';
import activityStatusRoutes from './activityStatus.routes';
import cartRoutes from './cart.routes';
import searchRoutes from './search.routes';
import consultationRoutes from './consultation.routes';
import optionRoutes from './systemOption.routes';
import platformSettingsRoutes from './platformSettings.routes';
import chatRoutes from './chat.routes';
import bulkImportRoutes from './bulkImport.routes';

const router = Router();


router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/lab-employees', labEmployeeRoutes);
router.use('/admin/bulk-import', bulkImportRoutes);
router.use('/admin', adminRoutes);
router.use('/lab-portal', labPortalRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/tests', testRoutes);
router.use('/labs', laboratoryRoutes);
router.use('/bookings', bookingRoutes);
router.use('/booking', bookingRoutes); // Backward compatibility alias
router.use('/upload', uploadRoutes);
router.use('/payments', paymentRoutes);
router.use('/payment', paymentRoutes); // Backward compatibility alias
router.use('/reviews', reviewRoutes);
router.use('/packages', packageRoutes);
router.use('/tags', tagRoutes);
router.use('/test-types', testTypeRoutes);
router.use('/logistics', logisticsRoutes);
router.use('/infrastructure', infrastructureRoutes);
router.use('/activity-status', activityStatusRoutes);
router.use('/cart', cartRoutes);
router.use('/search', searchRoutes);
router.use('/consultations', consultationRoutes);
router.use('/options', optionRoutes);
router.use('/settings', platformSettingsRoutes);
router.use('/chat', chatRoutes);

export default router;
