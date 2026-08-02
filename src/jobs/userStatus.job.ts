import cron from 'node-cron';
import User from '../models/User';
import logger from '../utils/logger';
import { UserRole } from '../types';

// Run every day at midnight
export const startUserStatusJob = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('Running inactive user check job...');
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const result = await User.updateMany(
        {
          isActive: true,
          lastLoginAt: { $lt: sixMonthsAgo },
          role: UserRole.USER // Only affect regular users, maybe not admins
        },
        { $set: { isActive: false } }
      );

      if (result.modifiedCount > 0) {
        logger.info(`Successfully marked ${result.modifiedCount} users as inactive due to 6 months of inactivity.`);
      } else {
        logger.info('No users marked as inactive today.');
      }
    } catch (error) {
      logger.error('Error running inactive user check job:', error);
    }
  });
};
