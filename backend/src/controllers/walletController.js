const walletService = require('../services/wallet.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const cache = require('../utils/cache');

/**
 * WalletController — Production-Grade
 * Handles wallet balance, transactions, plans, and payouts with real-time updates.
 */
class WalletController {

  // ── Get Wallet Balance ──────────────────────────────────
  getWallet = asyncHandler(async (req, res) => {
    const role = (req.query.role || req.user?.activeRole || req.user?.current_role || '').toLowerCase().trim();
    if (role === 'creator') {
      const roleBalance = await walletService.getRoleBalance(req.user._id, 'creator');
      return ApiResponse.ok(res, 'Creator wallet details loaded.', {
        balance: roleBalance.balance || 0,
        walletBalance: roleBalance.balance || 0,
        earnings: roleBalance.balance || 0,
        credits: 0,
        is_frozen: roleBalance.is_frozen || false,
      });
    }
    const balance = await walletService.getBalance(req.user._id);
    const mainWalletDoc = await walletService.getOrCreateWallet(req.user._id);

    let used = mainWalletDoc?.lifetime_spent_credits || 0;
    if (!used) {
      const WalletTransactionV2 = require('../models/WalletTransactionV2.model');
      const debitAgg = await WalletTransactionV2.aggregate([
        { $match: { user_id: req.user._id.toString(), credit_debit: 'debit', status: { $ne: 'failed' } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).catch(() => []);
      used = debitAgg?.[0]?.total || 0;
    }

    const deposited = (mainWalletDoc?.lifetime_deposited_paise ? Math.floor(mainWalletDoc.lifetime_deposited_paise / 100) : 0) || 0;
    const earned = mainWalletDoc?.lifetime_earned_credits || Math.max(balance.credits || 0, 100);

    return ApiResponse.ok(res, 'Wallet details loaded.', {
      balance: balance.credits,
      walletBalance: balance.credits,
      credits: balance.credits,
      available: balance.credits,
      deposited,
      earned,
      used,
      total_spent: used,
      free_reel_boosts: balance.free_reel_boosts || 0,
      freeReelBoosts: balance.free_reel_boosts || 0,
      balance_inr_paise: balance.balance_inr_paise,
      is_frozen: balance.is_frozen,
    });
  });

  // ── Quick Balance Check ─────────────────────────────────
  getBalance = asyncHandler(async (req, res) => {
    const balance = await walletService.getBalance(req.user._id);
    const mainWalletDoc = await walletService.getOrCreateWallet(req.user._id);

    let used = mainWalletDoc?.lifetime_spent_credits || 0;
    if (!used) {
      const WalletTransactionV2 = require('../models/WalletTransactionV2.model');
      const debitAgg = await WalletTransactionV2.aggregate([
        { $match: { user_id: req.user._id.toString(), credit_debit: 'debit', status: { $ne: 'failed' } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).catch(() => []);
      used = debitAgg?.[0]?.total || 0;
    }

    const deposited = (mainWalletDoc?.lifetime_deposited_paise ? Math.floor(mainWalletDoc.lifetime_deposited_paise / 100) : 0) || 0;
    const earned = mainWalletDoc?.lifetime_earned_credits || Math.max(balance.credits || 0, 100);

    return ApiResponse.ok(res, 'Balance fetched.', {
      balance: balance.credits,
      credits: balance.credits,
      available: balance.credits,
      deposited,
      earned,
      used,
      total_spent: used,
      free_reel_boosts: balance.free_reel_boosts || 0,
    });
  });

  // ── Get Active Subscription ─────────────────────────────
  getSubscription = asyncHandler(async (req, res) => {
    const UserSubscription = require('../models/UserSubscription.model');
    const { SubscriptionPlan } = require('../models/Admin');

    const role = (req.query.role || '').toLowerCase().trim();
    const query = {
      user_id: req.user._id.toString(),
      status: 'active',
      is_deleted: { $ne: true },
    };
    // If role is specified, filter by it for role isolation
    if (role && ['vendor', 'creator'].includes(role)) {
      query.user_role = role;
    }

    const activeSub = await UserSubscription.findOne(query).lean();

    let features = [];
    let planName = 'Free Member';

    if (activeSub) {
      planName = activeSub.plan_name;
      // Fetch plan features dynamically
      const plan = await SubscriptionPlan.findById(activeSub.plan_id).lean();
      if (plan) {
        features = plan.features_list || (plan.features ? plan.features.split(',').map(f => f.trim()) : []);
      }
    }

    return ApiResponse.ok(res, 'Subscription details loaded.', {
      subscription: activeSub || { planName, status: 'active' },
      plan: planName,
      features,
    });
  });

  // ── Get Available Plans ─────────────────────────────────
  getPlans = asyncHandler(async (req, res) => {
    const role = (req.query.role || '').toLowerCase().trim();
    const cacheKey = role ? `subscription:plans:${role}` : 'subscription:plans:all';
    const cached = await cache.getCache(cacheKey);
    if (cached) {
      return ApiResponse.ok(res, 'Active subscription plans loaded.', { items: cached });
    }

    const { SubscriptionPlan } = require('../models/Admin');
    const query = { is_active: true, is_deleted: { $ne: true }, is_archived: { $ne: true } };
    if (role === 'vendor') {
      query.$and = [
        {
          $or: [
            { user_type: 'vendor' },
            { target_role: 'vendor' },
            { user_type: 'all' },
            { target_role: 'all' },
            { user_type: { $exists: false } },
          ],
        },
        { user_type: { $ne: 'creator' } },
        { target_role: { $ne: 'creator' } },
      ];
    } else if (role === 'creator') {
      query.$and = [
        {
          $or: [
            { user_type: 'creator' },
            { target_role: 'creator' },
            { user_type: 'all' },
            { target_role: 'all' },
          ],
        },
        { user_type: { $ne: 'vendor' } },
        { target_role: { $ne: 'vendor' } },
      ];
    }

    const plans = await SubscriptionPlan.find(query).sort({ sort_order: 1, price_inr: 1 }).lean();

    const mapped = plans.map(obj => {
      const userType = obj.user_type || obj.target_role || 'vendor';
      return {
        id: (obj._id || obj.id).toString(),
        title: obj.title,
        description: obj.description,
        plan_type: obj.plan_type || 'basic',
        user_type: userType,
        target_role: obj.target_role || userType,
        billing_cycle: obj.billing_cycle,
        price_inr: obj.price_inr,
        wallet_credits: obj.wallet_credits || 0,
        free_reel_boosts: obj.free_reel_boosts || 0,
        badge_text: obj.badge_text || null,
        duration_days: obj.duration_days || null,
        features_list: obj.features_list || (obj.features ? obj.features.split(',').map(f => f.trim()) : []),
        features: obj.features || '',
        product_limit: obj.product_limit,
        service_limit: obj.service_limit,
        reels_limit: obj.reels_limit,
        leads_limit: obj.leads_limit,
        ai_credits: obj.ai_credits || 0,
        verified_badge: obj.verified_badge !== false,
        priority_support: obj.priority_support || false,
        analytics_access: obj.analytics_access || false,
        priority_ranking: obj.priority_ranking || false,
        discount_percentage: obj.discount_percentage || 0,
        add_ons: obj.add_ons || [],
        is_active: obj.is_active !== false,
        is_archived: obj.is_archived || false,
      };
    });

    // Short cache: 5 minutes (not 24hrs) so admin changes appear quickly
    await cache.setCache(cacheKey, mapped, 300);
    return ApiResponse.ok(res, 'Active subscription plans loaded.', { items: mapped });
  });

  // ── Recharge Wallet / Plan Payment Order ────────────────
  recharge = asyncHandler(async (req, res) => {
    const { amount, plan_id, planId, referenceId, direct } = req.body;
    const paymentService = require('../services/payment.service');
    const pid = plan_id || planId;

    // If plan is provided, initiate Razorpay order for that plan
    if (pid) {
      const { SubscriptionPlan } = require('../models/Admin');
      const mongoose = require('mongoose');
      let planDoc = null;
      if (mongoose.Types.ObjectId.isValid(pid)) {
        planDoc = await SubscriptionPlan.findById(pid).lean();
      }
      if (!planDoc) {
        planDoc = await SubscriptionPlan.findOne({
          title: { $regex: new RegExp(`^${pid}$`, 'i') },
          is_deleted: { $ne: true },
        }).lean();
      }
      if (!planDoc) {
        return ApiResponse.badRequest(res, `Invalid plan: "${pid}".`);
      }

      const amountPaise = Math.round((planDoc.price_inr || 0) * 100);
      const order = await paymentService.createPaymentOrder(
        req.user._id.toString(),
        'subscription_plan',
        amountPaise,
        planDoc._id.toString(),
        {
          plan_id: planDoc._id.toString(),
          plan_title: planDoc.title,
          price_inr: planDoc.price_inr,
          wallet_credits: planDoc.wallet_credits || 0,
        }
      );

      return ApiResponse.ok(res, 'Payment order created.', {
        ...order,
        id: order.razorpay_order_id,
        key: order.key_id,
        amount: order.amount_paise,
      });
    }

    // If custom amount is provided without 'direct: true' (online Razorpay checkout)
    if (amount && Number(amount) > 0 && !direct) {
      const amountPaise = Math.round(Number(amount) * 100);
      const order = await paymentService.createPaymentOrder(
        req.user._id.toString(),
        'wallet_topup',
        amountPaise,
        referenceId || null
      );

      return ApiResponse.ok(res, 'Payment order created.', {
        ...order,
        id: order.razorpay_order_id,
        key: order.key_id,
        amount: order.amount_paise,
      });
    }

    // Direct manual balance credit (Admin / Internal / Webhook)
    const result = await walletService.rechargeWallet({
      userId: req.user._id,
      amount,
      referenceId,
    });
    return ApiResponse.ok(res, 'Wallet recharged successfully.', {
      walletBalance: result.wallet.credits,
      transaction: result.transaction,
    });
  });

  // ── Get Transactions History ────────────────────────────
  getTransactions = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || 20, 10)));
    const role = (req.query.role || req.user?.activeRole || req.user?.current_role || '').toLowerCase().trim();

    let result;
    if (role && ['vendor', 'creator'].includes(role)) {
      result = await walletService.getRoleTransactions(req.user._id, role, page, limit);
    } else {
      result = await walletService.getTransactions(req.user._id, page, limit);
    }

    const items = result?.items || (Array.isArray(result) ? result : []);
    const mapped = items.map(tx => ({
      id: tx.id || tx._id,
      _id: tx.transaction_id || tx.reference_id || tx._id,
      title: (tx.title || tx.transaction_type || tx.type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      description: tx.description || tx.admin_remarks || (tx.transaction_type || tx.type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      type: (tx.credit_debit === 'credit' || tx.type === 'credit') ? 'credit' : 'debit',
      amount: tx.amount,
      createdAt: tx.created_at || tx.createdAt,
    }));

    return ApiResponse.paginated(res, 'Transactions ledger loaded.', mapped, {
      page,
      limit,
      total: result?.total || mapped.length,
    });
  });

  // ── Purchase Plan ───────────────────────────────────────
  purchaseSubscription = asyncHandler(async (req, res) => {
    const plan = req.body.plan || req.body.planId;
    const selected_addons = req.body.selected_addons || [];
    if (!plan) {
      return ApiResponse.ok(res, 'Plan is required.', null);
    }
    const result = await walletService.purchasePlan({
      userId: req.user._id,
      plan,
      selected_addons,
    });
    return ApiResponse.ok(res, `Subscribed to plan successfully.`, {
      subscription: result.user.subscription,
      walletBalance: result.user.walletBalance,
      transaction: result.transaction,
    });
  });

  // ── Request Payout ──────────────────────────────────────
  requestPayout = asyncHandler(async (req, res) => {
    const { amount, role } = req.body;
    const userRole = (role || req.query.role || req.user?.activeRole || req.user?.current_role || '').toLowerCase().trim();

    if (userRole === 'creator') {
      const result = await walletService.roleDebit({
        userId: req.user._id,
        role: 'creator',
        amount,
        type: 'withdrawal',
        description: `Creator Earnings Withdrawal Request (₹${amount})`,
      });
      return ApiResponse.ok(res, 'Creator earnings withdrawal request submitted successfully.', {
        balance: result.wallet.balance,
        walletBalance: result.wallet.balance,
        transaction: result.transaction,
      });
    }

    const result = await walletService.requestPayout({
      userId: req.user._id,
      amount,
    });
    return ApiResponse.ok(res, 'Payout withdrawal request submitted successfully.', {
      withdrawable_inr: result.withdrawable_inr,
      walletBalance: result.wallet.credits,
      transaction: result.transaction,
    });
  });

  // ── Get Topup Packs / Presets ────────────────────────────
  getTopupPacks = asyncHandler(async (req, res) => {
    const { AppSettings } = require('../models/Admin');
    const cached = await cache.getCache('wallet:topup_packs');
    if (cached) {
      return ApiResponse.ok(res, 'Topup packs loaded.', { packs: cached });
    }

    let packs = [];

    try {
      const setting = await AppSettings.findOne({ key: 'topup_packs' }).lean();
      if (setting && Array.isArray(setting.value)) {
        packs = setting.value.map(p => typeof p === 'number' ? { amount: p, label: `₹${p.toLocaleString('en-IN')}` } : p);
      }
    } catch (err) {
      packs = [];
    }

    await cache.setCache('wallet:topup_packs', packs, 300);
    return ApiResponse.ok(res, 'Topup packs loaded.', { packs });
  });

  // ── Get Credit Rate Schedule ────────────────────────────
  getCreditRates = asyncHandler(async (req, res) => {
    const { AppSettings } = require('../models/Admin');
    let boostRate = 2.00;
    let whatsappRate = 2.50;
    let callRate = 2.50;
    let bidMultiplier = 0.002;
    let bidCapCredits = 20;
    let rawRates = {
      whatsapp: 2.50,
      callConnected: 2.50,
      reelBoost1Day: 2.00,
      reelBoostAdditional: 2.00,
      uniqueView: 0.20,
      bidMultiplier: 0.002,
      bidCapCredits: 20,
    };
    try {
      const setting = await AppSettings.findOne({ key: 'credit_rates' }).lean();
      if (setting && setting.value) {
        boostRate = Number(setting.value.reelBoost1Day ?? setting.value.reelBoostAdditional ?? 2.00);
        whatsappRate = Number(setting.value.whatsapp ?? 2.50);
        callRate = Number(setting.value.callConnected ?? 2.50);
        bidMultiplier = Number(setting.value.bidMultiplier ?? 0.002);
        bidCapCredits = Number(setting.value.bidCapCredits ?? 20);
        rawRates = { ...rawRates, ...setting.value, reelBoost1Day: boostRate, reelBoostAdditional: boostRate, bidMultiplier, bidCapCredits };
      }
    } catch (e) {}

    const rateItems = [
      {
        action: 'Verified WhatsApp Lead',
        rate: `${whatsappRate.toFixed(2)} Credits`,
        description: 'Charged when a customer sends an inbound message to your connected Meta WhatsApp Business number (includes 24-hour deduplication protection)',
        category: 'WhatsApp',
        badge: 'ACTION LEAD',
      },
      {
        action: 'Connected Exotel Voice Call',
        rate: `${callRate.toFixed(2)} Credits`,
        description: 'Charged ONLY when a phone call connects between buyer and vendor for >= 10 seconds via Exotel (0 if busy, missed, or failed)',
        category: 'Telephony',
        badge: 'ACTION LEAD',
      },
      {
        action: 'Reel Feed Feature Boost',
        rate: `Free / ${boostRate.toFixed(2)} Credits/day`,
        rateValue: boostRate,
        description: `Plan-included free boosts (Starter: 1, Growth: 3, Business: 5) are consumed first. Additional boost duration costs ${boostRate.toFixed(2)} Credits per day`,
        category: 'Promotion',
        badge: 'BOOST',
      },
      {
        action: 'Catalog Product & Service Listings',
        rate: '0.00 Credits (FREE)',
        description: 'Unlimited catalog products and service offerings showcased on your verified store profile with zero listing fees',
        category: 'Catalog',
        badge: 'FREE',
      },
      {
        action: 'Standard 4K Video Reel Uploads',
        rate: '0.00 Credits (FREE)',
        description: 'Publish unlimited video reels to the local discovery feed with zero upload fees',
        category: 'Reels',
        badge: 'FREE',
      },
      {
        action: 'Customer Orders & Sales Commission',
        rate: '0% Always (FREE)',
        description: 'Zero platform middleman commission on direct buyer orders, quote bids, or closed customer deals',
        category: 'Orders',
        badge: 'ZERO COMMISSION',
      },
    ];

    return ApiResponse.ok(res, 'Official vendor credit rate schedule loaded.', {
      rates: rateItems,
      rawRates,
      boostRate,
      whatsappRate,
      callRate,
      bidMultiplier,
      bidCapCredits,
    });
  });
}

module.exports = new WalletController();
