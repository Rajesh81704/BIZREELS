import React from 'react';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi NCR', 'Chandigarh', 'Puducherry', 'Jammu and Kashmir', 'Ladakh'
];

export default function CreatorAddressSection({
  address,
  setAddress
}) {
  const updateAddress = (field, value) => {
    setAddress((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#e3dccb] shadow-2xs space-y-5">
      {/* Section Header */}
      <div className="border-b border-[#e3dccb] pb-3.5 flex items-center gap-3">
        <span className="w-8 h-8 rounded-xl bg-[#241b15] text-[#d99a3d] flex items-center justify-center font-black text-xs shadow-xs">
          3
        </span>
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-[#1a1a1a]">
            STUDIO ADDRESS &amp; PHYSICAL LOCATION
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Physical address for local vendor discovery and physical product sample dispatches
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Street / Studio / House Address */}
        <div className="sm:col-span-2 md:col-span-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
            Studio / Flat / Street Address *
          </label>
          <input
            type="text"
            placeholder="e.g. Studio 402, Sunshine Arcade, MG Road"
            value={address.street || ''}
            onChange={(e) => updateAddress('street', e.target.value)}
            className="w-full bg-[#f8f4ec] border border-[#e3dccb] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1a1a1a] focus:outline-none focus:border-[#d99a3d]"
          />
        </div>

        {/* Area / Locality */}
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
            Area / Locality / Neighborhood
          </label>
          <input
            type="text"
            placeholder="e.g. Andheri West / Indiranagar"
            value={address.areaLocality || ''}
            onChange={(e) => updateAddress('areaLocality', e.target.value)}
            className="w-full bg-[#f8f4ec] border border-[#e3dccb] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1a1a1a] focus:outline-none focus:border-[#d99a3d]"
          />
        </div>

        {/* Base City */}
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
            Base City *
          </label>
          <input
            type="text"
            placeholder="e.g. Mumbai, Delhi, Bangalore"
            value={address.city || ''}
            onChange={(e) => updateAddress('city', e.target.value)}
            className="w-full bg-[#f8f4ec] border border-[#e3dccb] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1a1a1a] focus:outline-none focus:border-[#d99a3d]"
          />
        </div>

        {/* District */}
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
            District
          </label>
          <input
            type="text"
            placeholder="e.g. Mumbai Suburban"
            value={address.district || ''}
            onChange={(e) => updateAddress('district', e.target.value)}
            className="w-full bg-[#f8f4ec] border border-[#e3dccb] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1a1a1a] focus:outline-none focus:border-[#d99a3d]"
          />
        </div>

        {/* State */}
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
            State / Region
          </label>
          <input
            type="text"
            list="creator-indian-states-list"
            placeholder="Select or type State"
            value={address.state || ''}
            onChange={(e) => updateAddress('state', e.target.value)}
            className="w-full bg-[#f8f4ec] border border-[#e3dccb] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1a1a1a] focus:outline-none focus:border-[#d99a3d]"
          />
          <datalist id="creator-indian-states-list">
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state} />
            ))}
          </datalist>
        </div>

        {/* Pincode / Postal Code */}
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
            Pincode / Postal Code
          </label>
          <input
            type="text"
            maxLength={10}
            placeholder="e.g. 400053"
            value={address.pincode || ''}
            onChange={(e) => updateAddress('pincode', e.target.value)}
            className="w-full bg-[#f8f4ec] border border-[#e3dccb] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1a1a1a] focus:outline-none focus:border-[#d99a3d]"
          />
        </div>

        {/* Country */}
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
            Country
          </label>
          <input
            type="text"
            placeholder="India"
            value={address.country || 'India'}
            onChange={(e) => updateAddress('country', e.target.value)}
            className="w-full bg-[#f8f4ec] border border-[#e3dccb] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1a1a1a] focus:outline-none focus:border-[#d99a3d]"
          />
        </div>
      </div>
    </div>
  );
}
