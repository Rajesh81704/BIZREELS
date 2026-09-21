import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getSocket } from '../../../lib/socket';
import {
  FiInbox, FiShoppingBag, FiTool, FiFileText, FiSliders,
  FiRotateCw, FiShield, FiAlertCircle, FiCheckCircle, FiZap,
  FiArrowRight, FiLock
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import {
  useGetVendorLeadsQuery,
  useGetVendorWalletQuery,
  useGetCreditRatesQuery,
  useReplyToLeadMutation,
  useCloseLeadMutation,
  useDeleteLeadMutation
} from '../../../features/vendor/vendorApi';
import {
  useGetRequirementsQuery,
  useSubmitQuoteMutation,
  useGetRequirementDetailsQuery
} from '../../../features/customer/requirementsApi';

// Subcomponents
import InquiryList from './components/InquiryList';
import RequirementMatchesTab from './components/RequirementMatchesTab';
import QuickReplyModal from './components/QuickReplyModal';
import SubmitProposalModal from './components/SubmitProposalModal';
import RequirementDetailModal from './components/RequirementDetailModal';
import { useLanguage } from '../../../context/LanguageContext';

export default function VendorLeadsPage() {
  const { bi, t } = useLanguage();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'all-enquiries';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab with URL search parameter
  useEffect(() => {
    const currentTabParam = searchParams.get('tab');
    if (currentTabParam && currentTabParam !== activeTab) {
      setActiveTab(currentTabParam);
    }
  }, [searchParams]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };
  
  // ── Leads & Direct Customer Inquiries Query ───────────────────────
  const { data: leadsData, isFetching: isLeadsFetching, refetch: refetchLeads } = useGetVendorLeadsQuery(
    { limit: 100 },
    { pollingInterval: 300000 }
  );

  // Lead Mutations
  const [replyToLead, { isLoading: isReplying }] = useReplyToLeadMutation();
  const [closeLead] = useCloseLeadMutation();
  const [deleteLead] = useDeleteLeadMutation();

  // Quick Reply Modal state
  const [replyModalInquiry, setReplyModalInquiry] = useState(null);

  // ── Broadcast Customer Requirements (RFQs) ───────────────────────
  const [distanceKm, setDistanceKm] = useState('50');
  const [sortBy, setSortBy] = useState('distance');

  const { data: reqsData, isFetching: isReqsFetching, refetch: refetchReqs } = useGetRequirementsQuery(
    {
      limit: 100,
      lat: user?.location?.coordinates?.[1] || undefined,
      lng: user?.location?.coordinates?.[0] || undefined,
      distance: distanceKm !== 'any' ? distanceKm : undefined,
      sortBy: sortBy,
    },
    { pollingInterval: 300000 }
  );

  // Dynamic Bidding Configuration from Admin AppSettings
  const { data: creditRatesData } = useGetCreditRatesQuery();
  const bidMultiplier = Number(creditRatesData?.bidMultiplier ?? 0.002);
  const bidCapCredits = Number(creditRatesData?.bidCapCredits ?? 20);

  // Dynamic Bid Calculation Formula driven by Admin Settings
  const calculateBidCreditCost = (price) => {
    const p = Math.max(0, parseFloat(price) || 0);
    if (p <= 0) return 0;
    const rawCost = Number((p * bidMultiplier).toFixed(2));
    const finalCost = Math.min(Math.max(0.10, rawCost), bidCapCredits);
    return Number(finalCost.toFixed(2));
  };

  // Proposal modal states
  const [proposalReq, setProposalReq] = useState(null);
  const [submitQuote, { isLoading: isSubmittingQuote }] = useSubmitQuoteMutation();

  // Vendor Wallet credits check
  const { data: walletData, refetch: refetchWallet } = useGetVendorWalletQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });
  const vendorWallet = walletData?.data || walletData || {};
  const currentCredits = Number(
    vendorWallet.credits ??
    vendorWallet.balance ??
    vendorWallet.walletBalance ??
    user?.walletBalance ??
    0
  );

  // Local state for tracking proposals submitted in this session
  const [respondedReqIds, setRespondedReqIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('vendor_responded_req_ids') || '[]');
    } catch {
      return [];
    }
  });

  // Local state for ignored/saved requirements
  const [ignoredIds, setIgnoredIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('vendor_ignored_requirements') || '[]');
    } catch {
      return [];
    }
  });
  const [savedIds, setSavedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('vendor_saved_requirements') || '[]');
    } catch {
      return [];
    }
  });

  // Requirement details modal states
  const [detailReq, setDetailReq] = useState(null);
  const [activeDetailId, setActiveDetailId] = useState(null);
  const { data: detailFetched } = useGetRequirementDetailsQuery(activeDetailId, {
    skip: !activeDetailId,
  });

  useEffect(() => {
    const id = detailReq?._id || detailReq?.id || proposalReq?._id || proposalReq?.id;
    setActiveDetailId(id || null);
  }, [detailReq, proposalReq]);

  const displayReq = detailFetched?.data?.requirement || detailFetched?.requirement || detailReq;
  const displayProposalReq = (proposalReq && (detailFetched?.data?.requirement || detailFetched?.requirement)) || proposalReq;

  // ── Socket.IO Real-time Synchronization ───────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleInquiryChange = () => {
      if (typeof refetchLeads === 'function') refetchLeads();
    };

    const handleReqAssigned = () => {
      if (typeof refetchReqs === 'function') refetchReqs();
    };

    const handleReqUpdated = (req) => {
      if (typeof refetchReqs === 'function') refetchReqs();
      if (detailReq && (detailReq._id === req._id || detailReq.id === req.id)) {
        setDetailReq(req);
      }
    };

    const handleReqDeleted = ({ id }) => {
      if (typeof refetchReqs === 'function') refetchReqs();
      if (detailReq && (detailReq._id === id || detailReq.id === id)) {
        setDetailReq(null);
      }
    };

    const handleReqClosed = (req) => {
      if (typeof refetchReqs === 'function') refetchReqs();
      if (detailReq && (detailReq._id === req._id || detailReq.id === req.id)) {
        setDetailReq(req);
      }
    };

    socket.on('inquiry:created', handleInquiryChange);
    socket.on('inquiry:updated', handleInquiryChange);
    socket.on('inquiry:deleted', handleInquiryChange);
    socket.on('notification', handleInquiryChange);
    socket.on('notification:new', handleInquiryChange);

    socket.on('requirement:assigned', handleReqAssigned);
    socket.on('requirement:updated', handleReqUpdated);
    socket.on('requirement:deleted', handleReqDeleted);
    socket.on('requirement:closed', handleReqClosed);

    return () => {
      socket.off('inquiry:created', handleInquiryChange);
      socket.off('inquiry:updated', handleInquiryChange);
      socket.off('inquiry:deleted', handleInquiryChange);
      socket.off('notification', handleInquiryChange);
      socket.off('notification:new', handleInquiryChange);

      socket.off('requirement:assigned', handleReqAssigned);
      socket.off('requirement:updated', handleReqUpdated);
      socket.off('requirement:deleted', handleReqDeleted);
      socket.off('requirement:closed', handleReqClosed);
    };
  }, [detailReq, refetchReqs, refetchLeads]);

  // ── Segregate Inquiries into Categories ───────────────────────────
  const allInquiries = Array.isArray(leadsData?.data) ? leadsData.data : Array.isArray(leadsData) ? leadsData : [];
  
  const productEnquiries = [];
  const serviceEnquiries = [];
  const quoteRequests = [];

  allInquiries.forEach((e) => {
    const isQuoteOrCall = (e.message || '').toLowerCase().includes('callback') || 
                          (e.message || '').toLowerCase().includes('call callback') ||
                          (e.message || '').toLowerCase().includes('quote') ||
                          e.listing?.price === 0 || 
                          e.listing?.sellingPrice === 0;

    if (isQuoteOrCall) {
      quoteRequests.push(e);
    } else if (e.listing?.type === 'service') {
      serviceEnquiries.push(e);
    } else {
      productEnquiries.push(e);
    }
  });
  
  const requirementMatches = (reqsData?.requirements || reqsData?.data?.requirements || reqsData?.data || [])
    .filter(req => !ignoredIds.includes(req._id || req.id));

  // Key KPI Counts
  const newInquiriesCount = allInquiries.filter(i => (i.status || 'sent') === 'sent').length;
  const resolvedInquiriesCount = allInquiries.filter(i => i.status === 'replied' || i.status === 'closed').length;

  // ── Tab Config with Live Badges ───────────────────────────────────
  const TABS = [
    { key: 'all-enquiries', label: bi('All Enquiries', 'सभी पूछताछ'), count: allInquiries.length, icon: FiInbox },
    { key: 'product-enquiries', label: bi('Product Enquiries', 'उत्पाद पूछताछ'), count: productEnquiries.length, icon: FiShoppingBag },
    { key: 'service-enquiries', label: bi('Service Enquiries', 'सेवा पूछताछ'), count: serviceEnquiries.length, icon: FiTool },
    { key: 'quote-requests', label: bi('Quote Requests', 'कोटेशन अनुरोध'), count: quoteRequests.length, icon: FiFileText },
    { key: 'requirement-matches', label: bi('Customer Requirements', 'ग्राहक आवश्यकताएं'), count: requirementMatches.length, icon: FiSliders },
  ];

  // ── Inquiries Handlers ────────────────────────────────────────────
  const handleOpenReplyModal = (inquiry) => {
    setReplyModalInquiry(inquiry);
  };

  const handleSendQuickReply = async (inquiry, message) => {
    try {
      await replyToLead({
        id: inquiry._id || inquiry.id,
        message
      }).unwrap();
      toast.success('Reply sent to customer successfully!');
      setReplyModalInquiry(null);
      refetchLeads();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to send reply');
    }
  };

  const handleCloseInquiry = async (inquiryId) => {
    if (!window.confirm('Mark this customer inquiry as resolved / closed?')) return;
    try {
      await closeLead(inquiryId).unwrap();
      toast.success('Inquiry marked as closed');
      refetchLeads();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to close inquiry');
    }
  };

  const handleDeleteInquiry = async (inquiryId) => {
    if (!window.confirm('Are you sure you want to remove this inquiry from your list?')) return;
    try {
      await deleteLead(inquiryId).unwrap();
      toast.success('Inquiry removed');
      refetchLeads();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete inquiry');
    }
  };

  // ── Requirements Handlers ─────────────────────────────────────────
  const handleSaveRequirement = (id) => {
    let updated;
    if (savedIds.includes(id)) {
      updated = savedIds.filter(savedId => savedId !== id);
      toast.success('Removed from saved list');
    } else {
      updated = [...savedIds, id];
      toast.success('Requirement saved successfully!');
    }
    setSavedIds(updated);
    try {
      localStorage.setItem('vendor_saved_requirements', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save vendor requirements in localStorage:', e);
    }
  };

  const handleMarkNotInterested = (id) => {
    const updated = [...ignoredIds, id];
    setIgnoredIds(updated);
    try {
      localStorage.setItem('vendor_ignored_requirements', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save ignored requirements in localStorage:', e);
    }
    toast.success('Requirement marked as Not Interested');
  };

  const handleOpenProposalModal = (req) => {
    setProposalReq(req);
  };

  const handleSubmitProposal = async ({ quotePrice, quoteDelivery, quoteNotes, quoteAttachment }) => {
    if (!quotePrice || !quoteDelivery) {
      toast.error('Please enter quotation price and delivery timeline');
      return;
    }

    const priceNum = Number(quotePrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('Please enter a valid quotation price');
      return;
    }

    const bidFee = calculateBidCreditCost(priceNum);

    if (currentCredits < bidFee) {
      toast.error(`Insufficient credits! You need ${bidFee.toFixed(2)} credits to submit this proposal. Your balance: ${currentCredits.toFixed(2)} credits.`);
      return;
    }

    const reqId = proposalReq._id || proposalReq.id;

    try {
      const payload = {
        requirementId: reqId,
        price: priceNum,
        estimatedDelivery: new Date(quoteDelivery).toISOString(),
        notes: quoteNotes
      };
      if (quoteAttachment) {
        payload.attachments = [{ name: 'Document Proposal', url: quoteAttachment }];
      }

      await submitQuote(payload).unwrap();
      toast.success('Proposal submitted successfully! Credits deducted & buyer notified.');

      const updatedResponded = Array.from(new Set([...respondedReqIds, reqId.toString()]));
      setRespondedReqIds(updatedResponded);
      try {
        localStorage.setItem('vendor_responded_req_ids', JSON.stringify(updatedResponded));
      } catch (_) {}

      setProposalReq(null);
      if (typeof refetchReqs === 'function') refetchReqs();
      if (typeof refetchWallet === 'function') refetchWallet();
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Failed to submit proposal');
    }
  };

  const handleManualRefresh = () => {
    refetchLeads();
    refetchReqs();
    refetchWallet();
    toast.success('Leads refreshed!');
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-5 animate-fade-in pb-16 font-sans">
      
      {/* ── HEADER BANNER: Warm Editorial Style ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-[#e3dccb] shadow-2xs">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#f5efe4] text-[#9e6715] flex items-center justify-center border border-[#d5cbba] shadow-2xs shrink-0">
            <FiInbox size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 style={{ fontFamily: "'Archivo Black', sans-serif" }} className="text-xl sm:text-2xl text-[#1a1a1a] tracking-tight uppercase">
                {bi('LEADS & CUSTOMER INQUIRIES', 'लीड्स व ग्राहक पूछताछ')}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                <FiShield size={10} className="text-emerald-700" />
                <span>Privacy Shield Active</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium max-w-2xl">
              {bi('Manage direct product & service inquiries from buyers, send verified quick replies, and bid on broadcast customer requirements.', 'उत्पाद व सेवा पूछताछ प्रबंधित करें, त्वरित उत्तर दें और खरीदारों की आवश्यकताओं पर बिड करें।')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isLeadsFetching || isReqsFetching}
            className="px-3.5 py-2.5 bg-white hover:bg-[#f8f4ec] border border-[#e3dccb] text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-2xs"
            title="Refresh Inquiries"
          >
            <FiRotateCw className={isLeadsFetching || isReqsFetching ? 'animate-spin text-[#d99a3d]' : 'text-slate-600'} size={14} />
            <span className="hidden sm:inline">{bi('Refresh', 'रिफ्रेश')}</span>
          </button>

          <Link
            to="/vendor/dashboard"
            className="px-4 py-2.5 bg-[#241b15] hover:bg-black text-[#d99a3d] text-xs font-extrabold rounded-xl transition shadow-2xs flex items-center gap-1.5"
          >
            <span>{bi('Dashboard', 'डैशबोर्ड')}</span>
            <FiArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* ── BENTO KPI SUMMARY ROW (4 Metric Cards) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Enquiries */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e3dccb] shadow-2xs flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black uppercase tracking-wider">
              {bi('Total Inquiries', 'कुल पूछताछ')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#f5efe4] text-[#9e6715] flex items-center justify-center border border-[#e3dccb]">
              <FiInbox size={14} />
            </div>
          </div>
          <div className="mt-1">
            <span style={{ fontFamily: "'Archivo Black', sans-serif" }} className="text-2xl sm:text-3xl text-[#1a1a1a]">
              {allInquiries.length}
            </span>
            <span className="text-[10px] text-slate-500 block font-medium mt-0.5">
              Across all listings & reels
            </span>
          </div>
        </div>

        {/* Card 2: New / Action Required */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e3dccb] shadow-2xs flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
              {bi('Needs Reply', 'उत्तर अपेक्षित')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
              <FiAlertCircle size={14} />
            </div>
          </div>
          <div className="mt-1">
            <div className="flex items-baseline gap-2">
              <span style={{ fontFamily: "'Archivo Black', sans-serif" }} className="text-2xl sm:text-3xl text-amber-700">
                {newInquiriesCount}
              </span>
              {newInquiriesCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
              )}
            </div>
            <span className="text-[10px] text-slate-500 block font-medium mt-0.5">
              Unanswered buyer messages
            </span>
          </div>
        </div>

        {/* Card 3: Resolved & Replied */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e3dccb] shadow-2xs flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
              {bi('Resolved Leads', 'सुलझाई गई लीड्स')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <FiCheckCircle size={14} />
            </div>
          </div>
          <div className="mt-1">
            <span style={{ fontFamily: "'Archivo Black', sans-serif" }} className="text-2xl sm:text-3xl text-emerald-800">
              {resolvedInquiriesCount}
            </span>
            <span className="text-[10px] text-slate-500 block font-medium mt-0.5">
              Replied or marked closed
            </span>
          </div>
        </div>

        {/* Card 4: Wallet Platform Credits */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e3dccb] shadow-2xs flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#9e6715]">
              {bi('Wallet Credits', 'वॉलेट क्रेडिट')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#f5efe4] text-[#9e6715] flex items-center justify-center border border-[#e3dccb]">
              <FiZap size={14} className="fill-[#d99a3d]" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <div>
              <span style={{ fontFamily: "'Archivo Black', sans-serif" }} className="text-2xl sm:text-3xl text-[#1a1a1a]">
                {currentCredits.toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-500 block font-medium mt-0.5">
                Available for RFQ bidding
              </span>
            </div>
            <Link
              to="/vendor/wallet?tab=plans"
              className="text-[11px] font-extrabold text-[#9e6715] bg-[#f8f4ec] hover:bg-[#ede5d8] border border-[#e3dccb] px-2.5 py-1 rounded-lg transition"
            >
              + Recharge
            </Link>
          </div>
        </div>
      </div>

      {/* ── BENTO EDITORIAL TABS SWITCHER ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2.5 text-xs font-black rounded-xl transition cursor-pointer border-2 shrink-0 flex items-center gap-2 ${
                isActive
                  ? 'bg-[#241b15] text-[#d99a3d] border-[#241b15] shadow-xs'
                  : 'bg-white text-slate-700 border-[#e3dccb] hover:border-[#241b15]'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-[#d99a3d]' : 'text-slate-500'} />
              <span>{tab.label}</span>
              <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                isActive
                  ? 'bg-[#d99a3d]/20 text-[#d99a3d] border border-[#d99a3d]/40'
                  : 'bg-[#f8f4ec] text-slate-700 border border-[#e3dccb]'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── MAIN CONTENT CONTAINER: Clean Bento Card ── */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#e3dccb] shadow-xs space-y-4">
        {(isLeadsFetching || isReqsFetching) && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-[#f8f4ec] animate-pulse rounded-2xl border border-[#e3dccb]" />
            ))}
          </div>
        )}

        {/* TAB 1: ALL ENQUIRIES */}
        {activeTab === 'all-enquiries' && !isLeadsFetching && (
          <InquiryList
            inquiries={allInquiries}
            emptyText={bi('No customer enquiries received yet.', 'अभी तक कोई ग्राहक पूछताछ प्राप्त नहीं हुई।')}
            onReply={handleOpenReplyModal}
            onClose={handleCloseInquiry}
            onDelete={handleDeleteInquiry}
          />
        )}

        {/* TAB 2: PRODUCT ENQUIRIES */}
        {activeTab === 'product-enquiries' && !isLeadsFetching && (
          <InquiryList
            inquiries={productEnquiries}
            emptyText={bi('No product enquiries found.', 'कोई उत्पाद पूछताछ नहीं मिली।')}
            onReply={handleOpenReplyModal}
            onClose={handleCloseInquiry}
            onDelete={handleDeleteInquiry}
          />
        )}

        {/* TAB 3: SERVICE ENQUIRIES */}
        {activeTab === 'service-enquiries' && !isLeadsFetching && (
          <InquiryList
            inquiries={serviceEnquiries}
            emptyText={bi('No service enquiries found.', 'कोई सेवा पूछताछ नहीं मिली।')}
            onReply={handleOpenReplyModal}
            onClose={handleCloseInquiry}
            onDelete={handleDeleteInquiry}
          />
        )}

        {/* TAB 4: QUOTE REQUESTS */}
        {activeTab === 'quote-requests' && !isLeadsFetching && (
          <InquiryList
            inquiries={quoteRequests}
            emptyText={bi('No callback or quote requests found.', 'कोई कॉलबैक या कोटेशन अनुरोध नहीं मिला।')}
            onReply={handleOpenReplyModal}
            onClose={handleCloseInquiry}
            onDelete={handleDeleteInquiry}
          />
        )}

        {/* TAB 5: BROADCAST CUSTOMER REQUIREMENTS */}
        {activeTab === 'requirement-matches' && !isReqsFetching && (
          <RequirementMatchesTab
            requirements={requirementMatches}
            distanceKm={distanceKm}
            setDistanceKm={setDistanceKm}
            sortBy={sortBy}
            setSortBy={setSortBy}
            currentUserId={user?._id || user?.id}
            currentCredits={currentCredits}
            savedIds={savedIds}
            respondedReqIds={respondedReqIds}
            calculateBidCreditCost={calculateBidCreditCost}
            bidMultiplier={bidMultiplier}
            bidCapCredits={bidCapCredits}
            onViewDetail={(req) => setDetailReq(req)}
            onOpenProposal={handleOpenProposalModal}
            onToggleSave={handleSaveRequirement}
            onMarkNotInterested={handleMarkNotInterested}
            onRefresh={refetchReqs}
          />
        )}
      </div>

      {/* ── PRIVACY ASSURANCE SHIELD FOOTER ── */}
      <div className="bg-[#f8f4ec] rounded-2xl p-4 border border-[#e3dccb] flex items-center gap-3 text-xs text-slate-600">
        <div className="w-8 h-8 rounded-xl bg-white text-[#9e6715] flex items-center justify-center border border-[#e3dccb] shadow-2xs shrink-0">
          <FiLock size={15} />
        </div>
        <div className="min-w-0">
          <strong className="text-[#1a1a1a] block font-extrabold text-xs">
            BizReels Buyer Privacy Protection Protocol
          </strong>
          <p className="text-[11px] text-slate-500">
            Customer phone numbers and email addresses are protected to prevent off-platform spam and maintain genuine marketplace communications. All replies are delivered directly to the buyer's account notifications.
          </p>
        </div>
      </div>

      {/* Quick Reply Modal */}
      <QuickReplyModal
        isOpen={!!replyModalInquiry}
        inquiry={replyModalInquiry}
        onClose={() => setReplyModalInquiry(null)}
        onSendReply={handleSendQuickReply}
        isReplying={isReplying}
      />

      {/* Submit Proposal Modal (RFQ dynamic bidding) */}
      <SubmitProposalModal
        isOpen={!!proposalReq}
        requirement={displayProposalReq}
        currentCredits={currentCredits}
        calculateBidCreditCost={calculateBidCreditCost}
        bidMultiplier={bidMultiplier}
        bidCapCredits={bidCapCredits}
        onClose={() => setProposalReq(null)}
        onSubmitProposal={handleSubmitProposal}
        isSubmitting={isSubmittingQuote}
      />

      {/* Requirement Details Modal */}
      <RequirementDetailModal
        isOpen={!!detailReq}
        requirement={displayReq}
        currentUserId={user?._id || user?.id}
        currentCredits={currentCredits}
        calculateBidCreditCost={calculateBidCreditCost}
        bidMultiplier={bidMultiplier}
        bidCapCredits={bidCapCredits}
        respondedReqIds={respondedReqIds}
        onClose={() => setDetailReq(null)}
        onOpenProposal={(req) => {
          setDetailReq(null);
          setProposalReq(req);
        }}
      />
    </div>
  );
}
