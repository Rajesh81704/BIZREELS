const Listing = require('../models/Listing');
const Reel = require('../models/Reel');
const Order = require('../models/Order');
const Inquiry = require('../models/Inquiry');
const Deal = require('../models/Deal');
const Follow = require('../models/Follow');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

let cachedCreditRates = null;
let lastRatesFetched = 0;
const RATES_CACHE_TTL_MS = 30000; // 30 seconds cache

/**
 * VendorController
 * Handles Vendor Portal dashboard, analytics, and boost queries.
 */
class VendorController {
  // ── Vendor Dashboard (Production-Optimized with Redis Caching & $facet) ───
  getDashboard = asyncHandler(async (req, res) => {
    const mongoose = require('mongoose');
    const cache = require('../utils/cache');
    const rawUserId = req.user?._id || req.user?.id;
    const userIdStr = rawUserId ? rawUserId.toString() : '';

    if (!userIdStr) {
      return ApiResponse.unauthorized(res, 'User identity could not be determined.');
    }

    // Fast-path: Check Redis cache first (TTL: 30s)
    const cacheKey = `cache:vendor:dashboard:${userIdStr}`;
    const cachedResponse = await cache.getCache(cacheKey).catch(() => null);
    if (cachedResponse) {
      return ApiResponse.ok(res, 'Vendor dashboard loaded (cached)', cachedResponse);
    }

    let userObjId = null;
    try {
      if (mongoose.Types.ObjectId.isValid(userIdStr)) {
        userObjId = new mongoose.Types.ObjectId(userIdStr);
      }
    } catch (e) {}

    const matchIds = userObjId ? [userObjId, userIdStr] : [userIdStr];
    const vendorMatch = { $in: matchIds };
    const userId = userObjId || userIdStr;
    const referralService = require('../services/referral.service');
    const walletService = require('../services/wallet.service');

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Run consolidated aggregations in parallel (reduced from 22 queries to 8)
    const [
      listingAgg,
      reelAgg,
      orderAgg,
      inquiryAgg,
      dealAgg,
      followAgg,
      walletInfo,
      referralInfo
    ] = await Promise.all([
      // 1. Listing Consolidation (1 query replacing 6 count queries)
      Listing.aggregate([
        { $match: { vendor: vendorMatch, isDeleted: { $ne: true } } },
        {
          $group: {
            _id: '$type',
            total: { $sum: 1 },
            recent: { $sum: { $cond: [{ $gte: ['$createdAt', thirtyDaysAgo] }, 1, 0] } },
            prev: {
              $sum: {
                $cond: [
                  { $and: [{ $gte: ['$createdAt', sixtyDaysAgo] }, { $lt: ['$createdAt', thirtyDaysAgo] }] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]).catch(() => []),

      // 2. Reel Metrics Aggregation (1 query replacing find + in-memory reduce/filter)
      Reel.aggregate([
        { $match: { creator: vendorMatch, isDeleted: { $ne: true } } },
        {
          $group: {
            _id: null,
            totalReels: { $sum: 1 },
            totalViews: { $sum: { $ifNull: ['$views', 0] } },
            recentReels: { $sum: { $cond: [{ $gte: ['$createdAt', thirtyDaysAgo] }, 1, 0] } },
            prevReels: {
              $sum: {
                $cond: [
                  { $and: [{ $gte: ['$createdAt', sixtyDaysAgo] }, { $lt: ['$createdAt', thirtyDaysAgo] }] },
                  1,
                  0
                ]
              }
            },
            reelIds: { $push: '$_id' }
          }
        }
      ]).catch(() => []),

      // 3. Order Consolidation (1 query replacing 3 count + 3 sales aggregations)
      Order.aggregate([
        { $match: { vendor: vendorMatch } },
        {
          $facet: {
            counts: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  recent: { $sum: { $cond: [{ $gte: ['$createdAt', thirtyDaysAgo] }, 1, 0] } },
                  prev: {
                    $sum: {
                      $cond: [
                        { $and: [{ $gte: ['$createdAt', sixtyDaysAgo] }, { $lt: ['$createdAt', thirtyDaysAgo] }] },
                        1,
                        0
                      ]
                    }
                  }
                }
              }
            ],
            sales: [
              {
                $match: {
                  status: { $nin: ['cancelled', 'rejected', 'refunded'] },
                  $or: [
                    { paymentStatus: 'paid' },
                    { status: { $in: ['accepted', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'completed'] } }
                  ]
                }
              },
              {
                $project: {
                  createdAt: 1,
                  netAmount: {
                    $max: [
                      0,
                      {
                        $subtract: [
                          { $ifNull: ['$itemTotal', { $multiply: [{ $ifNull: ['$price', 0] }, { $ifNull: ['$quantity', 1] }] }] },
                          { $ifNull: ['$couponDiscount', 0] }
                        ]
                      }
                    ]
                  }
                }
              },
              {
                $group: {
                  _id: null,
                  totalSales: { $sum: '$netAmount' },
                  currentSales: {
                    $sum: { $cond: [{ $gte: ['$createdAt', thirtyDaysAgo] }, '$netAmount', 0] }
                  },
                  prevSales: {
                    $sum: {
                      $cond: [
                        { $and: [{ $gte: ['$createdAt', sixtyDaysAgo] }, { $lt: ['$createdAt', thirtyDaysAgo] }] },
                        '$netAmount',
                        0
                      ]
                    }
                  }
                }
              }
            ]
          }
        }
      ]).catch(() => []),

      // 4. Inquiry Aggregation (1 query replacing 3 count queries)
      Inquiry.aggregate([
        { $match: { vendor: vendorMatch } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            recent: { $sum: { $cond: [{ $gte: ['$createdAt', thirtyDaysAgo] }, 1, 0] } },
            prev: {
              $sum: {
                $cond: [
                  { $and: [{ $gte: ['$createdAt', sixtyDaysAgo] }, { $lt: ['$createdAt', thirtyDaysAgo] }] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]).catch(() => []),

      // 5. Deal Sales Aggregation (1 query replacing 3 aggregation pipelines)
      Deal.aggregate([
        { $match: { seller_id: { $in: matchIds }, status: 'completed' } },
        {
          $project: {
            created_at: 1,
            amount: {
              $ifNull: [
                '$final_amount',
                {
                  $ifNull: [
                    '$current_offer',
                    { $divide: [{ $ifNull: ['$amount_paise', 0] }, 100] }
                  ]
                }
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$amount' },
            currentSales: {
              $sum: { $cond: [{ $gte: ['$created_at', thirtyDaysAgo] }, '$amount', 0] }
            },
            prevSales: {
              $sum: {
                $cond: [
                  { $and: [{ $gte: ['$created_at', sixtyDaysAgo] }, { $lt: ['$created_at', thirtyDaysAgo] }] },
                  '$amount',
                  0
                ]
              }
            }
          }
        }
      ]).catch(() => []),

      // 6. Follow Aggregation (1 query replacing 2 count queries)
      Follow.aggregate([
        {
          $match: {
            following_id: { $in: matchIds },
            created_at: { $gte: sixtyDaysAgo }
          }
        },
        {
          $group: {
            _id: null,
            recent: { $sum: { $cond: [{ $gte: ['$created_at', thirtyDaysAgo] }, 1, 0] } },
            prev: {
              $sum: {
                $cond: [{ $lt: ['$created_at', thirtyDaysAgo] }, 1, 0]
              }
            }
          }
        }
      ]).catch(() => []),

      // 7. Wallet & Balance resolution
      Promise.all([
        walletService.getOrCreateWallet(userId).catch(() => null),
        walletService.getRoleWallet(userId, 'vendor').catch(() => null),
        walletService.getRoleBalance(userId, 'vendor').catch(() => null),
      ]),

      // 8. Referral dashboard info
      referralService.getVendorDashboard(userId).catch(() => null)
    ]);

    // Unpack Listings metrics
    const prodStats = Array.isArray(listingAgg) ? listingAgg.find(l => l._id === 'product') : null;
    const servStats = Array.isArray(listingAgg) ? listingAgg.find(l => l._id === 'service') : null;
    const productsCount = prodStats?.total || 0;
    const recentProductsCount = prodStats?.recent || 0;
    const prevProductsCount = prodStats?.prev || 0;
    const servicesCount = servStats?.total || 0;
    const recentServicesCount = servStats?.recent || 0;
    const prevServicesCount = servStats?.prev || 0;

    // Unpack Reels metrics
    const reelData = Array.isArray(reelAgg) && reelAgg[0] ? reelAgg[0] : null;
    const totalReels = reelData?.totalReels || 0;
    const totalViews = reelData?.totalViews || 0;
    const recentReelsCount = reelData?.recentReels || 0;
    const prevReelsCount = reelData?.prevReels || 0;
    const vendorReelIds = reelData?.reelIds || [];

    // Unpack Orders & Sales metrics
    const orderFacet = Array.isArray(orderAgg) && orderAgg[0] ? orderAgg[0] : {};
    const orderCounts = Array.isArray(orderFacet.counts) && orderFacet.counts[0] ? orderFacet.counts[0] : null;
    const orderSalesData = Array.isArray(orderFacet.sales) && orderFacet.sales[0] ? orderFacet.sales[0] : null;
    const ordersCount = orderCounts?.total || 0;
    const recentOrdersCount = orderCounts?.recent || 0;
    const prevOrdersCount = orderCounts?.prev || 0;
    const orderSalesTotal = orderSalesData?.totalSales || 0;
    const currentOrderSales = orderSalesData?.currentSales || 0;
    const prevOrderSales = orderSalesData?.prevSales || 0;

    // Unpack Inquiries metrics
    const inqData = Array.isArray(inquiryAgg) && inquiryAgg[0] ? inquiryAgg[0] : null;
    const leadsCount = inqData?.total || 0;
    const recentLeadsCount = inqData?.recent || 0;
    const prevLeadsCount = inqData?.prev || 0;

    // Unpack Deals metrics
    const dealData = Array.isArray(dealAgg) && dealAgg[0] ? dealAgg[0] : null;
    const dealSalesTotal = dealData?.totalSales || 0;
    const currentDealSales = dealData?.currentSales || 0;
    const prevDealSales = dealData?.prevSales || 0;

    // Unpack Follows metrics
    const followData = Array.isArray(followAgg) && followAgg[0] ? followAgg[0] : null;
    const recentFollowersCount = followData?.recent || 0;
    const prevFollowersCount = followData?.prev || 0;
    const followers = req.user.followersCount || (req.user.followers ? req.user.followers.length : 0);

    // Unpack Wallet & Credits with clean rounding
    const roundCredit = (val) => {
      const num = Number(val || 0);
      return isNaN(num) ? 0 : Math.round(num * 100) / 100;
    };

    const [mainWallet, isoWallet, roleBalance] = Array.isArray(walletInfo) ? walletInfo : [];
    const availableCredits = roundCredit(Math.max(
      roleBalance?.balance ?? 0,
      isoWallet?.balance ?? 0,
      mainWallet?.credits ?? 0,
      req.user.walletBalance ?? 0,
      req.user.wallet_credits ?? 0
    ));
    const freeReelBoosts = mainWallet ? (mainWallet.free_reel_boosts ?? req.user.free_reel_boosts ?? 0) : (req.user.free_reel_boosts ?? 0);
    const depositedCredits = roundCredit(Math.max(
      mainWallet?.lifetime_deposited_paise ? Math.floor(mainWallet.lifetime_deposited_paise / 100) : 0,
      isoWallet?.lifetime_earned ?? 0,
      mainWallet?.lifetime_earned_credits ?? 0,
      availableCredits
    ));
    const earnedCredits = roundCredit(Math.max(
      mainWallet?.lifetime_earned_credits ?? 0,
      isoWallet?.lifetime_earned ?? 0
    ));
    const usedCreditHistory = roundCredit(Math.max(
      mainWallet?.lifetime_spent_credits ?? 0,
      isoWallet?.lifetime_spent ?? 0
    ));

    // View counts from ReelView model to determine historical views trend accurately
    let recentViews = 0;
    let prevViews = 0;
    if (vendorReelIds.length > 0) {
      const ReelView = require('../models/ReelView');
      const viewAgg = await ReelView.aggregate([
        { $match: { reel_id: { $in: vendorReelIds }, viewed_at: { $gte: sixtyDaysAgo } } },
        {
          $group: {
            _id: null,
            recent: { $sum: { $cond: [{ $gte: ['$viewed_at', thirtyDaysAgo] }, 1, 0] } },
            prev: { $sum: { $cond: [{ $lt: ['$viewed_at', thirtyDaysAgo] }, 1, 0] } }
          }
        }
      ]).catch(() => []);
      if (Array.isArray(viewAgg) && viewAgg[0]) {
        recentViews = viewAgg[0].recent || 0;
        prevViews = viewAgg[0].prev || 0;
      }
    }

    // Helper to calculate percentages trend safely
    const calculateTrend = (current, previous) => {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      const diff = current - previous;
      const pct = (diff / previous) * 100;
      return Math.round(pct);
    };

    const trendProducts = calculateTrend(recentProductsCount, prevProductsCount);
    const trendServices = calculateTrend(recentServicesCount, prevServicesCount);
    const trendReels = calculateTrend(recentReelsCount, prevReelsCount);
    const trendViews = calculateTrend(recentViews, prevViews);
    const trendFollowers = calculateTrend(recentFollowersCount, prevFollowersCount);
    const trendEnquiries = calculateTrend(recentLeadsCount, prevLeadsCount);
    const trendOrders = calculateTrend(recentOrdersCount, prevOrdersCount);

    const totalSales = orderSalesTotal + dealSalesTotal;
    const currentSales = currentOrderSales + currentDealSales;
    const previousSales = prevOrderSales + prevDealSales;
    const trendSales = calculateTrend(currentSales, previousSales);

    const { AppSettings } = require('../models/Admin');
    let creditRates = {};
    const nowMs = Date.now();
    if (cachedCreditRates && (nowMs - lastRatesFetched < RATES_CACHE_TTL_MS)) {
      creditRates = cachedCreditRates;
    } else {
      const defaultRates = {
        productListing: 1,
        reelPost: 1,
        reelBoost1Day: 2,
        reelBoostAdditional: 2,
        bidRateMultiplier: 0.002,
        bidCapCredits: 20,
        validLead: 1,
      };
      try {
        const rateSetting = await AppSettings.findOne({ key: 'credit_rates' }).lean();
        if (rateSetting && rateSetting.value) {
          creditRates = { ...defaultRates, ...rateSetting.value };
          delete creditRates.aiImage;
          delete creditRates.aiVideo30s;
          delete creditRates.aiVideo;
          const boostRate = Number(creditRates.reelBoost1Day ?? creditRates.reelBoostAdditional ?? 2.00);
          creditRates.reelBoost1Day = boostRate;
          creditRates.reelBoostAdditional = boostRate;
          creditRates.bidRateMultiplier = Number(creditRates.bidRateMultiplier || 0.002);
          creditRates.bidCapCredits = Number(creditRates.bidCapCredits || 20);
        } else {
          creditRates = defaultRates;
        }
        cachedCreditRates = creditRates;
        lastRatesFetched = nowMs;
      } catch (err) {
        logger.error('Failed to load credit rates from AppSettings:', err);
        creditRates = defaultRates;
      }
    }

    const responseData = {
      totalSales,
      totalOrders: ordersCount,
      activeListings: productsCount,
      totalProducts: productsCount,
      totalServices: servicesCount,
      totalReels,
      totalViews,
      followers,
      leadEnquiries: leadsCount,
      walletBalance: availableCredits,
      rating: req.user.rating_avg || 5.0,
      credits: {
        available: availableCredits,
        deposited: depositedCredits,
        earned: earnedCredits,
        used: usedCreditHistory,
        free_reel_boosts: freeReelBoosts,
        freeReelBoosts: freeReelBoosts,
      },
      referral: referralInfo ? {
        code: referralInfo.referral_code,
        link: referralInfo.referral_link,
        totalReferrals: referralInfo.summary.total,
        successfulReferrals: referralInfo.summary.successful,
        creditsEarned: referralInfo.summary.credits_earned
      } : null,
      creditRates,
      trends: {
        totalProducts: trendProducts,
        totalServices: trendServices,
        totalReels: trendReels,
        totalViews: trendViews,
        followers: trendFollowers,
        leadEnquiries: trendEnquiries,
        totalOrders: trendOrders,
        totalSales: trendSales
      }
    };

    // Store in Redis with a 30s TTL (fail-safe)
    cache.setCache(cacheKey, responseData, 30).catch(() => {});

    return ApiResponse.ok(res, 'Vendor dashboard metrics loaded.', responseData);
  });

  // ── Vendor Analytics ─────────────────────────────────────
  getAnalyticsOverview = asyncHandler(async (req, res) => {
    const analyticsService = require('../services/analytics.service');
    const range = req.query.range || '30d';
    const data = await analyticsService.overview(req.user._id, range);
    return ApiResponse.ok(res, 'Vendor analytics overview loaded.', data);
  });

  getAnalyticsListings = asyncHandler(async (req, res) => {
    const analyticsService = require('../services/analytics.service');
    const range = req.query.range || '30d';
    const sort = req.query.sort || 'views';
    const limit = parseInt(req.query.limit, 10) || 10;
    const data = await analyticsService.perListing(req.user._id, range, sort, limit);
    return ApiResponse.ok(res, 'Vendor analytics listings loaded.', data);
  });

  getAnalyticsTimeseries = asyncHandler(async (req, res) => {
    const analyticsService = require('../services/analytics.service');
    const range = req.query.range || '30d';
    const metric = req.query.metric || 'views';
    const data = await analyticsService.timeseries(req.user._id, range, metric);
    return ApiResponse.ok(res, 'Vendor analytics timeseries loaded.', data);
  });

  getAnalyticsBoostRoi = asyncHandler(async (req, res) => {
    const analyticsService = require('../services/analytics.service');
    const { listing_id } = req.query;
    if (!listing_id) {
      return ApiResponse.badRequest(res, 'Listing ID is required.');
    }
    const data = await analyticsService.boostRoi(req.user._id, listing_id);
    return ApiResponse.ok(res, 'Vendor analytics boost ROI loaded.', data);
  });

  simulateAnalyticsData = asyncHandler(async (req, res) => {
    const mongoose = require('mongoose');
    const userId = req.user._id;

    // Check if the vendor has any listings
    let listings = await Listing.find({ vendor: userId, isDeleted: { $ne: true } });
    if (listings.length === 0) {
      const sampleListings = [
        {
          vendor: userId,
          type: 'product',
          title: 'Premium Wireless Noise-Canceling Headphones',
          category: 'Electronics',
          price: 9999,
          status: 'published',
          isDeleted: false,
          watchers: [],
          views: 120,
          likes: 24,
          saves_count: 18,
          shares: 12,
          orders_count: 5,
          revenue: 49995,
          rating: 4.8,
          totalReviews: 3,
        },
        {
          vendor: userId,
          type: 'product',
          title: 'Classic Full-Grain Leather Wallet',
          category: 'Accessories',
          price: 1499,
          status: 'published',
          isDeleted: false,
          watchers: [],
          views: 85,
          likes: 12,
          saves_count: 9,
          shares: 4,
          orders_count: 2,
          revenue: 2998,
          rating: 4.5,
          totalReviews: 2,
        },
        {
          vendor: userId,
          type: 'service',
          title: 'Professional SEO Optimization & Content Strategy',
          category: 'Marketing',
          price: 5000,
          status: 'published',
          isDeleted: false,
          watchers: [],
          views: 64,
          likes: 8,
          saves_count: 5,
          shares: 6,
          orders_count: 1,
          revenue: 5000,
          rating: 5.0,
          totalReviews: 1,
        }
      ];
      listings = await Listing.create(sampleListings);
    }

    // Check if the vendor has any reels
    let reels = await Reel.find({ creator: userId, isDeleted: { $ne: true } });

    // Set one listing as boosted for Boost ROI demonstration
    const boostedListing = listings[0];
    if (boostedListing && !boostedListing.boost_activated_at) {
      const now = new Date();
      const activatedAt = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await Listing.updateOne(
        { _id: boostedListing._id },
        {
          $set: {
            isBoosted: true,
            boost_activated_at: activatedAt,
            boost_expires_at: expiresAt,
            boost_duration_days: 14,
          }
        }
      );
    }

    // Generate listing events
    const eventTypes = [
      { type: 'view', min: 30, max: 70 },
      { type: 'wa_click', min: 8, max: 18 },
      { type: 'chat_start', min: 4, max: 10 },
      { type: 'save', min: 10, max: 25 },
      { type: 'share', min: 3, max: 8 },
      { type: 'deal_start', min: 2, max: 5 },
      { type: 'deal_complete', min: 1, max: 3 }
    ];

    const bulkEvents = [];
    const mockUserIds = Array.from({ length: 15 }).map(() => new mongoose.Types.ObjectId().toString());

    for (const listing of listings) {
      for (const et of eventTypes) {
        const count = Math.floor(Math.random() * (et.max - et.min + 1)) + et.min;
        for (let i = 0; i < count; i++) {
          const randDaysAgo = Math.floor(Math.random() * 30);
          const eventTime = new Date(Date.now() - randDaysAgo * 24 * 60 * 60 * 1000);
          const randomUser = mockUserIds[Math.floor(Math.random() * mockUserIds.length)];

          bulkEvents.push({
            listing_id: listing._id.toString(),
            vendor_id: userId.toString(),
            event_type: et.type,
            user_id: randomUser,
            meta: {
              ipAddress: '127.0.0.1',
              device: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            },
            created_at: eventTime.toISOString()
          });
        }
      }
    }

    if (bulkEvents.length > 0) {
      const { ListingEvent } = require('../models/Misc');
      await ListingEvent.insertMany(bulkEvents);
    }

    return ApiResponse.created(res, 'Simulated traffic and listings generated successfully.', {
      listingsCreated: listings.length,
      reelsCreated: reels.length,
      eventsGenerated: bulkEvents.length
    });
  });

  getAnalytics = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const [reels, productListings, serviceListings, leadsCount] = await Promise.all([
      Reel.find({ creator: userId }).select('views').lean(),
      Listing.countDocuments({ vendor: userId, type: 'product' }),
      Listing.countDocuments({ vendor: userId, type: 'service' }),
      Inquiry.countDocuments({ vendor: userId })
    ]);

    const totalReelViews = reels.reduce((acc, r) => acc + (r.views || 0), 0);

    return ApiResponse.ok(res, 'Vendor analytics metrics loaded.', {
      reelViews: totalReelViews,
      productViews: productListings * 10,
      serviceViews: serviceListings * 10,
      offerClicks: leadsCount * 2,
      phoneCalls: leadsCount,
      whatsappClicks: leadsCount,
      profileVisits: (productListings + serviceListings) * 15,
      followers: req.user.followers_count || 0
    });
  });

  // ── Vendor Boosts ────────────────────────────────────────
  getBoosts = asyncHandler(async (req, res) => {
    const boostedReels = await Reel.find({ creator: req.user._id, isBoosted: true }).lean();

    return ApiResponse.ok(res, 'Active reel boosts loaded.', {
      active: boostedReels.map((r) => {
        let remainingDays = 7;
        if (r.boostExpiresAt) {
          const diff = new Date(r.boostExpiresAt).getTime() - Date.now();
          remainingDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        } else if (r.boostDurationDays) {
          remainingDays = r.boostDurationDays;
        }

        return {
          id: r._id.toString(),
          reelTitle: r.caption || 'Boosted Reel Promo',
          plan: r.boostPlan || 'Gold Boost (7 Days)',
          remainingDays,
          status: remainingDays > 0 ? 'Active' : 'Expired',
          cost: r.boostCost || 1499
        };
      })
    });
  });

  purchaseBoost = asyncHandler(async (req, res) => {
    const body = req.body || {};
    const { plan, cost } = body;
    const reelId = body.reelId || body.id;
    const days = body.days || body.durationDays;
    const walletService = require('../services/wallet.service');
    const ApiError = require('../utils/ApiError');

    if (!reelId || !plan || !cost) {
      throw ApiError.badRequest('reelId, plan, and cost are required');
    }

    const reel = await Reel.findOne({ _id: reelId, creator: req.user._id });
    if (!reel) {
      throw ApiError.notFound('Reel not found or not owned by you');
    }

    const durationDays = parseInt(days || (plan.toLowerCase().includes('3 day') ? 3 : plan.toLowerCase().includes('30 day') ? 30 : 7), 10);

    await walletService.debit({
      userId: req.user._id,
      amount: Math.round(cost),
      transactionType: 'manual_debit',
      reason: `Purchased Reel Boost: ${plan} for reel "${reel.caption || 'Promo'}"`,
      source: 'boost_reel'
    });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await Reel.updateOne(
      { _id: reelId },
      {
        $set: {
          isBoosted: true,
          boostPlan: plan,
          boostCost: cost,
          boostDurationDays: durationDays,
          boostActivatedAt: now.toISOString(),
          boostExpiresAt: expiresAt.toISOString(),
        }
      }
    );

    return ApiResponse.created(res, 'Reel boost purchased successfully', {
      id: reelId,
      plan,
      cost,
      remainingDays: durationDays,
      status: 'Active'
    });
  });

  renewBoost = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const walletService = require('../services/wallet.service');
    const ApiError = require('../utils/ApiError');

    const reel = await Reel.findOne({ _id: id, creator: req.user._id });
    if (!reel) {
      throw ApiError.notFound('Boosted reel not found');
    }

    const cost = reel.boostCost || 1499;
    const planName = reel.boostPlan || 'Gold Boost (7 Days)';
    const days = reel.boostDurationDays || 7;

    await walletService.debit({
      userId: req.user._id,
      amount: Math.round(cost),
      transactionType: 'manual_debit',
      reason: `Renewed Reel Boost: ${planName} for reel "${reel.caption || 'Promo'}"`,
      source: 'boost_reel'
    });

    const now = new Date();
    let baseFrom = now;
    if (reel.boostExpiresAt) {
      const currentExpiry = new Date(reel.boostExpiresAt);
      if (currentExpiry > now) {
        baseFrom = currentExpiry;
      }
    }

    const newExpiry = new Date(baseFrom.getTime() + days * 24 * 60 * 60 * 1000);
    const remainingDays = Math.max(0, Math.ceil((newExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    await Reel.updateOne(
      { _id: id },
      {
        $set: {
          isBoosted: true,
          boostActivatedAt: now.toISOString(),
          boostExpiresAt: newExpiry.toISOString(),
        }
      }
    );

    return ApiResponse.ok(res, 'Reel boost renewed successfully', {
      id,
      plan: planName,
      cost,
      remainingDays,
      status: 'Active'
    });
  });

  /**
   * Helper to bust cached dashboard response when listings, reels, or orders change
   */
  invalidateDashboardCache = async (userId) => {
    try {
      if (!userId) return;
      const cache = require('../utils/cache');
      await cache.deleteCache(`cache:vendor:dashboard:${userId.toString()}`);
    } catch (_) {}
  };
}

module.exports = new VendorController();
