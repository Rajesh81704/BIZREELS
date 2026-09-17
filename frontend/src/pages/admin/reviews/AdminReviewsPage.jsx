import React, { useState, useEffect, useMemo } from 'react';
import {
  FiStar,
  FiPackage,
  FiUserCheck,
  FiFilm,
  FiAlertTriangle,
  FiTrash2,
  FiEye,
  FiRefreshCw,
  FiAward,
  FiThumbsUp,
  FiFlag,
  FiExternalLink,
  FiX,
  FiCheckCircle,
  FiBriefcase,
  FiMessageSquare,
  FiUser,
  FiClock,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import AdminPageHeader from '../../../features/admin/components/AdminPageHeader';
import AdminTabBar from '../../../features/admin/components/AdminTabBar';
import AdminDataTable from '../../../features/admin/components/AdminDataTable';
import AdminStatusBadge from '../../../features/admin/components/AdminStatusBadge';
import { getSocket } from '../../../lib/socket';
import {
  useListAdminReviewsQuery,
  useDeleteAdminReviewMutation,
} from '../../../features/admin/adminApi';

const TABS = [
  { key: 'all', label: 'All Reviews', icon: FiStar },
  { key: 'product', label: 'Product Reviews', icon: FiPackage },
  { key: 'vendor', label: 'Vendor Reviews', icon: FiBriefcase },
  { key: 'creator', label: 'Creator Reviews', icon: FiFilm },
  { key: 'reported', label: 'Reported Reviews', icon: FiAlertTriangle },
];

const RATING_FILTERS = [
  { value: '', label: 'All Ratings' },
  { value: '5', label: '5 Stars (★★★★★)' },
  { value: '4', label: '4 Stars (★★★★☆)' },
  { value: '3', label: '3 Stars (★★★☆☆)' },
  { value: '2', label: '2 Stars (★★☆☆☆)' },
  { value: '1', label: '1 Star (★☆☆☆☆)' },
];

export default function AdminReviewsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [selectedReview, setSelectedReview] = useState(null);
  const [reviewToDelete, setReviewToDelete] = useState(null);

  // Debounced search state for API calls
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Construct query parameters
  const queryParams = useMemo(() => {
    const p = { limit: 100 };
    if (activeTab !== 'all') p.tab = activeTab;
    if (ratingFilter) p.rating = ratingFilter;
    if (debouncedSearch) p.search = debouncedSearch;
    return p;
  }, [activeTab, ratingFilter, debouncedSearch]);

  const {
    data,
    isFetching,
    refetch,
  } = useListAdminReviewsQuery(queryParams, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });

  const [deleteReviewMutation, { isLoading: isDeleting }] = useDeleteAdminReviewMutation();

  // Real-time WebSocket synchronization
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleUpdate = (payload) => {
      if (!payload || !payload.tags || payload.tags.includes('Reviews')) {
        refetch();
      }
    };

    socket.on('admin:update', handleUpdate);
    socket.on('review:update', handleUpdate);
    socket.on('review:new', handleUpdate);

    return () => {
      socket.off('admin:update', handleUpdate);
      socket.off('review:update', handleUpdate);
      socket.off('review:new', handleUpdate);
    };
  }, [refetch]);

  const items = data?.items || [];
  const stats = data?.stats || {};

  const totalReviews = stats.totalReviews ?? items.length;
  const avgRating = stats.avgRating ?? 0;
  const fiveStarCount = stats.fiveStarCount ?? items.filter((i) => i.rating === 5).length;
  const oneStarCount = stats.oneStarCount ?? items.filter((i) => i.rating <= 2).length;
  const reportedCount = stats.reportedCount ?? items.filter((i) => i.isReported).length;

  const handleDeleteConfirm = async () => {
    if (!reviewToDelete) return;
    try {
      await deleteReviewMutation(reviewToDelete.id || reviewToDelete._id).unwrap();
      toast.success('Review removed & average ratings recalculated!');
      setReviewToDelete(null);
      if (selectedReview?.id === reviewToDelete?.id) {
        setSelectedReview(null);
      }
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to remove review');
    }
  };

  const columns = [
    {
      key: 'reviewer',
      label: 'Reviewer',
      width: '22%',
      render: (_, row) => {
        const author = row.author;
        const name = author?.name || 'Anonymous User';
        const email = author?.email || '';
        const avatar = author?.avatarUrl;

        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#f8f4ec] border border-[#e3dccb] flex items-center justify-center font-black text-xs text-[#1a1a1a] shrink-0 overflow-hidden shadow-2xs">
              {avatar ? (
                <img src={avatar} alt={name} className="w-full h-full object-cover" />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs text-[#1a1a1a] truncate">{name}</span>
              {email ? (
                <span className="text-[10px] text-slate-500 truncate">{email}</span>
              ) : (
                <span className="text-[10px] text-slate-400">Customer</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'target',
      label: 'Target Entity',
      width: '26%',
      render: (_, row) => {
        const listing = row.targetListing;
        const targetUser = row.targetUser;

        if (listing) {
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-[#e3dccb] shrink-0 overflow-hidden flex items-center justify-center text-slate-400">
                {listing.thumbnail ? (
                  <img src={listing.thumbnail} alt={listing.title} className="w-full h-full object-cover" />
                ) : (
                  <FiPackage className="w-4 h-4" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <a
                  href={`/listing/${listing.id || listing._id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-xs text-slate-900 hover:text-[#d99a3d] truncate flex items-center gap-1 transition-colors"
                  title={listing.title}
                >
                  <span className="truncate">{listing.title}</span>
                  <FiExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                </a>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Product {listing.price ? `• ₹${listing.price}` : ''}
                </span>
              </div>
            </div>
          );
        }

        if (targetUser) {
          const isCreator = row.targetType === 'creator' || targetUser.roles?.includes('creator');
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#f8f4ec] border border-[#e3dccb] shrink-0 overflow-hidden flex items-center justify-center font-bold text-xs text-[#1a1a1a]">
                {targetUser.avatarUrl ? (
                  <img src={targetUser.avatarUrl} alt={targetUser.name} className="w-full h-full object-cover" />
                ) : (
                  <FiUser className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-xs text-slate-900 truncate">{targetUser.name}</span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {isCreator ? 'Creator Profile' : 'Vendor Business'}
                </span>
              </div>
            </div>
          );
        }

        return <span className="text-xs text-slate-400 italic">General Feedback</span>;
      },
    },
    {
      key: 'rating',
      label: 'Rating',
      width: '14%',
      render: (val) => {
        const ratingNum = Math.min(5, Math.max(1, Number(val) || 5));
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center text-amber-500 text-xs tracking-tighter">
              {[...Array(5)].map((_, idx) => (
                <span key={idx} className={idx < ratingNum ? 'text-amber-500' : 'text-slate-200'}>
                  ★
                </span>
              ))}
            </div>
            <span className="text-[10px] font-extrabold text-[#1a1a1a] bg-[#f8f4ec] border border-[#e3dccb] px-1.5 py-0.5 rounded w-fit">
              {ratingNum}.0 / 5.0
            </span>
          </div>
        );
      },
    },
    {
      key: 'comment',
      label: 'Review Content',
      width: '26%',
      render: (val, row) => (
        <div
          onClick={() => setSelectedReview(row)}
          className="cursor-pointer group flex flex-col"
          title="Click to view full review"
        >
          <span className="text-xs text-slate-700 line-clamp-2 leading-relaxed group-hover:text-slate-900 transition-colors">
            {val ? `"${val}"` : <span className="italic text-slate-400">Rating left without written review</span>}
          </span>
          {val && val.length > 60 && (
            <span className="text-[10px] font-bold text-[#d99a3d] group-hover:underline mt-0.5">
              Read full
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '12%',
      render: (_, row) => {
        if (row.isReported) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200 shadow-2xs">
              <FiFlag className="w-2.5 h-2.5 text-rose-500" />
              Reported
            </span>
          );
        }
        return <AdminStatusBadge status="verified" />;
      },
    },
  ];

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in pb-16 font-sans">
      {/* Top Header */}
      <AdminPageHeader
        icon={FiStar}
        title="Reviews & Ratings Moderation"
        subtitle="Audit user ratings, inspect customer feedback, and moderate reported reviews to maintain marketplace trust."
      />

      {/* Warm Bento-Brutalism KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Reviews */}
        <div className="bg-white rounded-2xl border border-[#e3dccb] p-4 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Total Reviews</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-2xs">
              <FiStar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#1a1a1a] tracking-tight">{totalReviews}</div>
            <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Published ratings</p>
          </div>
        </div>

        {/* Average Rating */}
        <div className="bg-white rounded-2xl border border-[#e3dccb] p-4 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Platform Average</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-2xs">
              <FiAward className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#1a1a1a] tracking-tight flex items-baseline gap-1">
              <span>{avgRating.toFixed(1)}</span>
              <span className="text-amber-500 text-base">★</span>
            </div>
            <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Out of 5.0 overall</p>
          </div>
        </div>

        {/* 5-Star Reviews */}
        <div className="bg-white rounded-2xl border border-[#e3dccb] p-4 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">5-Star Praise</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center shadow-2xs">
              <FiThumbsUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#1a1a1a] tracking-tight">{fiveStarCount}</div>
            <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
              {totalReviews > 0 ? Math.round((fiveStarCount / totalReviews) * 100) : 0}% top satisfaction
            </p>
          </div>
        </div>

        {/* Critical Reviews */}
        <div className="bg-white rounded-2xl border border-[#e3dccb] p-4 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Critical (1-2★)</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-2xs">
              <FiAlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-600 tracking-tight">{oneStarCount}</div>
            <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Needs investigation</p>
          </div>
        </div>

        {/* Reported Reviews */}
        <div className="bg-white rounded-2xl border border-[#e3dccb] p-4 flex flex-col justify-between shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Reported</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shadow-2xs">
              <FiFlag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#1a1a1a] tracking-tight">{reportedCount}</div>
            <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Community flags</p>
          </div>
        </div>
      </div>

      {/* Tabs & Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <AdminTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Star Rating Filter */}
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-[#e3dccb] rounded-full text-xs font-bold text-slate-700 focus:outline-none focus:border-[#1a1a1a] shadow-2xs cursor-pointer"
          >
            {RATING_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 rounded-full bg-white border border-[#e3dccb] text-slate-600 hover:text-[#1a1a1a] hover:bg-[#f8f4ec] transition shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh list"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Reviews Data Table */}
      <AdminDataTable
        columns={columns}
        data={items}
        loading={isFetching}
        searchPlaceholder="Search reviews by comment, author, or listing title..."
        searchValue={search}
        onSearch={setSearch}
        emptyMessage={
          debouncedSearch || ratingFilter || activeTab !== 'all'
            ? 'No reviews match your filter criteria.'
            : 'No customer reviews available yet.'
        }
        testId="reviews-table"
        actions={(row) => (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => setSelectedReview(row)}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all cursor-pointer border-none bg-transparent"
              title="View full review details"
            >
              <FiEye className="w-4 h-4" />
            </button>
            <button
              onClick={() => setReviewToDelete(row)}
              className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer border-none bg-transparent"
              title="Delete review"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      />

      {/* Review Details Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#e3dccb] max-w-lg w-full p-6 shadow-card flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[#e3dccb]">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-black text-base text-[#1a1a1a]">Review Details</h3>
                  {selectedReview.isReported && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-50 text-rose-600 border border-rose-200">
                      Reported
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 mt-0.5">
                  Submitted on {new Date(selectedReview.created_at || selectedReview.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedReview(null)}
                className="p-1.5 rounded-full hover:bg-[#f8f4ec] text-slate-400 hover:text-slate-600 transition"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Rating Stars Card */}
            <div className="p-4 rounded-2xl bg-[#f8f4ec] border border-[#e3dccb] flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Given Score</span>
                <span className="text-lg font-black text-[#1a1a1a]">{selectedReview.rating}.0 out of 5.0</span>
              </div>
              <div className="flex text-amber-500 text-lg">
                {[...Array(5)].map((_, idx) => (
                  <span key={idx} className={idx < selectedReview.rating ? 'text-amber-500' : 'text-slate-300'}>
                    ★
                  </span>
                ))}
              </div>
            </div>

            {/* Reviewer Information */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Review Author</span>
              <div className="p-3.5 rounded-2xl border border-[#e3dccb] bg-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f8f4ec] border border-[#e3dccb] flex items-center justify-center font-bold text-sm text-[#1a1a1a] shrink-0 overflow-hidden">
                  {selectedReview.author?.avatarUrl ? (
                    <img
                      src={selectedReview.author.avatarUrl}
                      alt={selectedReview.author?.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (selectedReview.author?.name || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-xs text-[#1a1a1a]">{selectedReview.author?.name || 'Anonymous'}</span>
                  <span className="text-[11px] text-slate-500">{selectedReview.author?.email || 'No email provided'}</span>
                  {selectedReview.author?.phone && (
                    <span className="text-[10px] text-slate-400">Phone: {selectedReview.author.phone}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Target Item Information */}
            {(selectedReview.targetListing || selectedReview.targetUser) && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Reviewed Subject</span>
                <div className="p-3.5 rounded-2xl border border-[#e3dccb] bg-white flex items-center gap-3">
                  {selectedReview.targetListing ? (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-[#e3dccb] flex items-center justify-center shrink-0 overflow-hidden text-slate-400">
                        {selectedReview.targetListing.thumbnail ? (
                          <img
                            src={selectedReview.targetListing.thumbnail}
                            alt={selectedReview.targetListing.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FiPackage className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <a
                          href={`/listing/${selectedReview.targetListing.id || selectedReview.targetListing._id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-xs text-slate-900 hover:text-[#d99a3d] truncate flex items-center gap-1"
                        >
                          <span className="truncate">{selectedReview.targetListing.title}</span>
                          <FiExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </a>
                        <span className="text-[10px] font-semibold text-slate-500">
                          Listing Item {selectedReview.targetListing.price ? `• ₹${selectedReview.targetListing.price}` : ''}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-[#f8f4ec] border border-[#e3dccb] flex items-center justify-center shrink-0 overflow-hidden font-bold text-sm text-[#1a1a1a]">
                        {selectedReview.targetUser?.avatarUrl ? (
                          <img
                            src={selectedReview.targetUser.avatarUrl}
                            alt={selectedReview.targetUser?.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FiUser className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs text-slate-900">{selectedReview.targetUser?.name}</span>
                        <span className="text-[10px] font-semibold text-slate-500">
                          {selectedReview.targetType === 'creator' ? 'Creator Profile' : 'Vendor Profile'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Comment Text Box */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Review Feedback</span>
              <div className="p-4 rounded-2xl bg-white border border-[#e3dccb] shadow-2xs">
                <p className="text-xs text-slate-800 leading-relaxed font-medium italic">
                  {selectedReview.comment ? `"${selectedReview.comment}"` : 'No written feedback was provided.'}
                </p>
              </div>
            </div>

            {/* Report Reasons (if any) */}
            {selectedReview.reports && selectedReview.reports.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">Reports Filed Against This Review</span>
                <div className="space-y-2">
                  {selectedReview.reports.map((rp, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                      <p className="font-bold text-[11px]">{rp.reason || 'Flagged review'}</p>
                      {rp.description && <p className="text-[10px] text-rose-600 mt-0.5">{rp.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[#e3dccb] mt-1">
              <button
                type="button"
                onClick={() => {
                  setReviewToDelete(selectedReview);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition border border-rose-200 cursor-pointer flex items-center gap-1.5"
              >
                <FiTrash2 className="w-3.5 h-3.5" />
                <span>Delete Review</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="px-5 py-2 rounded-xl bg-[#241b15] text-[#d99a3d] hover:bg-[#1a1a1a] text-xs font-extrabold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {reviewToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#e3dccb] max-w-sm w-full p-6 shadow-card flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 mx-auto flex items-center justify-center shadow-2xs">
              <FiTrash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-display font-black text-base text-[#1a1a1a]">Delete This Review?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This review will be permanently hidden, and the average rating and review counts on the associated product or vendor profile will automatically be recalculated.
              </p>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setReviewToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#e3dccb] text-slate-700 hover:bg-[#f8f4ec] text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-xs font-extrabold transition shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
