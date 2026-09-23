const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const AuditLog = require('../models/AuditLog');

function calculateDistanceInMeters(coords1, coords2) {
  if (!Array.isArray(coords1) || coords1.length < 2 || !Array.isArray(coords2) || coords2.length < 2) {
    return null;
  }
  const lng1 = parseFloat(coords1[0]);
  const lat1 = parseFloat(coords1[1]);
  const lng2 = parseFloat(coords2[0]);
  const lat2 = parseFloat(coords2[1]);
  
  if (isNaN(lng1) || isNaN(lat1) || isNaN(lng2) || isNaN(lat2)) return null;
  if (lng1 === 0 && lat1 === 0) return null;
  if (lng2 === 0 && lat2 === 0) return null;

  const R = 6371e3; // Earth radius in meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

/**
 * ListingRepository
 * Encapsulates database operations and geo-proximity search pipelines for Products/Services.
 */
class ListingRepository {
  async createListing(listingData) {
    return Listing.create(listingData);
  }

  async findListingById(id) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      const listing = await Listing.findById(id).populate('vendor', 'name avatarUrl profile_pic activeRole phone email vendorProfile location kyc_status is_subscribed_verified isPhoneVerified isVerified is_verified rating_avg rating_count');
      if (listing) return listing;
    }
    return Listing.findOne({
      $or: [{ slug: id }, { listing_id: id }],
      is_deleted: { $ne: true }
    }).populate('vendor', 'name avatarUrl profile_pic activeRole phone email vendorProfile location kyc_status is_subscribed_verified isPhoneVerified isVerified is_verified rating_avg rating_count');
  }

  async updateListing(id, vendorId, updateData) {
    return Listing.findOneAndUpdate(
      { _id: id, vendor: vendorId },
      updateData,
      { returnDocument: 'after' }
    );
  }

  async softDeleteListing(id, vendorId) {
    return Listing.findOneAndUpdate(
      { _id: id, vendor: vendorId },
      { isDeleted: true, deletedAt: new Date() },
      { returnDocument: 'after' }
    );
  }

  /**
   * Complex query support for listings with pagination and aggregation.
   */
  async queryListings({
    currentUserId,
    vendor,
    type,
    category,
    subcategory,
    minPrice,
    maxPrice,
    condition,
    status,
    rating,
    has_offer,
    shopName,
    verified,
    uploadDate,
    sort,
    coordinates,
    distanceKm,
    search,
    page = 1,
    limit = 10,
  }) {
    const skip = (page - 1) * limit;
    const match = { isDeleted: false };
    const escapeRegex = (str) => String(str).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    if (vendor) {
      if (mongoose.Types.ObjectId.isValid(vendor)) {
        match.vendor = new mongoose.Types.ObjectId(vendor);
      } else {
        match.vendor = vendor;
      }
    }

    if (type && type !== 'all') match.type = type;
    if (condition && condition !== 'all') match.condition = condition;
    if (status && status !== 'all') match.status = status;

    // Filter by offers
    if (has_offer === true || has_offer === 'true') {
      match.$and = match.$and || [];
      match.$and.push({
        $or: [
          { 'offers.0': { $exists: true } },
          { discount: { $gt: 0 } },
          { activeOffer: { $exists: true, $ne: null } }
        ]
      });
    }

    // Filter by Shop/Vendor Name
    if (shopName && shopName.trim()) {
      try {
        const User = require('../models/User');
        const shopRegex = new RegExp(escapeRegex(shopName.trim()), 'i');
        const matchedVendors = await User.find({
          $or: [
            { name: shopRegex },
            { 'vendorProfile.businessName': shopRegex },
            { 'vendorProfile.shopName': shopRegex }
          ]
        }).select('_id').lean();
        const vendorIds = matchedVendors.map(v => v._id);
        match.$and = match.$and || [];
        match.$and.push({ vendor: { $in: vendorIds } });
      } catch (err) {
        console.error('Error filtering listings by shopName:', err);
      }
    }

    // Price filters
    if (minPrice !== undefined || maxPrice !== undefined) {
      match.price = {};
      if (minPrice !== undefined) match.price.$gte = parseFloat(minPrice);
      if (maxPrice !== undefined) match.price.$lte = parseFloat(maxPrice);
    }

    // Category & Subcategory robust filter
    const hasCategory = category && category !== 'all';
    const hasSubcategory = subcategory && subcategory !== 'all';

    if (hasCategory && hasSubcategory) {
      const catRegex = new RegExp(`^${escapeRegex(category.trim())}$`, 'i');
      const subcatRegex = new RegExp(`^${escapeRegex(subcategory.trim())}$`, 'i');
      const catOr = [
        { category: catRegex, subcategory: subcatRegex },
        { subcategory: subcatRegex },
        { category: subcatRegex },
      ];
      match.$and = match.$and || [];
      match.$and.push({ $or: catOr });
    } else if (hasCategory) {
      const catTrimmed = category.trim();
      const catRegex = new RegExp(`^${escapeRegex(catTrimmed)}$`, 'i');
      const partialRegex = new RegExp(escapeRegex(catTrimmed), 'i');
      const catOr = [
        { category: catRegex },
        { subcategory: catRegex },
        { category: partialRegex },
        { subcategory: partialRegex },
      ];
      match.$and = match.$and || [];
      match.$and.push({ $or: catOr });
    } else if (hasSubcategory) {
      const subcatTrimmed = subcategory.trim();
      const subcatRegex = new RegExp(`^${escapeRegex(subcatTrimmed)}$`, 'i');
      const partialSubcatRegex = new RegExp(escapeRegex(subcatTrimmed), 'i');
      const subcatOr = [
        { subcategory: subcatRegex },
        { category: subcatRegex },
        { subcategory: partialSubcatRegex },
      ];
      match.$and = match.$and || [];
      match.$and.push({ $or: subcatOr });
    }

    // Rating filter
    if (rating !== undefined && parseFloat(rating) > 0) {
      const ratingVal = parseFloat(rating);
      const ratingOr = [
        { rating: { $gte: ratingVal } },
        { rating_avg: { $gte: ratingVal } },
      ];
      match.$and = match.$and || [];
      match.$and.push({ $or: ratingOr });
    }

    // Upload Date filter
    if (uploadDate && uploadDate !== 'all') {
      const now = new Date();
      if (uploadDate === 'today') {
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        match.createdAt = { $gte: startOfDay };
      } else if (uploadDate === 'this_week') {
        const pastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        match.createdAt = { $gte: pastWeek };
      } else if (uploadDate === 'this_month') {
        const pastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        match.createdAt = { $gte: pastMonth };
      }
    }

    // Multi-Word Tokenized Search query match
    if (search && search.trim()) {
      const tokens = search.trim().split(/\s+/).filter(Boolean);

      const buildTokenOr = (token) => {
        const tokenRegex = new RegExp(escapeRegex(token), 'i');
        return [
          { title: tokenRegex },
          { description: tokenRegex },
          { shortDescription: tokenRegex },
          { category: tokenRegex },
          { subcategory: tokenRegex },
          { brand: tokenRegex },
          { sku: tokenRegex },
          { tags: tokenRegex },
          { 'labels.key': tokenRegex },
          { 'labels.value': tokenRegex },
          { 'variants.name': tokenRegex },
          { 'variants.sku': tokenRegex }
        ];
      };

      match.$and = match.$and || [];
      if (tokens.length > 1) {
        tokens.forEach(token => {
          match.$and.push({ $or: buildTokenOr(token) });
        });
      } else if (tokens.length === 1) {
        match.$and.push({ $or: buildTokenOr(tokens[0]) });
      }
    }

    const pipeline = [];

    // Geolocation filter ONLY when distanceKm is specified and > 0, and coordinates are valid
    const hasCoordinates = coordinates && coordinates.length === 2 && (parseFloat(coordinates[0]) !== 0 || parseFloat(coordinates[1]) !== 0);
    const hasDistanceLimit = distanceKm !== undefined && distanceKm !== null && parseFloat(distanceKm) > 0;

    if (hasCoordinates && hasDistanceLimit) {
      const geoNear = {
        near: { type: 'Point', coordinates: [parseFloat(coordinates[0]), parseFloat(coordinates[1])] },
        distanceField: 'distance',
        query: match,
        spherical: true,
        maxDistance: parseFloat(distanceKm) * 1000, // convert to meters
      };
      pipeline.push({
        $geoNear: geoNear,
      });
    } else {
      pipeline.push({ $match: match });
    }

    // Dynamic Relevance score calculation
    if (search && search.trim()) {
      const cleanSearch = escapeRegex(search.trim());
      const tokens = search.trim().split(/\s+/).filter(Boolean);

      const scoreExpressions = [
        // 1. Exact title match (case-insensitive) -> 1000 points
        {
          $cond: [
            { $eq: [{ $toLower: '$title' }, search.trim().toLowerCase()] },
            1000,
            0
          ]
        },
        // 2. Title partial match with full search phrase -> 500 points
        {
          $cond: [
            { $regexMatch: { input: '$title', regex: cleanSearch, options: 'i' } },
            500,
            0
          ]
        },
        // 3. Category/brand match -> 300 points
        {
          $cond: [
            {
              $or: [
                { $regexMatch: { input: { $ifNull: ['$category', ''] }, regex: cleanSearch, options: 'i' } },
                { $regexMatch: { input: { $ifNull: ['$subcategory', ''] }, regex: cleanSearch, options: 'i' } },
                { $regexMatch: { input: { $ifNull: ['$brand', ''] }, regex: cleanSearch, options: 'i' } }
              ]
            },
            300,
            0
          ]
        },
        // 4. Description match -> 200 points
        {
          $cond: [
            { $regexMatch: { input: { $ifNull: ['$description', ''] }, regex: cleanSearch, options: 'i' } },
            200,
            0
          ]
        }
      ];

      // Add points for each individual token matching title (150 pts) or brand/tags (75 pts)
      tokens.forEach(tok => {
        const cleanTok = escapeRegex(tok);
        scoreExpressions.push({
          $cond: [
            { $regexMatch: { input: '$title', regex: cleanTok, options: 'i' } },
            150,
            0
          ]
        });
        scoreExpressions.push({
          $cond: [
            { $regexMatch: { input: { $ifNull: ['$brand', ''] }, regex: cleanTok, options: 'i' } },
            75,
            0
          ]
        });
      });

      pipeline.push({
        $addFields: {
          relevanceScore: {
            $add: scoreExpressions
          }
        }
      });
    }

    // Personalization sorting: followedVendor desc, user interests match
    let followedIds = [];
    let interestCond = 0;
    if (currentUserId) {
      try {
        const followService = require('../services/follow.service');
        const ids = await followService.followingIds(currentUserId);
        followedIds = ids.map(id => new mongoose.Types.ObjectId(id));
      } catch (err) {
        console.error('Error fetching followed IDs for listing feed:', err);
      }
      try {
        const User = require('../models/User');
        const user = await User.findById(currentUserId).select('customerProfile.interests').lean();
        if (user && user.customerProfile && Array.isArray(user.customerProfile.interests) && user.customerProfile.interests.length > 0) {
          const orConditions = user.customerProfile.interests.map(i => {
            if (!i.subcategory) {
              return { $eq: ['$category', i.category] };
            } else {
              return {
                $and: [
                  { $eq: ['$category', i.category] },
                  { $eq: ['$subcategory', i.subcategory] }
                ]
              };
            }
          });
          interestCond = {
            $cond: [{ $or: orConditions }, 1, 0]
          };
        }
      } catch (err) {
        console.error('Error fetching user interests for listing feed:', err);
      }
    }

    if (currentUserId) {
      pipeline.push({
        $addFields: {
          followedVendor: {
            $cond: [{ $in: ['$vendor', followedIds] }, 1, 0]
          },
          interestMatch: interestCond
        }
      });

      const sortSpec = {};
      if (sort === 'price_low') {
        sortSpec.price = 1;
      } else if (sort === 'price_high') {
        sortSpec.price = -1;
      } else if (sort === 'rating_high') {
        sortSpec.rating = -1;
        sortSpec.rating_avg = -1;
      } else if (sort === 'popular') {
        sortSpec.viewsCount = -1;
        sortSpec.likesCount = -1;
      } else if (search) {
        sortSpec.relevanceScore = -1;
      }
      if (currentUserId) {
        sortSpec.followedVendor = -1;
        sortSpec.interestMatch = -1;
      }
      if (hasCoordinates && sort === 'nearest') {
        sortSpec.distance = 1;
      }
      sortSpec.isBoosted = -1;
      sortSpec.createdAt = -1;

      pipeline.push({ $sort: sortSpec });
    } else {
      const sortSpec = {};
      if (sort === 'price_low') {
        sortSpec.price = 1;
      } else if (sort === 'price_high') {
        sortSpec.price = -1;
      } else if (sort === 'rating_high') {
        sortSpec.rating = -1;
        sortSpec.rating_avg = -1;
      } else if (sort === 'popular') {
        sortSpec.viewsCount = -1;
        sortSpec.likesCount = -1;
      } else if (search) {
        sortSpec.relevanceScore = -1;
      }
      if (hasCoordinates && sort === 'nearest') {
        sortSpec.distance = 1;
      }
      sortSpec.isBoosted = -1;
      sortSpec.createdAt = -1;

      pipeline.push({ $sort: sortSpec });
    }

    // Pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit, 10) });

    // Populate Vendor details
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'vendor',
        foreignField: '_id',
        as: 'vendorDetails',
      },
    });

    pipeline.push({
      $unwind: {
        path: '$vendorDetails',
        preserveNullAndEmptyArrays: true,
      },
    });

    // Project output fields
    pipeline.push({
      $project: {
        type: 1,
        title: 1,
        shortDescription: 1,
        description: 1,
        category: 1,
        subcategory: 1,
        price: 1,
        salePrice: 1,
        actualPrice: 1,
        sellingPrice: 1,
        stock: 1,
        discount: 1,
        condition: 1,
        status: { $ifNull: ['$status', 'published'] },
        labels: 1,
        offers: 1,
        serviceDetails: 1,
        images: 1,
        videos: 1,
        variants: 1,
        serviceAvailability: 1,
        location: 1,
        rating: 1,
        totalReviews: 1,
        isBoosted: 1,
        distance: 1,
        createdAt: 1,
        sku: 1,
        brand: 1,
        unit: 1,
        minOrderQty: 1,
        warranty: 1,
        returnPolicy: 1,
        shippingDetails: 1,
        gst: 1,
        tags: 1,
        views: { $ifNull: ['$views', 0] },
        likes: { $ifNull: ['$likes', '$likes_count', 0] },
        likes_count: { $ifNull: ['$likes_count', '$likes', 0] },
        saves_count: { $ifNull: ['$saves_count', 0] },
        orders_count: { $ifNull: ['$orders_count', 0] },
        vendor: {
          _id: { $ifNull: ['$vendorDetails._id', '$vendor'] },
          name: { $ifNull: ['$vendorDetails.name', '$vendorDetails.vendorProfile.businessName', 'Verified Vendor'] },
          avatarUrl: { $ifNull: ['$vendorDetails.avatarUrl', ''] },
          profile_pic: { $ifNull: ['$vendorDetails.profile_pic', ''] },
          phone: { $ifNull: ['$vendorDetails.phone', ''] },
          kyc_status: { $ifNull: ['$vendorDetails.kyc_status', 'approved'] },
          is_subscribed_verified: { $ifNull: ['$vendorDetails.is_subscribed_verified', true] },
          isVerified: { $ifNull: ['$vendorDetails.isVerified', '$vendorDetails.is_verified', '$vendorDetails.vendorProfile.isVerified', true] },
          is_verified: { $ifNull: ['$vendorDetails.is_verified', true] },
          isPhoneVerified: { $ifNull: ['$vendorDetails.isPhoneVerified', true] },
          vendorProfile: { $ifNull: ['$vendorDetails.vendorProfile', {}] },
          businessName: { $ifNull: ['$vendorDetails.vendorProfile.businessName', '$vendorDetails.name', 'BizReels Merchant'] },
          rating: { $ifNull: ['$vendorDetails.vendorProfile.rating', 4.8] },
          offers: { $ifNull: ['$vendorDetails.vendorProfile.offers', []] },
          location: { $ifNull: ['$vendorDetails.location', '$location'] },
          city: { $ifNull: ['$vendorDetails.location.city', '$vendorDetails.city', '$location.city', ''] },
          pincode: { $ifNull: ['$vendorDetails.location.pincode', '$vendorDetails.vendorProfile.pincode', '$location.pincode', ''] },
          address: { $ifNull: ['$vendorDetails.location.address', '$vendorDetails.vendorProfile.address', '$location.address', ''] },
        },
      },
    });

    const limitNum = parseInt(limit, 10) || 10;
    const pageNum = parseInt(page, 10) || 1;

    const [listings, rawCount] = await Promise.all([
      Listing.aggregate(pipeline),
      pageNum > 1 ? Listing.countDocuments(match) : Promise.resolve(null),
    ]);

    // Calculate/override distance based on vendor's actual profile location coordinates
    if (coordinates && coordinates.length === 2 && (parseFloat(coordinates[0]) !== 0 || parseFloat(coordinates[1]) !== 0)) {
      listings.forEach(listing => {
        const vendorCoords = listing.vendor?.location?.coordinates;
        if (vendorCoords && vendorCoords.length === 2) {
          const dist = calculateDistanceInMeters(coordinates, vendorCoords);
          if (dist !== null) {
            listing.distance = dist;
          } else {
            listing.distance = undefined;
          }
        } else {
          listing.distance = undefined;
        }
      });
    } else {
      listings.forEach(listing => {
        listing.distance = undefined;
      });
    }

    let total = rawCount;
    if (pageNum === 1) {
      if (listings.length < limitNum) {
        total = listings.length;
      } else {
        total = await Listing.countDocuments(match);
      }
    }

    // Populate user interaction state (likes, saves)
    if (currentUserId && listings.length > 0) {
      try {
        const interactionService = require('../services/interaction.service');
        const listingIds = listings.map(l => l._id?.toString() || l.id).filter(Boolean);
        const state = await interactionService.userInteractionState(currentUserId, listingIds);
        for (const l of listings) {
          const lid = l._id?.toString() || l.id;
          const s = state[lid] || { liked: false, saved: false };
          l.viewer_state = s;
          l.isLiked = Boolean(s.liked);
          l.is_liked = Boolean(s.liked);
          l.hasLiked = Boolean(s.liked);
          l.isSaved = Boolean(s.saved);
          l.is_saved = Boolean(s.saved);
          l.hasSaved = Boolean(s.saved);
        }
      } catch (err) {
        console.error('Error populating user interaction state for listings:', err);
      }
    } else {
      for (const l of listings) {
        l.viewer_state = { liked: false, saved: false };
        l.isLiked = false;
        l.is_liked = false;
        l.hasLiked = false;
        l.isSaved = false;
        l.is_saved = false;
        l.hasSaved = false;
      }
    }

    return { listings, total };
  }

  async logListingAction({ userId, action, entityId, description, ip, agent }) {
    try {
      await AuditLog.create({
        userId,
        action,
        entity: 'Listing',
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

module.exports = new ListingRepository();