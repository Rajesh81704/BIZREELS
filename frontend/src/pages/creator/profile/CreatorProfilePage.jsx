import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  FiUser, FiFileText, FiCheck, FiEye, FiStar, FiAward,
  FiMapPin, FiInstagram, FiVideo, FiShield, FiX, FiExternalLink
} from 'react-icons/fi';
import { useGetMeQuery, useUpdateProfileMutation } from '../../../features/auth/authApi';
import { setCredentials } from '../../../features/auth/authSlice';
import { api, tokenStore } from '../../../lib/api';
import toast from 'react-hot-toast';

import CreatorBasicInfoSection, { CREATOR_PROFESSIONS } from './components/CreatorBasicInfoSection';
import CreatorSocialMediaSection from './components/CreatorSocialMediaSection';
import CreatorAddressSection from './components/CreatorAddressSection';
import CreatorLanguagesSection from './components/CreatorLanguagesSection';

export default function CreatorProfilePage() {
  const dispatch = useDispatch();
  const { user: authUser } = useSelector((state) => state.auth);
  const { data: profileRes } = useGetMeQuery(undefined, {
    pollingInterval: 300000,
    skip: !authUser && !tokenStore.getUser(),
  });
  const [updateProfileApi] = useUpdateProfileMutation();

  const user = profileRes?.data?.user || profileRes?.user || authUser || {};
  const creatorProfile = user.creatorProfile || {};

  // Basic Info state
  const [name, setName] = useState('');
  const [profession, setProfession] = useState('Product Reel Creator');
  const [customProfession, setCustomProfession] = useState('');
  const [bio, setBio] = useState('');
  const [experienceYears, setExperienceYears] = useState('2');
  const [travelAvailable, setTravelAvailable] = useState('Yes');
  const [profilePhoto, setProfilePhoto] = useState('');

  // Languages Spoken state
  const [languages, setLanguages] = useState('English, Hindi');

  // Address Details state
  const [address, setAddress] = useState({
    street: '',
    areaLocality: '',
    city: 'Mumbai',
    district: '',
    state: 'Maharashtra',
    pincode: '',
    country: 'India'
  });

  // Social Media state
  const [socialMedia, setSocialMedia] = useState({
    instagram: { handleOrUrl: '', totalReels: '', totalFollowers: '' },
    facebook: { handleOrUrl: '', totalReels: '', totalFollowers: '' },
    customPlatforms: []
  });

  const [saving, setSaving] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    if (user && Object.keys(user).length > 0) {
      setName(creatorProfile.name || user.name || '');

      const currentProf =
        creatorProfile.profession ||
        creatorProfile.category ||
        user.profession ||
        user.occupation ||
        'Product Reel Creator';

      if (CREATOR_PROFESSIONS.includes(currentProf)) {
        setProfession(currentProf);
        setCustomProfession('');
      } else {
        setProfession('Other / Custom Creative Field');
        setCustomProfession(currentProf || '');
      }

      setBio(creatorProfile.bio || '');
      setExperienceYears(creatorProfile.experienceYears || '2');
      setTravelAvailable(creatorProfile.travelAvailable ? 'Yes' : 'No');
      setProfilePhoto(creatorProfile.profilePhoto || user.avatarUrl || user.profile_pic || '');

      const rawLang = creatorProfile.languages || user.language || 'English, Hindi';
      const normalizedLangStr = Array.isArray(rawLang)
        ? rawLang.join(', ')
        : typeof rawLang === 'string'
        ? rawLang
        : 'English, Hindi';
      setLanguages(normalizedLangStr);

      const existingAddr =
        typeof creatorProfile.address === 'object' && creatorProfile.address
          ? creatorProfile.address
          : {};
      const userLoc = user.location || {};
      setAddress({
        street: existingAddr.street || userLoc.address || '',
        areaLocality: existingAddr.areaLocality || '',
        city: existingAddr.city || creatorProfile.city || user.city || userLoc.city || 'Mumbai',
        district: existingAddr.district || userLoc.district || '',
        state: existingAddr.state || creatorProfile.state || userLoc.state || 'Maharashtra',
        pincode: existingAddr.pincode || creatorProfile.pincode || userLoc.pincode || '',
        country: existingAddr.country || 'India'
      });

      const rawSm = creatorProfile.socialMedia;
      let insta = { handleOrUrl: '', totalReels: '', totalFollowers: '' };
      let fb = { handleOrUrl: '', totalReels: '', totalFollowers: '' };
      let custom = [];

      if (Array.isArray(rawSm)) {
        rawSm.forEach((item) => {
          const pName = (item.platform || '').toLowerCase();
          if (pName === 'instagram') {
            insta = {
              handleOrUrl: item.handleOrUrl || item.url || item.handle || '',
              totalReels: item.totalReels !== undefined ? item.totalReels : '',
              totalFollowers: item.totalFollowers || item.followers || ''
            };
          } else if (pName === 'facebook') {
            fb = {
              handleOrUrl: item.handleOrUrl || item.url || item.handle || '',
              totalReels: item.totalReels !== undefined ? item.totalReels : '',
              totalFollowers: item.totalFollowers || item.followers || ''
            };
          } else {
            custom.push({
              id: item.id || Date.now() + Math.random().toString(),
              name: item.platform || 'Custom',
              handleOrUrl: item.handleOrUrl || item.url || item.handle || '',
              totalReels: item.totalReels !== undefined ? item.totalReels : '',
              totalFollowers: item.totalFollowers || item.followers || ''
            });
          }
        });
      } else if (rawSm && typeof rawSm === 'object') {
        if (rawSm.instagram) insta = { ...insta, ...rawSm.instagram };
        if (rawSm.facebook) fb = { ...fb, ...rawSm.facebook };
        if (Array.isArray(rawSm.customPlatforms)) custom = rawSm.customPlatforms;
      }
      setSocialMedia({
        instagram: insta,
        facebook: fb,
        customPlatforms: custom
      });
    }
  }, [creatorProfile, user]);

  // Profile Completeness Score (0 - 100%)
  const completeness = React.useMemo(() => {
    let score = 0;
    if (name) score += 20;
    if (profilePhoto) score += 20;
    if (bio) score += 20;
    if (address.city) score += 15;
    if (socialMedia.instagram?.handleOrUrl || socialMedia.facebook?.handleOrUrl) score += 15;
    if (languages) score += 10;
    return Math.min(score, 100);
  }, [name, profilePhoto, bio, address.city, socialMedia, languages]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    const toastId = toast.loading('Uploading profile picture...');
    try {
      const res = await api.post('/v1/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = res.data?.data?.url || res.data?.url || res.data?.data;
      if (url) {
        setProfilePhoto(url);
        toast.success('Profile picture uploaded!', { id: toastId });
      } else {
        throw new Error('Image URL not found in response');
      }
    } catch (err) {
      toast.error('Failed to upload profile picture.', { id: toastId });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const resolvedProf =
      profession === 'Other / Custom Creative Field' ? customProfession.trim() : profession;
    const normalizedCity = address.city?.trim() || 'Mumbai';

    const socialMediaList = [
      {
        platform: 'Instagram',
        handleOrUrl: socialMedia.instagram?.handleOrUrl?.trim() || '',
        totalReels:
          socialMedia.instagram?.totalReels !== '' ? Number(socialMedia.instagram.totalReels) : 0,
        totalFollowers: socialMedia.instagram?.totalFollowers?.trim() || ''
      },
      {
        platform: 'Facebook',
        handleOrUrl: socialMedia.facebook?.handleOrUrl?.trim() || '',
        totalReels:
          socialMedia.facebook?.totalReels !== '' ? Number(socialMedia.facebook.totalReels) : 0,
        totalFollowers: socialMedia.facebook?.totalFollowers?.trim() || ''
      },
      ...(socialMedia.customPlatforms || [])
        .filter((p) => p.name?.trim() || p.handleOrUrl?.trim())
        .map((p) => ({
          id: p.id,
          platform: p.name?.trim() || 'Custom',
          handleOrUrl: p.handleOrUrl?.trim() || '',
          totalReels: p.totalReels !== '' ? Number(p.totalReels) : 0,
          totalFollowers: p.totalFollowers?.trim() || ''
        }))
    ];

    try {
      const payload = {
        name,
        city: normalizedCity,
        profession: resolvedProf,
        occupation: resolvedProf,
        language: languages,
        location: {
          address: [address.street, address.areaLocality].filter(Boolean).join(', '),
          city: normalizedCity,
          district: address.district?.trim() || '',
          state: address.state?.trim() || '',
          pincode: address.pincode?.trim() || ''
        },
        creatorProfile: {
          ...creatorProfile,
          name,
          profession: resolvedProf,
          category: resolvedProf,
          bio,
          languages,
          experienceYears,
          city: normalizedCity,
          state: address.state?.trim() || '',
          pincode: address.pincode?.trim() || '',
          address: {
            street: address.street?.trim() || '',
            areaLocality: address.areaLocality?.trim() || '',
            city: normalizedCity,
            district: address.district?.trim() || '',
            state: address.state?.trim() || '',
            pincode: address.pincode?.trim() || '',
            country: address.country?.trim() || 'India'
          },
          socialMedia: socialMediaList,
          socialLinks: {
            instagram: socialMedia.instagram?.handleOrUrl?.trim() || '',
            facebook: socialMedia.facebook?.handleOrUrl?.trim() || ''
          },
          portfolio: {
            ...(creatorProfile.portfolio || {}),
            instagramLink: socialMedia.instagram?.handleOrUrl?.trim() || '',
            facebookLink: socialMedia.facebook?.handleOrUrl?.trim() || ''
          },
          travelAvailable: travelAvailable === 'Yes',
          profilePhoto,
          updatedAt: new Date().toISOString()
        }
      };

      const res = await updateProfileApi(payload).unwrap();
      dispatch(setCredentials({ user: res.user || res.data?.user }));
      toast.success('Creator profile updated successfully!');
    } catch (err) {
      console.error('Failed to update creator profile:', err);
      toast.error(err?.data?.message || 'Failed to update creator profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans p-3 sm:p-6 min-h-screen">
      {/* Warm Gold & Dark Espresso Banner */}
      <div className="bg-[#241b15] text-white p-6 rounded-2xl border-2 border-[#241b15] shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black bg-[#d99a3d] text-[#241b15] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              ✦ CREATOR STUDIO PORTAL
            </span>
            <span className="text-[10px] font-bold text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-full">
              Verified Marketplace Profile
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-white">
            CREATOR PROFILE &amp; BRAND BRANDING
          </h1>
          <p className="text-xs text-slate-300 max-w-lg leading-relaxed">
            Manage your stage identity, social channel metrics, physical studio address, and language fluencies to get hired for video reels.
          </p>

          {/* Profile Completeness Bar */}
          <div className="pt-2 flex items-center gap-3 max-w-sm">
            <div className="flex-1 bg-white/10 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#d99a3d] h-full transition-all duration-500 rounded-full"
                style={{ width: `${completeness}%` }}
              />
            </div>
            <span className="text-[11px] font-black text-[#d99a3d]">{completeness}% Complete</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto relative z-10">
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 border border-white/20 cursor-pointer"
          >
            <FiEye className="w-4 h-4 text-[#d99a3d]" />
            <span>Preview Card</span>
          </button>
          <Link
            to="/creator-marketplace"
            target="_blank"
            className="px-4 py-2.5 bg-[#d99a3d] hover:bg-[#b8802e] text-[#241b15] text-xs font-black rounded-xl transition flex items-center justify-center gap-2 shadow-md border-none"
          >
            <FiExternalLink className="w-4 h-4" />
            <span>Marketplace ↗</span>
          </Link>
        </div>
      </div>

      {/* Navigation Segmented Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e3dccb] pb-3 flex-wrap">
        <Link
          to="/creator/profile"
          className="px-4 py-2.5 rounded-xl text-xs font-black bg-[#241b15] text-[#d99a3d] shadow-2xs flex items-center gap-2"
        >
          <FiUser className="w-4 h-4 text-[#d99a3d]" />
          <span>Basic &amp; Social Profile</span>
        </Link>
        <Link
          to="/creator/onboarding-details"
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-[#1a1a1a] hover:bg-[#f8f4ec] transition flex items-center gap-2 border border-[#e3dccb]"
        >
          <FiFileText className="w-4 h-4 text-slate-400" />
          <span>Full Creator Setup Details</span>
        </Link>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: BASIC INFORMATION & BIO */}
        <CreatorBasicInfoSection
          name={name}
          setName={setName}
          profession={profession}
          setProfession={setProfession}
          customProfession={customProfession}
          setCustomProfession={setCustomProfession}
          experienceYears={experienceYears}
          setExperienceYears={setExperienceYears}
          travelAvailable={travelAvailable}
          setTravelAvailable={setTravelAvailable}
          bio={bio}
          setBio={setBio}
          profilePhoto={profilePhoto}
          handlePhotoUpload={handlePhotoUpload}
        />

        {/* SECTION 2: SOCIAL MEDIA STATS & HANDLES */}
        <CreatorSocialMediaSection
          socialMedia={socialMedia}
          setSocialMedia={setSocialMedia}
        />

        {/* SECTION 3: STUDIO ADDRESS & PHYSICAL LOCATION */}
        <CreatorAddressSection
          address={address}
          setAddress={setAddress}
        />

        {/* SECTION 4: LANGUAGES SPOKEN */}
        <CreatorLanguagesSection
          languages={languages}
          setLanguages={setLanguages}
        />

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 bg-[#241b15] text-[#d99a3d] border border-[#241b15] rounded-2xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-[#342820] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <FiCheck size={18} />
          <span>{saving ? 'Saving Creator Profile...' : 'Save Creator Profile'}</span>
        </button>
      </form>

      {/* PUBLIC MARKETPLACE CARD PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#e3dccb] overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-[#241b15] text-white">
              <span className="text-xs font-black text-[#d99a3d] uppercase tracking-wider">
                Public Marketplace Card Preview
              </span>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white border-none cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Card Content */}
            <div className="p-6 space-y-4 text-center">
              <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden border-2 border-[#d99a3d] shadow-sm bg-[#f8f4ec]">
                <img
                  src={profilePhoto || '/logo.png'}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h3 className="font-extrabold text-base text-[#1a1a1a]">{name || 'Creator Name'}</h3>
                <p className="text-xs font-bold text-[#d99a3d] uppercase tracking-wider mt-0.5">
                  {profession === 'Other / Custom Creative Field' ? customProfession || 'Creator' : profession}
                </p>
                <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
                  <FiMapPin className="w-3.5 h-3.5 text-slate-400" />
                  {address.city || 'Mumbai'}, {address.state || 'Maharashtra'}
                </p>
              </div>

              {/* Badges */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="px-3 py-1 bg-[#f8f4ec] text-[#241b15] border border-[#e3dccb] rounded-full text-[10px] font-extrabold">
                  {experienceYears} Years Exp
                </span>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-extrabold">
                  {travelAvailable === 'Yes' ? '✈️ Shoots Nationwide' : '📍 Local Shoots'}
                </span>
              </div>

              {bio ? (
                <p className="text-xs text-slate-600 line-clamp-3 bg-[#f8f4ec] p-3 rounded-xl border border-[#e3dccb] text-left italic">
                  "{bio}"
                </p>
              ) : null}

              <div className="pt-2">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="w-full py-2.5 bg-[#241b15] text-[#d99a3d] text-xs font-black rounded-xl border-none cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
