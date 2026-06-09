import { Router } from 'express';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import categoryRoutes from './category.routes';
import productRoutes from './product.routes';
import testRoutes from './test.routes';
import laboratoryRoutes from './laboratory.routes';
import bookingRoutes from './booking.routes';
import uploadRoutes from './upload.routes';
import paymentRoutes from './payment.routes';
import labPortalRoutes from './lab-portal.routes';
import reviewRoutes from './review.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/lab-portal', labPortalRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/tests', testRoutes);
router.use('/labs', laboratoryRoutes);
router.use('/bookings', bookingRoutes);
router.use('/booking', bookingRoutes); // To satisfy the GET /booking/:id request if they strictly use the singular path as well
router.use('/upload', uploadRoutes);
router.use('/payment', paymentRoutes);
router.use('/reviews', reviewRoutes);

export default router;
