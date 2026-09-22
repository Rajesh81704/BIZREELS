const Review = require('../models/Review');
const AuditLog = require('../models/AuditLog');

/**
 * ReviewRepository
 * Handles database operations for customer and vendor reviews.
 */
class ReviewRepository {
  async createReview(reviewData) {
    return Review.create(reviewData);
  }

  async findReviewById(id) {
    return Review.findById(id).populate('author', 'name avatarUrl activeRole');
  }

  async findReviewsByTargetUser(targetUserId, { page = 1, limit = 10 } = {}) {
    const skip = (page - 1) * limit;
    const match = { targetUser: targetUserId, isDeleted: false };
    const rawReviews = await Review.find(match)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('author', 'name avatarUrl activeRole')
      .lean();
    const total = await Review.countDocuments(match);
    const reviews = rawReviews.map((r) => {
      const authorObj = r.author && typeof r.author === 'object' ? r.author : null;
      const authorName = authorObj?.name || r.name || r.customer || 'Customer';
      return {
        ...r,
        author: authorObj || { name: authorName },
        user: authorObj || { name: authorName },
        reviewer: authorObj || { name: authorName },
        customer: authorName,
        name: authorName,
        userName: authorName,
      };
    });
    return { reviews, total };
  }

  async findReviewsByTargetListing(targetListingId, { page = 1, limit = 10 } = {}) {
    const skip = (page - 1) * limit;
    const match = { targetListing: targetListingId, isDeleted: false };
    const rawReviews = await Review.find(match)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('author', 'name avatarUrl activeRole')
      .lean();
    const total = await Review.countDocuments(match);
    const reviews = rawReviews.map((r) => {
      const authorObj = r.author && typeof r.author === 'object' ? r.author : null;
      const authorName = authorObj?.name || r.name || r.customer || 'Customer';
      return {
        ...r,
        author: authorObj || { name: authorName },
        user: authorObj || { name: authorName },
        reviewer: authorObj || { name: authorName },
        customer: authorName,
        name: authorName,
        userName: authorName,
      };
    });
    return { reviews, total };
  }

  async softDeleteReview(id, authorId) {
    return Review.findOneAndUpdate(
      { _id: id, author: authorId },
      { isDeleted: true, deletedAt: new Date() },
      { returnDocument: 'after' }
    );
  }

  async logReviewAction({ userId, action, entityId, description, ip, agent }) {
    try {
      await AuditLog.create({
        userId,
        action,
        entity: 'Review',
        entityId,
        description,
        ipAddress: ip,
        userAgent: agent,
      });
    } catch (err) {
      // safe bypass
    }
  }
}

module.exports = new ReviewRepository();
