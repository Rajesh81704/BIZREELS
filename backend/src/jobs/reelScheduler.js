const cron = require('node-cron');
const Reel = require('../models/Reel');
const logger = require('../utils/logger');

/**
 * Automatically publishes scheduled reels when their scheduled time arrives
 */
const publishScheduledReels = async () => {
  try {
    const now = new Date();

    // Find all scheduled reels where scheduledDate <= now
    const pendingReels = await Reel.find({
      status: 'scheduled',
      scheduledDate: { $lte: now },
      isDeleted: { $ne: true },
    });

    if (pendingReels.length > 0) {
      logger.info(`Scheduler found ${pendingReels.length} scheduled reels to publish.`, { service: 'reel-scheduler' });
      
      const reelIds = pendingReels.map((r) => r._id);
      
      // Update status to 'published'
      const result = await Reel.updateMany(
        { _id: { $in: reelIds } },
        { $set: { status: 'published' } }
      );

      logger.info(`Successfully published ${result.modifiedCount} scheduled reels.`, { service: 'reel-scheduler' });

      // Emitting socket updates if socket is initialized
      try {
        const { emitToAdmin, emitToAll } = require('../lib/socket');
        if (emitToAdmin) emitToAdmin('admin:update', { tags: ['Reels', 'AdminOverview'] });
        if (emitToAll) emitToAll('reel:created', { count: result.modifiedCount });
      } catch (socketErr) {
        // Socket update is optional
      }
    }
  } catch (err) {
    logger.error(`Error executing Reel Publishing Scheduler: ${err.message}`, { service: 'reel-scheduler' });
  }
};

/**
 * Automatically expires active reel boosts whose boostExpiresAt is in the past
 */
const expireBoostedReels = async () => {
  try {
    const now = new Date();

    // Find all reels whose boost duration has finished
    const expiredReels = await Reel.find({
      boostExpiresAt: { $lte: now, $ne: null },
      $or: [
        { isBoosted: true },
        { is_boosted: true },
        { boost_status: 'active' },
      ],
    }).select('_id creator boostExpiresAt').lean();

    if (expiredReels.length > 0) {
      const expiredIds = expiredReels.map((r) => r._id);
      
      const result = await Reel.updateMany(
        { _id: { $in: expiredIds } },
        {
          $set: {
            isBoosted: false,
            is_boosted: false,
            boost_status: 'expired',
          },
        }
      );

      logger.info(`[Reel Boost Scheduler] Expired ${result.modifiedCount} reel boosts past expiry date.`, { service: 'reel-scheduler' });

      // Notify owners and global sockets of boost expiration
      try {
        const { emitToUser, emitToAll } = require('../lib/socket');
        expiredReels.forEach((r) => {
          if (r.creator && emitToUser) {
            emitToUser(r.creator.toString(), 'reel:updated', {
              reelId: r._id,
              isBoosted: false,
              is_boosted: false,
              boost_status: 'expired',
            });
          }
        });
        if (emitToAll) {
          emitToAll('reel:boost_expired', { count: result.modifiedCount });
        }
      } catch (socketErr) {
        // Ignore socket warnings
      }
    }
  } catch (err) {
    logger.error(`Error executing Reel Boost Expiration Scheduler: ${err.message}`, { service: 'reel-scheduler' });
  }
};

/**
 * Initializes the background reel cron scheduler.
 * Runs once every minute.
 */
const initReelScheduler = () => {
  logger.info('Initializing background Reel Scheduler (Publishing + Boost Expiry)...', { service: 'reel-scheduler' });

  // Run initial pass immediately upon server startup
  publishScheduledReels().catch(() => {});
  expireBoostedReels().catch(() => {});

  // Cron schedule: Every minute
  cron.schedule('* * * * *', async () => {
    await publishScheduledReels();
    await expireBoostedReels();
  });
};

module.exports = {
  initReelScheduler,
  publishScheduledReels,
  expireBoostedReels,
};
