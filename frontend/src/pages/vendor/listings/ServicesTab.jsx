import React, { useState } from 'react';
import {
  FiTool, FiEdit2, FiTrash2, FiCopy, FiEye, FiEyeOff,
  FiCalendar, FiMapPin, FiClock, FiDollarSign, FiAlertCircle,
  FiSearch, FiFilter, FiPlus
} from 'react-icons/fi';
import AdminStatusBadge from '../../../features/admin/components/AdminStatusBadge';

/**
 * ServicesTab — Dedicated view for Vendor Service Listings
 * Features specialized cards/table showing service delivery mode, duration, service area radius, emergency status, and booking metrics.
 */
export default function ServicesTab({
  services = [],
  loading = false,
  onCreateService,
  onEditService,
  onViewDetails,
  onToggleVisibility,
  onDeleteService,
  onDuplicateService,
}) {
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [pricingFilter, setPricingFilter] = useState('ALL');

  const filteredServices = services.filter((service) => {
    // Mode filter
    const mode = (service.serviceMode || service.serviceType || '').toLowerCase();
    if (modeFilter === 'home' && !mode.includes('home') && !mode.includes('doorstep')) return false;
    if (modeFilter === 'store' && !mode.includes('store') && !mode.includes('location')) return false;
    if (modeFilter === 'remote' && !mode.includes('online') && !mode.includes('remote') && !mode.includes('virtual')) return false;

    // Pricing filter
    const pType = (service.pricingType || service.pricingModel || '').toLowerCase();
    if (pricingFilter === 'fixed' && !pType.includes('fixed')) return false;
    if (pricingFilter === 'hourly' && !pType.includes('hourly')) return false;
    if (pricingFilter === 'quote' && !pType.includes('quote') && !pType.includes('inspection')) return false;

    // Search query
    if (search) {
      const q = search.toLowerCase();
      const titleMatch = (service.title || '').toLowerCase().includes(q);
      const catMatch = (service.category || '').toLowerCase().includes(q);
      if (!titleMatch && !catMatch) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Filters & Control Header */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#e3dccb] shadow-2xs">
        {/* Search */}
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search service name, category..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#f8f4ec] border border-[#e3dccb] rounded-xl text-xs font-semibold text-[#1a1a1a] focus:outline-none focus:border-[#d99a3d]"
          />
        </div>

        {/* Mode Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'All Modes' },
            { id: 'home', label: '🏠 At Home' },
            { id: 'store', label: '🏬 At Store' },
            { id: 'remote', label: '💻 Remote / Online' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setModeFilter(item.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border whitespace-nowrap ${
                modeFilter === item.id
                  ? 'bg-[#241b15] text-[#d99a3d] border-[#241b15]'
                  : 'bg-white text-slate-600 border-[#e3dccb] hover:bg-[#f8f4ec]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Create Service Action Button */}
        <button
          onClick={onCreateService}
          className="py-2.5 px-4 bg-[#241b15] text-[#d99a3d] hover:bg-[#3a2c22] font-black text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm border-none whitespace-nowrap"
        >
          <FiPlus className="w-4 h-4" /> + ADD NEW SERVICE
        </button>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 font-semibold text-sm">
          Loading Service Catalog...
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-[#e3dccb] p-8 space-y-3">
          <FiTool className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="font-black text-base text-[#1a1a1a]">No Services Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search || modeFilter !== 'ALL'
              ? 'No service listings match your selected filter criteria.'
              : 'Add your professional services (Salon, Home Repairs, Consulting, Healthcare) to start taking client bookings!'}
          </p>
          <button
            onClick={onCreateService}
            className="mt-2 inline-flex items-center gap-2 py-2.5 px-4 bg-[#241b15] text-[#d99a3d] text-xs font-bold rounded-xl border-none cursor-pointer"
          >
            <FiPlus className="w-4 h-4" /> Create First Service
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServices.map((service) => {
            const image = service.images?.[0] || service.image;
            const price = service.sellingPrice || service.price || 0;
            const duration = service.duration || '60 Mins';
            const radius = service.serviceRadius || '15 km';
            const mode = service.serviceMode || service.serviceType || 'At Store / On Location';
            const isEmergency = service.isEmergency === true;
            const isHidden = service.status === 'draft' || service.isActive === false;

            return (
              <div
                key={service._id || service.id}
                className={`bg-white rounded-2xl border transition hover:shadow-md flex flex-col justify-between overflow-hidden ${
                  isHidden ? 'border-dashed border-amber-300 opacity-80' : 'border-[#e3dccb]'
                }`}
              >
                <div>
                  {/* Banner Image / Fallback */}
                  <div className="relative h-44 bg-[#f8f4ec] overflow-hidden">
                    {image ? (
                      <img
                        src={image}
                        alt={service.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <FiTool className="w-10 h-10 mb-1" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Service Media</span>
                      </div>
                    )}

                    <div className="absolute top-3 left-3 bg-[#241b15] text-[#d99a3d] text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-sm">
                      🛠 SERVICE
                    </div>

                    <div className="absolute top-3 right-3">
                      <AdminStatusBadge status={service.status || 'published'} />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3">
                    <div>
                      <span className="text-[10px] font-extrabold text-[#d99a3d] uppercase tracking-wider">
                        {service.category || 'General Service'}{' '}
                        {service.subcategory ? `• ${service.subcategory}` : ''}
                      </span>
                      <h4 className="font-extrabold text-sm text-[#1a1a1a] line-clamp-1 mt-0.5">
                        {service.title}
                      </h4>
                    </div>

                    {/* Price & Pricing Type */}
                    <div className="flex items-baseline gap-2">
                      <span className="font-black text-lg text-emerald-700">
                        ₹{price.toLocaleString('en-IN')}
                      </span>
                      <span className="bg-[#f8f4ec] text-[#241b15] border border-[#e3dccb] px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">
                        {service.pricingType || service.pricingModel || 'Fixed Rate'}
                      </span>
                    </div>

                    {/* Delivery Specs Grid */}
                    <div className="grid grid-cols-2 gap-2 py-1 text-[11px] text-slate-600 bg-[#f8f4ec]/60 p-2.5 rounded-xl border border-[#e3dccb]">
                      <div className="flex items-center gap-1.5 truncate">
                        <FiMapPin className="w-3.5 h-3.5 text-[#d99a3d] shrink-0" />
                        <span className="font-semibold truncate">{mode}</span>
                      </div>

                      <div className="flex items-center gap-1.5 truncate">
                        <FiClock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="font-semibold truncate">{duration}</span>
                      </div>

                      <div className="flex items-center gap-1.5 truncate">
                        <FiMapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-semibold truncate">{radius} Radius</span>
                      </div>

                      <div className="flex items-center gap-1.5 truncate">
                        <FiAlertCircle
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isEmergency ? 'text-red-500' : 'text-slate-400'
                          }`}
                        />
                        <span
                          className={`font-semibold truncate ${
                            isEmergency ? 'text-red-600 font-bold' : ''
                          }`}
                        >
                          {isEmergency ? '24x7 Active' : 'Standard'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="px-4 py-3 bg-[#f8f4ec]/40 border-t border-[#e3dccb] flex items-center justify-between">
                  <button
                    onClick={() => onViewDetails(service)}
                    className="text-xs font-black text-[#241b15] hover:text-[#d99a3d] flex items-center gap-1 transition border-none bg-transparent cursor-pointer"
                  >
                    <FiEye className="w-3.5 h-3.5 text-[#d99a3d]" /> View Specs
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onEditService(service)}
                      title="Edit Service"
                      className="p-1.5 rounded-lg bg-white border border-[#e3dccb] text-slate-700 hover:text-[#241b15] hover:border-[#241b15] transition cursor-pointer"
                    >
                      <FiEdit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onDuplicateService(service)}
                      title="Duplicate Service"
                      className="p-1.5 rounded-lg bg-white border border-[#e3dccb] text-slate-700 hover:text-[#241b15] hover:border-[#241b15] transition cursor-pointer"
                    >
                      <FiCopy className="w-3.5 h-3.5 text-blue-600" />
                    </button>

                    <button
                      onClick={() => onToggleVisibility(service._id || service.id, service.status !== 'draft')}
                      title="Toggle Visibility"
                      className="p-1.5 rounded-lg bg-white border border-[#e3dccb] text-slate-700 hover:text-[#241b15] hover:border-[#241b15] transition cursor-pointer"
                    >
                      {isHidden ? (
                        <FiEye className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <FiEyeOff className="w-3.5 h-3.5 text-amber-600" />
                      )}
                    </button>

                    <button
                      onClick={() => onDeleteService(service._id || service.id, service.title)}
                      title="Delete Service"
                      className="p-1.5 rounded-lg bg-white border border-[#e3dccb] text-red-600 hover:bg-red-50 transition cursor-pointer"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
