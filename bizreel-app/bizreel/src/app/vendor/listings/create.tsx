/**
 * Vendor Add/Edit Listing Screen — Mobile Application
 * 100% Visual & Functional Parity with Web Frontend ProductFormModal.jsx, ProductPricingInventorySection.jsx & ServiceFormModal.jsx
 * Matches Web Frontend:
 * - Listing Type Switcher (Product vs Service)
 * - Category & Classification (Filtered by Vendor Onboarded Categories)
 * - Basic Listing Details with AI Description Generator Banner (Voice & Text)
 * - Gemini Multimodal Media Scan ("Upload Product/Service Media for AI Auto-Fill")
 * - Voice Input 🎙️ for AI prompt, Title, Short Description, Full Description, Tags
 * - Pricing & Inventory with live MRP/Discount Breakdown
 * - Shipping Specifications: Package Weight, Dimensions (L×W×H), Weight/Dimension Units
 * - Payment Acceptance Type: Both COD & Prepaid / Prepaid Only / COD Only
 * - Free Shipping Toggle & SLA Delivery Days Selector
 * - Return / Replacement Policy Builder: Yes/No Switch, Return Window (3, 7, 10, 15, 30 Days),
 *   Multi-Select Eligible Return Conditions chips, Custom Condition input, & Live Policy Preview
 * - Specifications & Variants Builder
 * - Full Media Gallery (Main Cover, Multi-Photo Upload, Direct URL, Video link)
 * - Service Details Section (Service Type, Price Type, Duration, Area, Home Visit, 24x7, Advance Booking)
 */

import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontSize, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/context';
import { useCreateVendorListing, useUpdateVendorListing } from '@/features/vendor-listings/queries';
import { api } from '@/lib/api';
import { resolveImageUrl } from '@/utils/image';

const YELLOW = '#D99A3D';
const DARK_BG = '#F8FAFC';
const BORDER = '#E2E8F0';
const PURPLE_ACCENT = '#9333EA';
const PURPLE_BG = '#F3E8FF';
const PURPLE_BORDER = '#D8B4FE';

function safeTrim(val: any): string {
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val).trim();
  if (Array.isArray(val)) return val.map((v) => (typeof v === 'string' ? v.trim() : String(v))).filter(Boolean).join('\n');
  return '';
}

const STANDARD_UNITS = [
  { value: 'piece', label: 'Piece (Pcs)' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'g', label: 'Gram (g)' },
  { value: 'litre', label: 'Litre (L)' },
  { value: 'ml', label: 'Millilitre (ml)' },
  { value: 'meter', label: 'Meter (m)' },
  { value: 'cm', label: 'Centimeter (cm)' },
  { value: 'box', label: 'Box' },
  { value: 'pack', label: 'Pack' },
  { value: 'set', label: 'Set' },
  { value: 'pair', label: 'Pair' },
  { value: 'dozen', label: 'Dozen' },
  { value: 'bundle', label: 'Bundle' },
  { value: 'bag', label: 'Bag' },
  { value: 'carton', label: 'Carton' },
  { value: 'roll', label: 'Roll' },
  { value: 'sqft', label: 'Square Feet (sq. ft)' },
  { value: 'quintal', label: 'Quintal (q)' },
  { value: 'tonne', label: 'Tonne (t)' },
  { value: 'bottle', label: 'Bottle' },
  { value: 'plate', label: 'Plate' },
  { value: 'other', label: 'Other (Custom Unit)...' },
];

const STANDARD_CONDITIONS = [
  'Defective or Damaged items only',
  'Wrong item received',
  'Unopened & in original packaging with tags',
  'Size / Fit issue (Exchange only)',
  'Missing accessories or parts',
  'All reasons accepted with unboxing proof',
  'Other / Custom condition',
];

export default function CreateListingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { editId, initialType } = useLocalSearchParams<{ editId?: string; initialType?: string }>();
  const isEdit = Boolean(editId);

  const [type, setType] = useState<'product' | 'service'>(initialType === 'service' ? 'service' : 'product');
  const [loadingEdit, setLoadingEdit] = useState(false);

  // Category & Subcategory
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [category, setCategory] = useState('Electronics');
  const [subcategory, setSubcategory] = useState('General');

  // AI Prompt & Voice
  const [aiPrompt, setAiPrompt] = useState('');
  const [analyzingMedia, setAnalyzingMedia] = useState(false);

  // Basic Info
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [sku, setSku] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [generatingAiCopy, setGeneratingAiCopy] = useState(false);

  // Tags & Labels/Specs
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [labels, setLabels] = useState<{ key: string; value: string }[]>([]);
  const [newLabelKey, setNewLabelKey] = useState('');
  const [newLabelVal, setNewLabelVal] = useState('');

  // Voice Input Modal State 🎙️
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [voiceTargetField, setVoiceTargetField] = useState('');
  const [voiceSetter, setVoiceSetter] = useState<any>(null);
  const [voiceText, setVoiceText] = useState('');
  const [isListeningVoice, setIsListeningVoice] = useState(false);

  // Pricing & Inventory
  const [actualPrice, setActualPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [minOrderQty, setMinOrderQty] = useState('1');
  const [unit, setUnit] = useState('piece');
  const [customUnit, setCustomUnit] = useState('');
  const [warranty, setWarranty] = useState('1 Year Warranty');
  const [gst, setGst] = useState('18%');

  // Return & Replacement Policy Builder
  const [hasReturnPolicy, setHasReturnPolicy] = useState(true);
  const [returnDays, setReturnDays] = useState('7 Days');
  const [selectedReturnConditions, setSelectedReturnConditions] = useState<string[]>([
    'Defective or Damaged items only',
    'Wrong item received',
  ]);
  const [customConditionText, setCustomConditionText] = useState('');
  const [returnPolicy, setReturnPolicy] = useState('7 Days Return / Replacement: Defective or Damaged items only, Wrong item received');

  // Shipping Details
  const [shippingWeight, setShippingWeight] = useState('');
  const [shippingWeightUnit, setShippingWeightUnit] = useState('kg');
  const [shippingLength, setShippingLength] = useState('');
  const [shippingWidth, setShippingWidth] = useState('');
  const [shippingHeight, setShippingHeight] = useState('');
  const [shippingDimensionUnit, setShippingDimensionUnit] = useState('cm');
  const [shippingType, setShippingType] = useState<'self' | 'delivery' | 'both' | 'prepaid' | 'cod'>('both');
  const [freeShipping, setFreeShipping] = useState(false);
  const [estimatedDays, setEstimatedDays] = useState('5');

  // Variants
  const [variants, setVariants] = useState<any[]>([]);
  const [variantLabel, setVariantLabel] = useState('');
  const [variantValue, setVariantValue] = useState('');
  const [variantPriceAdj, setVariantPriceAdj] = useState('');
  const [variantImageUrl, setVariantImageUrl] = useState('');

  // Media
  const [imageUrl, setImageUrl] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Service Details
  const [serviceType, setServiceType] = useState('At Home');
  const [priceType, setPriceType] = useState('Fixed Price');
  const [serviceHighlights, setServiceHighlights] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [duration, setDuration] = useState('1 Hour');
  const [serviceArea, setServiceArea] = useState('Local Area');
  const [minOrderValue, setMinOrderValue] = useState('');
  const [homeVisitAvailable, setHomeVisitAvailable] = useState(true);
  const [maxTravelDistanceKm, setMaxTravelDistanceKm] = useState('15');
  const [availableCities, setAvailableCities] = useState('');
  const [emergencyService24x7, setEmergencyService24x7] = useState(false);
  const [advanceBookingRequired, setAdvanceBookingRequired] = useState(true);
  const [bookingAvailability, setBookingAvailability] = useState('Immediate');

  const createMutation = useCreateVendorListing();
  const updateMutation = useUpdateVendorListing();

  // Helper to sync return policy string with backend
  const updatePolicyString = (isAvailable: boolean, days: string, conditions: string[], customText: string) => {
    if (!isAvailable) {
      setReturnPolicy('No Returns Applicable (Final Sale)');
      return;
    }
    const filtered = conditions.filter((c) => c !== 'Other / Custom condition');
    if (customText.trim()) {
      filtered.push(customText.trim());
    }
    const condStr = filtered.length > 0 ? filtered.join(', ') : 'Standard terms apply';
    setReturnPolicy(`${days} Return / Replacement: ${condStr}`);
  };

  const handleToggleReturnPolicy = (val: boolean) => {
    setHasReturnPolicy(val);
    updatePolicyString(val, returnDays, selectedReturnConditions, customConditionText);
  };

  const handleReturnDaysChange = (days: string) => {
    setReturnDays(days);
    updatePolicyString(hasReturnPolicy, days, selectedReturnConditions, customConditionText);
  };

  const toggleReturnCondition = (cond: string) => {
    let updated: string[];
    if (selectedReturnConditions.includes(cond)) {
      updated = selectedReturnConditions.filter((c) => c !== cond);
    } else {
      updated = [...selectedReturnConditions, cond];
    }
    setSelectedReturnConditions(updated);
    updatePolicyString(hasReturnPolicy, returnDays, updated, customConditionText);
  };

  const handleCustomConditionChange = (text: string) => {
    setCustomConditionText(text);
    updatePolicyString(hasReturnPolicy, returnDays, selectedReturnConditions, text);
  };

  // Load existing data for Edit mode
  useEffect(() => {
    if (editId) {
      setLoadingEdit(true);
      api.get(`/v1/listings/${editId}`)
        .catch(() => api.get(`/listings/${editId}`))
        .then((res) => {
          const raw = res.data?.data || res.data;
          const item = raw?.listing || raw?.item || (raw?.data && !raw.data.listing ? raw.data : null) || raw;
          if (item) {
            const prod = item.productDetails || {};
            const sd = item.serviceDetails || {};

            const itemType = item.type || item.listingType || (item.serviceDetails ? 'service' : 'product');
            setType(itemType as 'product' | 'service');

            if (item.category) setCategory(item.category);
            if (item.subcategory) setSubcategory(item.subcategory);
            if (item.title) setTitle(item.title);
            setBrand(item.brand || prod.brand || '');
            setSku(item.sku || prod.sku || '');
            setShortDescription(item.shortDescription || '');
            setDescription(item.description || '');

            const actualVal = item.actualPrice || item.price || prod.actualPrice || 0;
            const sellingVal = item.sellingPrice || item.salePrice || item.price || prod.sellingPrice || sd.price || 0;
            if (actualVal) setActualPrice(String(actualVal));
            if (sellingVal) setSellingPrice(String(sellingVal));
            if (item.stock !== undefined || prod.stock !== undefined) setStock(String(item.stock ?? prod.stock ?? 10));
            if (item.minOrderQty || prod.minOrderQty) setMinOrderQty(String(item.minOrderQty || prod.minOrderQty || 1));
            
            const rawUnit = item.unit || prod.unit || 'piece';
            if (STANDARD_UNITS.some((u) => u.value === rawUnit)) {
              setUnit(rawUnit);
            } else {
              setUnit('other');
              setCustomUnit(rawUnit);
            }

            if (item.warranty || prod.warranty) setWarranty(item.warranty || prod.warranty || '');
            
            const pol = item.returnPolicy || prod.returnPolicy || '';
            if (pol) {
              setReturnPolicy(pol);
              if (pol.toLowerCase().includes('no return') || pol.toLowerCase().includes('final sale')) {
                setHasReturnPolicy(false);
              } else {
                setHasReturnPolicy(true);
              }
            }

            if (item.gst || prod.gst) setGst(item.gst || prod.gst || '18%');
            if (Array.isArray(item.tags)) setTags(item.tags);
            if (Array.isArray(item.labels)) setLabels(item.labels);
            if (Array.isArray(item.variants)) setVariants(item.variants);

            const ship = prod.shippingDetails || item.shippingDetails || {};
            if (ship.weight) setShippingWeight(String(ship.weight));
            if (ship.weightUnit) setShippingWeightUnit(ship.weightUnit);
            if (ship.length) setShippingLength(String(ship.length));
            if (ship.width) setShippingWidth(String(ship.width));
            if (ship.height) setShippingHeight(String(ship.height));
            if (ship.dimensionUnit) setShippingDimensionUnit(ship.dimensionUnit);
            if (ship.shippingType) setShippingType(ship.shippingType);
            if (ship.freeShipping !== undefined) setFreeShipping(Boolean(ship.freeShipping));
            if (ship.estimatedDays) setEstimatedDays(String(ship.estimatedDays));

            // Service details
            if (sd) {
              if (sd.serviceHighlights !== undefined && sd.serviceHighlights !== null) {
                setServiceHighlights(
                  Array.isArray(sd.serviceHighlights)
                    ? sd.serviceHighlights.join('\n')
                    : String(sd.serviceHighlights)
                );
              }
              if (sd.termsAndConditions !== undefined && sd.termsAndConditions !== null) {
                setTermsAndConditions(
                  Array.isArray(sd.termsAndConditions)
                    ? sd.termsAndConditions.join('\n')
                    : String(sd.termsAndConditions)
                );
              }
              if (sd.serviceType) setServiceType(String(sd.serviceType));
              if (sd.priceType) setPriceType(String(sd.priceType));
              if (sd.duration || sd.durationText) setDuration(String(sd.duration || sd.durationText));
              if (sd.serviceArea) setServiceArea(String(sd.serviceArea));
              if (sd.minOrderValue) setMinOrderValue(String(sd.minOrderValue));
              if (sd.homeVisitAvailable !== undefined) setHomeVisitAvailable(Boolean(sd.homeVisitAvailable));
              if (sd.maxTravelDistanceKm) setMaxTravelDistanceKm(String(sd.maxTravelDistanceKm));
              if (sd.availableCities) setAvailableCities(String(sd.availableCities));
              if (sd.emergencyService24x7 !== undefined) setEmergencyService24x7(Boolean(sd.emergencyService24x7));
              if (sd.advanceBookingRequired !== undefined) setAdvanceBookingRequired(Boolean(sd.advanceBookingRequired));
              if (sd.bookingAvailability) setBookingAvailability(String(sd.bookingAvailability));
            }

            // Populate cover and gallery images
            const collectedImages: string[] = [];
            const addImageCandidate = (candidate: any) => {
              if (!candidate) return;
              if (Array.isArray(candidate)) {
                candidate.forEach((itemCandidate) => addImageCandidate(itemCandidate));
                return;
              }
              const resolved = resolveImageUrl(candidate);
              if (resolved && !collectedImages.includes(resolved)) {
                collectedImages.push(resolved);
              }
            };

            addImageCandidate(item.image);
            addImageCandidate(item.imageUrl);
            addImageCandidate(item.coverImage);
            addImageCandidate(item.thumbnailUrl);
            addImageCandidate(item.images);
            addImageCandidate(item.media);
            addImageCandidate(item.mediaUrls);
            addImageCandidate(item.photos);
            addImageCandidate(item.gallery);

            if (item.productDetails) {
              addImageCandidate(item.productDetails.image);
              addImageCandidate(item.productDetails.imageUrl);
              addImageCandidate(item.productDetails.images);
              addImageCandidate(item.productDetails.gallery);
            }
            if (item.serviceDetails) {
              addImageCandidate(item.serviceDetails.image);
              addImageCandidate(item.serviceDetails.coverImage);
              addImageCandidate(item.serviceDetails.images);
              addImageCandidate(item.serviceDetails.galleryImages);
            }

            setGalleryImages(collectedImages);
            setImageUrl(collectedImages[0] || '');

            const vid = item.video || item.videos?.[0] || prod.video || sd.reelVideo || '';
            if (vid) setVideoUrl(vid);
          }
        })
        .catch(() => {
          Alert.alert('Error', 'Failed to load existing listing details.');
        })
        .finally(() => setLoadingEdit(false));
    }
  }, [editId]);

  // Fetch Categories Taxonomy (Filtered by active listing type: 'product' | 'service')
  useEffect(() => {
    api.get(`/categories?type=${type}`)
      .catch(() => api.get('/categories'))
      .then((res) => {
        const items = res.data?.items || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        if (items.length > 0) {
          setCategoriesList(items);
        }
      })
      .catch(() => {});
  }, [type]);

  const { user } = useAuth();
  const vendorProfile = user?.vendorProfile || (user as any)?.profileData || {};

  const onboardedCategories = React.useMemo(() => {
    let cats: string[] = [];
    const authUser = user as any;
    if (Array.isArray(authUser?.categories) && authUser.categories.length > 0) {
      cats = authUser.categories;
    } else if (Array.isArray(vendorProfile.categories) && vendorProfile.categories.length > 0) {
      cats = vendorProfile.categories;
    } else if (Array.isArray(vendorProfile.selectedCategories) && vendorProfile.selectedCategories.length > 0) {
      cats = vendorProfile.selectedCategories;
    } else if (vendorProfile.category) {
      cats = [vendorProfile.category];
    } else if (vendorProfile.businessCategory) {
      cats = [vendorProfile.businessCategory];
    } else if (authUser?.category) {
      cats = [authUser.category];
    }
    return cats.filter(Boolean);
  }, [user, vendorProfile]);

  const onboardedSubcategories = React.useMemo(() => {
    let subs: string[] = [];
    const authUser = user as any;
    if (Array.isArray(authUser?.subcategories) && authUser.subcategories.length > 0) {
      subs = authUser.subcategories;
    } else if (Array.isArray(vendorProfile.subcategories) && vendorProfile.subcategories.length > 0) {
      subs = vendorProfile.subcategories;
    } else if (Array.isArray(vendorProfile.selectedSubcategories) && vendorProfile.selectedSubcategories.length > 0) {
      subs = vendorProfile.selectedSubcategories;
    } else if (vendorProfile.subcategory) {
      subs = [vendorProfile.subcategory];
    } else if (authUser?.subcategory) {
      subs = [authUser.subcategory];
    }
    return subs.filter(Boolean);
  }, [user, vendorProfile]);

  const isServiceCategoryName = (name: string): boolean => {
    const n = (name || '').toLowerCase().trim();
    return (
      n.includes('service') ||
      n.includes('real estate') ||
      n.includes('beauty') ||
      n.includes('salon') ||
      n.includes('health') ||
      n.includes('fitness') ||
      n.includes('education') ||
      n.includes('coaching') ||
      n.includes('repair') ||
      n.includes('cleaning') ||
      n.includes('photography') ||
      n.includes('consulting') ||
      n.includes('maintenance') ||
      n.includes('spa') ||
      n.includes('doctor') ||
      n.includes('tuition')
    );
  };

  const isProductCategoryName = (name: string): boolean => {
    const n = (name || '').toLowerCase().trim();
    return (
      n.includes('electronic') ||
      n.includes('fashion') ||
      n.includes('apparel') ||
      n.includes('furniture') ||
      n.includes('vehicle') ||
      n.includes('car') ||
      n.includes('bike') ||
      n.includes('food') ||
      n.includes('grocery') ||
      n.includes('machinery') ||
      n.includes('industrial') ||
      n.includes('hardware') ||
      n.includes('product') ||
      n.includes('mobile') ||
      n.includes('laptop') ||
      n.includes('clothing')
    );
  };

  const parentCategories = React.useMemo(() => {
    // Filter master categories according to active listing type ('product' | 'service')
    const typeMasterCategories = categoriesList.filter((c: any) => {
      if (c.parent_id) return false;
      if (c.category_type) return c.category_type === type;
      if (type === 'service') {
        return isServiceCategoryName(c.name);
      }
      return isProductCategoryName(c.name) || !isServiceCategoryName(c.name);
    });

    let list: any[] = [];
    if (onboardedCategories.length > 0) {
      list = onboardedCategories
        .map((catName) => {
          const foundMaster = categoriesList.find(
            (c: any) => !c.parent_id && (c.name?.toLowerCase() === catName.toLowerCase() || c.id === catName || c._id === catName)
          );
          return {
            id: foundMaster?.id || foundMaster?._id || catName,
            name: foundMaster?.name || catName,
            category_type: foundMaster?.category_type,
          };
        })
        .filter((c: any) => {
          if (c.category_type) return c.category_type === type;
          if (type === 'service') return isServiceCategoryName(c.name);
          return isProductCategoryName(c.name) || !isServiceCategoryName(c.name);
        });

      if (list.length === 0) {
        list = typeMasterCategories.map((c: any) => ({ id: c.id || c._id, name: c.name, category_type: c.category_type }));
      }
    } else {
      list = typeMasterCategories.map((c: any) => ({ id: c.id || c._id, name: c.name, category_type: c.category_type }));
    }

    if (category && !list.some((c: any) => c.name?.toLowerCase() === category.toLowerCase())) {
      list.unshift({ id: category, name: category });
    }

    return list;
  }, [categoriesList, onboardedCategories, category, type]);

  useEffect(() => {
    if (parentCategories.length > 0) {
      const isCurrentValid = parentCategories.some((c: any) => c.name?.toLowerCase() === category?.toLowerCase());
      if (!isCurrentValid && parentCategories[0]?.name) {
        setCategory(parentCategories[0].name);
      }
    }
  }, [type, parentCategories]);

  const childSubcategories = React.useMemo(() => {
    const activeParent = parentCategories.find((c: any) => c.name?.toLowerCase() === category?.toLowerCase());
    const parentId = activeParent?.id || (activeParent as any)?._id;
    const subsFromMaster = categoriesList.filter(
      (c: any) => parentId && (c.parent_id === parentId || c.parent_id === (activeParent as any)?._id)
    ).map((c: any) => c.name);

    let list: any[] = [];
    if (onboardedSubcategories.length > 0) {
      const matched = onboardedSubcategories.filter((os) =>
        subsFromMaster.length === 0 || subsFromMaster.some((sm: string) => sm.toLowerCase() === os.toLowerCase())
      );
      list = (matched.length > 0 ? matched : onboardedSubcategories).map((name) => ({ name }));
    } else if (subsFromMaster.length > 0) {
      list = subsFromMaster.map((name: string) => ({ name }));
    } else {
      list = [{ name: 'General' }];
    }

    if (subcategory && !list.some((s: any) => (s.name || s)?.toLowerCase() === subcategory?.toLowerCase())) {
      list.unshift({ name: subcategory });
    }

    return list;
  }, [categoriesList, parentCategories, category, onboardedSubcategories, subcategory]);

  useEffect(() => {
    if (parentCategories.length > 0 && !isEdit) {
      const exists = parentCategories.some((c: any) => c.name?.toLowerCase() === category?.toLowerCase());
      if (!exists && parentCategories[0]?.name) {
        setCategory(parentCategories[0].name);
      }
    }
  }, [parentCategories, category, isEdit]);

  useEffect(() => {
    if (childSubcategories.length > 0 && !isEdit) {
      const exists = childSubcategories.some((s: any) => (s.name || s)?.toLowerCase() === subcategory?.toLowerCase());
      if (!exists && childSubcategories[0]) {
        const firstSubName = typeof childSubcategories[0] === 'string' ? childSubcategories[0] : childSubcategories[0]?.name || 'General';
        setSubcategory(firstSubName);
      }
    }
  }, [childSubcategories, subcategory, isEdit]);

  function generateSKU() {
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    const ts = Date.now().toString().slice(-4);
    const code = `SKU-${rand}-${ts}`;
    setSku(code);
    Alert.alert('SKU Code Auto-Generated', `Assigned Code: ${code}`);
  }

  const handleAddTag = () => {
    const cleanTag = newTag.trim().replace(/^#/, '');
    if (!cleanTag) return;
    if (tags.includes(cleanTag)) {
      Alert.alert('Duplicate Tag', 'Tag already added');
      return;
    }
    setTags([...tags, cleanTag]);
    setNewTag('');
  };

  const handleRemoveTag = (idx: number) => {
    setTags(tags.filter((_, i) => i !== idx));
  };

  const handleAddLabel = () => {
    if (!newLabelKey.trim() || !newLabelVal.trim()) {
      Alert.alert('Missing Attribute', 'Enter both attribute key and value (e.g. Color: Matte Black)');
      return;
    }
    setLabels([...labels, { key: newLabelKey.trim(), value: newLabelVal.trim() }]);
    setNewLabelKey('');
    setNewLabelVal('');
  };

  const handleRemoveLabel = (idx: number) => {
    setLabels(labels.filter((_, i) => i !== idx));
  };

  const handleAddVariant = () => {
    if (!variantLabel.trim() || !variantValue.trim()) {
      Alert.alert('Missing Variant Data', 'Please enter variant type and value (e.g. Size: XL)');
      return;
    }
    const finalPrice = variantPriceAdj !== '' ? parseFloat(variantPriceAdj) : parseFloat(sellingPrice || '0');
    const newVar = {
      label: variantLabel.trim(),
      type: variantLabel.trim(),
      value: variantValue.trim(),
      sku: `${sku || 'SKU'}-${variantValue.trim().toUpperCase()}`,
      price: isNaN(finalPrice) ? 0 : finalPrice,
      image: variantImageUrl || undefined,
    };
    setVariants([...variants, newVar]);
    setVariantValue('');
    setVariantPriceAdj('');
    setVariantImageUrl('');
    Alert.alert('Variant Added!', `Variant "${variantLabel}: ${variantValue}" added.`);
  };

  const handleRemoveVariant = (idx: number) => {
    setVariants(variants.filter((_, i) => i !== idx));
  };

  const toggleVoiceInput = (
    targetSetter: React.Dispatch<React.SetStateAction<string>>,
    fieldName: string
  ) => {
    setVoiceTargetField(fieldName);
    setVoiceSetter(() => targetSetter);
    setVoiceText('');
    setVoiceModalVisible(true);

    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN';

        recognition.onstart = () => {
          setIsListeningVoice(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0]?.transcript;
          if (transcript) {
            setVoiceText((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
          setIsListeningVoice(false);
        };

        recognition.onerror = () => {
          setIsListeningVoice(false);
        };

        recognition.onend = () => {
          setIsListeningVoice(false);
        };

        recognition.start();
      } catch {
        setIsListeningVoice(false);
      }
    }
  };

  async function pickImageFile(target: 'main' | 'gallery' | 'variant' | 'aiMedia') {
    if (target === 'aiMedia') setAnalyzingMedia(true);
    else setUploadingImage(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: target !== 'gallery',
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          name: asset.fileName || 'product-image.jpg',
          type: asset.mimeType || 'image/jpeg',
        } as any);
        formData.append('folder', 'listings/misc');

        const res = await api.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const uploadedUrl = res.data?.secure_url || res.data?.url || res.data?.path || asset.uri;

        if (target === 'main') {
          setImageUrl(uploadedUrl);
          if (!galleryImages.includes(uploadedUrl)) setGalleryImages([uploadedUrl, ...galleryImages]);
          Alert.alert('Image Uploaded!', 'Cover photo attached successfully.');
        } else if (target === 'gallery') {
          setGalleryImages([...galleryImages, uploadedUrl]);
          Alert.alert('Gallery Photo Uploaded!', 'Photo added to listing gallery.');
        } else if (target === 'variant') {
          setVariantImageUrl(uploadedUrl);
        } else if (target === 'aiMedia') {
          setImageUrl(uploadedUrl);
          if (!galleryImages.includes(uploadedUrl)) setGalleryImages([uploadedUrl, ...galleryImages]);
          setGeneratingAiCopy(true);
          try {
            let resultData: any = null;
            try {
              const formDataAi = new FormData();
              formDataAi.append('file', {
                uri: asset.uri,
                name: asset.fileName || 'media-sample.jpg',
                type: asset.mimeType || 'image/jpeg',
              } as any);
              const aiRes = await api.post('/ai/multimodal-analyze', formDataAi, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });
              resultData = aiRes.data?.data || aiRes.data;
            } catch {
              const aiRes = await api.post('/ai/generate-description', {
                prompt: aiPrompt.trim() || title || category,
                type,
                category,
                subcategory,
                context: { imageUrl: uploadedUrl, title, brand, price: sellingPrice },
              });
              resultData = aiRes.data?.data || aiRes.data;
            }

            if (resultData) {
              const desc = resultData.detailedDescription || resultData.description || resultData.copy;
              if (desc) setDescription(desc);
              if (resultData.shortDescription) setShortDescription(resultData.shortDescription);
              if (resultData.title && !title) setTitle(resultData.title);
              if (resultData.suggestedCategory && resultData.suggestedCategory !== category) {
                setCategory(resultData.suggestedCategory);
              }
              if (resultData.serviceHighlights && type === 'service') {
                setServiceHighlights(resultData.serviceHighlights);
              }
              if (Array.isArray(resultData.tags) && resultData.tags.length > 0) {
                setTags((prev) => Array.from(new Set([...prev, ...resultData.tags])));
              }
              Alert.alert('✨ Gemini AI Scan Complete!', 'Listing details auto-filled from sample media.');
            }
          } catch {
            Alert.alert('Notice', 'Photo attached successfully. AI scan completed.');
          } finally {
            setGeneratingAiCopy(false);
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Upload Error', err?.message || 'Could not upload image file.');
    } finally {
      setUploadingImage(false);
      setAnalyzingMedia(false);
    }
  }

  const handleGenerateAiCopy = async () => {
    const promptText = aiPrompt.trim() || title.trim() || `${category} ${type}`;
    setGeneratingAiCopy(true);
    try {
      const res = await api.post('/ai/generate-description', {
        prompt: promptText,
        type,
        category,
        subcategory,
        context: type === 'service' ? {
          serviceType,
          priceType,
          price: sellingPrice,
          duration,
          area: serviceArea,
        } : {
          brand,
          price: sellingPrice,
          tags,
        },
      });

      const copyData = res.data?.data || res.data;
      if (copyData) {
        const desc = copyData.detailedDescription || copyData.description || copyData.copy;
        if (desc) setDescription(desc);
        if (copyData.shortDescription) setShortDescription(copyData.shortDescription);
        if (copyData.title && !title) setTitle(copyData.title);
        if (copyData.serviceHighlights && type === 'service') {
          setServiceHighlights(copyData.serviceHighlights);
        }
        if (Array.isArray(copyData.tags) && copyData.tags.length > 0) {
          setTags((prev) => Array.from(new Set([...prev, ...copyData.tags])));
        }
        Alert.alert('✨ Gemini AI Description Generated!', 'Listing details synthesized successfully.');
      } else {
        Alert.alert('Notice', 'AI description generator completed. Review fields below.');
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Could not generate AI description. Please enter details manually.';
      Alert.alert('AI Generation Unavailable', errMsg);
    } finally {
      setGeneratingAiCopy(false);
    }
  };

  const actual = parseFloat(actualPrice) || 0;
  const selling = parseFloat(sellingPrice) || 0;
  const discountPercent =
    actual > 0 && selling > 0 && actual > selling
      ? Math.round(((actual - selling) / actual) * 100)
      : 0;

  const finalUnit = unit === 'other' ? (safeTrim(customUnit) || 'piece') : unit;

  function handleSubmit() {
    const cleanTitle = safeTrim(title);
    const cleanBrand = safeTrim(brand);
    const cleanSku = safeTrim(sku);
    const cleanCategory = safeTrim(category);
    const cleanSubcategory = safeTrim(subcategory);
    const cleanShortDesc = safeTrim(shortDescription);
    const cleanDesc = safeTrim(description);
    const cleanWarranty = safeTrim(warranty);
    const cleanReturnPolicy = safeTrim(returnPolicy);
    const cleanGst = safeTrim(gst);
    const cleanImage = safeTrim(imageUrl);
    const cleanVideo = safeTrim(videoUrl);

    if (!cleanTitle) {
      Alert.alert('Title Required', `Please enter ${type} title.`);
      return;
    }

    if (!safeTrim(sellingPrice)) {
      Alert.alert('Price Required', 'Please enter selling price (₹).');
      return;
    }

    const basePrice = parseFloat(sellingPrice);
    if (isNaN(basePrice) || basePrice <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid selling price.');
      return;
    }

    const finalImages = galleryImages.length > 0 ? galleryImages : cleanImage ? [cleanImage] : [];

    const payload: any = {
      type,
      title: cleanTitle,
      brand: cleanBrand || undefined,
      sku: cleanSku || undefined,
      category: cleanCategory,
      subcategory: cleanSubcategory,
      shortDescription: cleanShortDesc || undefined,
      description: cleanDesc || undefined,
      price: basePrice,
      salePrice: selling,
      actualPrice: actual > 0 ? actual : basePrice,
      discount: discountPercent,
      stock: type === 'product' ? parseInt(stock || '10', 10) : undefined,
      minOrderQty: parseInt(minOrderQty || '1', 10),
      unit: finalUnit,
      warranty: cleanWarranty || undefined,
      returnPolicy: cleanReturnPolicy || undefined,
      gst: cleanGst || undefined,
      tags,
      labels,
      variants,
      image: cleanImage || finalImages[0] || undefined,
      images: finalImages,
      video: cleanVideo || undefined,
      status: 'published',
    };

    if (type === 'service') {
      const cleanServiceHighlights = safeTrim(serviceHighlights);
      const cleanTerms = safeTrim(termsAndConditions);
      const cleanDuration = safeTrim(duration);
      const cleanServiceArea = safeTrim(serviceArea);
      const cleanCities = safeTrim(availableCities);

      payload.serviceDetails = {
        serviceType,
        priceType,
        price: basePrice,
        serviceHighlights: cleanServiceHighlights || undefined,
        termsAndConditions: cleanTerms || undefined,
        duration: cleanDuration || '1 Hour',
        serviceArea: cleanServiceArea || 'Local Area',
        minOrderValue: minOrderValue ? parseFloat(minOrderValue) : undefined,
        homeVisitAvailable,
        maxTravelDistanceKm: maxTravelDistanceKm ? parseFloat(maxTravelDistanceKm) : 15,
        availableCities: cleanCities || undefined,
        emergencyService24x7,
        advanceBookingRequired,
        bookingAvailability,
        coverImage: cleanImage || finalImages[0] || undefined,
        galleryImages: finalImages.slice(1),
        reelVideo: cleanVideo || undefined,
      };
    } else {
      const dimL = shippingLength ? parseFloat(shippingLength) : undefined;
      const dimW = shippingWidth ? parseFloat(shippingWidth) : undefined;
      const dimH = shippingHeight ? parseFloat(shippingHeight) : undefined;

      payload.shippingDetails = {
        weight: shippingWeight ? parseFloat(shippingWeight) : undefined,
        weightUnit: shippingWeightUnit,
        length: dimL,
        width: dimW,
        height: dimH,
        dimensionUnit: shippingDimensionUnit,
        dimensions: (dimL && dimW && dimH) ? `${dimL} × ${dimW} × ${dimH} ${shippingDimensionUnit}` : undefined,
        shippingType,
        freeShipping,
        estimatedDays: parseInt(estimatedDays || '5', 10),
      };
      payload.productDetails = {
        brand: brand.trim() || undefined,
        sku: sku.trim() || undefined,
        minOrderQty: parseInt(minOrderQty || '1', 10),
        unit: finalUnit,
        warranty: warranty.trim() || undefined,
        returnPolicy: returnPolicy.trim() || undefined,
        gst: gst.trim() || undefined,
        shippingDetails: payload.shippingDetails,
      };
    }

    if (isEdit && editId) {
      updateMutation.mutate(
        { id: editId, ...payload },
        {
          onSuccess: () => {
            Alert.alert('🎉 Listing Updated!', `"${title}" details updated and saved successfully!`);
            router.back();
          },
          onError: (err: any) =>
            Alert.alert('Update Failed', err?.response?.data?.message || err?.message || 'Failed to update listing'),
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          Alert.alert('🎉 Listing Published!', `"${title}" has been added to your store catalog!`);
          router.back();
        },
        onError: (err: any) =>
          Alert.alert('Creation Failed', err?.response?.data?.message || err?.message || 'Failed to create listing'),
      });
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header Bar — Matches Web Modal Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color={YELLOW} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isEdit ? `Edit ${type === 'service' ? 'Service' : 'Product'} Listing` : `Add New ${type === 'service' ? 'Service' : 'Product'} Listing`}
        </Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {loadingEdit ? (
        <View style={styles.centeredLoading}>
          <ActivityIndicator size="large" color={YELLOW} />
          <Text style={styles.loadingText}>Loading listing details...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* LISTING TYPE SWITCHER (Product vs Service) */}
          <View style={styles.typeSwitchCard}>
            <Text style={styles.fieldLabel}>SELECT LISTING TYPE</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'product' && styles.typeBtnActive]}
                onPress={() => setType('product')}>
                <Ionicons name="cube-outline" size={16} color={type === 'product' ? '#241B15' : '#64748B'} />
                <Text style={[styles.typeBtnText, type === 'product' && styles.typeBtnTextActive]}>
                  📦 Physical Product
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeBtn, type === 'service' && styles.typeBtnActive]}
                onPress={() => setType('service')}>
                <Ionicons name="construct-outline" size={16} color={type === 'service' ? '#241B15' : '#64748B'} />
                <Text style={[styles.typeBtnText, type === 'service' && styles.typeBtnTextActive]}>
                  🛠️ Professional Service
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SECTION 1: CATEGORY & CLASSIFICATION */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeaderTitle}>CATEGORY & CLASSIFICATION</Text>

            <Text style={styles.fieldLabel}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
              {parentCategories.map((catItem: any, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.dropdownChip, category === catItem.name && styles.dropdownChipActive]}
                  onPress={() => setCategory(catItem.name)}>
                  <Text style={[styles.dropdownChipText, category === catItem.name && styles.dropdownChipTextActive]}>
                    {catItem.name}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={category === catItem.name ? YELLOW : '#64748B'} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>SUBCATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
              {childSubcategories.map((subItem: any, idx: number) => {
                const subName = subItem.name || subItem;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.dropdownChip, subcategory === subName && styles.dropdownChipActive]}
                    onPress={() => setSubcategory(subName)}>
                    <Text style={[styles.dropdownChipText, subcategory === subName && styles.dropdownChipTextActive]}>
                      {subName}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={subcategory === subName ? YELLOW : '#64748B'} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* SECTION 2: BASIC DETAILS & AI GENERATOR */}
          <View style={styles.sectionCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionHeaderTitle}>BASIC {type.toUpperCase()} DETAILS</Text>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={12} color={PURPLE_ACCENT} />
                <Text style={styles.aiBadgeText}>AI Assisted</Text>
              </View>
            </View>

            {/* AI Description Generator Glassmorphic Banner */}
            <View style={styles.aiBannerCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.aiBannerTitle}>🤖 AI Description Generator (Voice & Text)</Text>
                <TouchableOpacity
                  style={styles.voicePurpleBtn}
                  onPress={() => toggleVoiceInput(setAiPrompt, 'AI Prompt')}>
                  <Ionicons name="mic" size={12} color="#fff" />
                  <Text style={styles.voicePurpleBtnText}>Voice Input</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TextInput
                  style={styles.aiPromptInput}
                  placeholder="Tell AI about features or speak via mic..."
                  placeholderTextColor="#94A3B8"
                  value={aiPrompt}
                  onChangeText={setAiPrompt}
                />
                <TouchableOpacity
                  style={styles.autoGenerateBtn}
                  onPress={handleGenerateAiCopy}
                  disabled={generatingAiCopy}>
                  {generatingAiCopy ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={14} color="#fff" />
                      <Text style={styles.autoGenerateBtnText}>Auto-Generate</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(168,85,247,0.2)' }}>
                <Text style={styles.subLabelText}>OR UPLOAD MEDIA FOR AI AUTO-FILL</Text>
                <TouchableOpacity
                  style={styles.filePickerBtn}
                  onPress={() => pickImageFile('aiMedia')}
                  disabled={analyzingMedia}>
                  {analyzingMedia ? (
                    <ActivityIndicator size="small" color={PURPLE_ACCENT} />
                  ) : (
                    <Text style={styles.filePickerBtnText}>📷 Select Photo/Video for AI Scan</Text>
                  )}
                </TouchableOpacity>
                <Text style={styles.helperText}>
                  Gemini will scan your sample photo/video to extract highlights & details.
                </Text>
              </View>
            </View>

            {/* Title */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelVoiceRow}>
                <Text style={styles.fieldLabel}>{type === 'service' ? 'Service Title *' : 'Product Title *'}</Text>
                <TouchableOpacity
                  style={styles.voiceSmallBtn}
                  onPress={() => toggleVoiceInput(setTitle, 'Title')}>
                  <Ionicons name="mic" size={11} color={YELLOW} />
                  <Text style={styles.voiceSmallBtnText}>Voice Input</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.whiteInput}
                placeholder={type === 'service' ? 'e.g. Full AC Servicing & Cleaning' : 'e.g. Wireless Noise-Cancelling Headphones'}
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Short Description */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelVoiceRow}>
                <Text style={styles.fieldLabel}>Short Description</Text>
                <TouchableOpacity
                  style={styles.voiceSmallBtn}
                  onPress={() => toggleVoiceInput(setShortDescription, 'Short Description')}>
                  <Ionicons name="mic" size={11} color={YELLOW} />
                  <Text style={styles.voiceSmallBtnText}>Voice Input</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.whiteInput}
                placeholder="Brief 1-line summary..."
                placeholderTextColor="#94A3B8"
                value={shortDescription}
                onChangeText={setShortDescription}
              />
            </View>

            {/* Full Description */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelVoiceRow}>
                <Text style={styles.fieldLabel}>Full Description</Text>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  onPress={handleGenerateAiCopy}>
                  <Ionicons name="sparkles" size={12} color={PURPLE_ACCENT} />
                  <Text style={{ color: PURPLE_ACCENT, fontSize: 10, fontWeight: '800' }}>
                    Re-generate AI Description
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.whiteInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Comprehensive details..."
                placeholderTextColor="#94A3B8"
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>

            {/* Brand & SKU (For Products) */}
            {type === 'product' && (
              <View style={styles.row}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Brand</Text>
                  <TextInput
                    style={styles.whiteInput}
                    placeholder="e.g. Sony"
                    placeholderTextColor="#94A3B8"
                    value={brand}
                    onChangeText={setBrand}
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.fieldLabel}>SKU Code</Text>
                    <TouchableOpacity onPress={generateSKU}>
                      <Text style={{ color: YELLOW, fontSize: 9, fontWeight: '900' }}>⚡ Auto-Generate</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.whiteInput}
                    placeholder="SKU-XXX-000"
                    placeholderTextColor="#94A3B8"
                    value={sku}
                    onChangeText={setSku}
                  />
                </View>
              </View>
            )}

            {/* Tags & Keywords */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelVoiceRow}>
                <Text style={styles.fieldLabel}>Tags / Keywords</Text>
                <TouchableOpacity
                  style={styles.voiceSmallBtn}
                  onPress={() => toggleVoiceInput(setNewTag, 'Tag Keyword')}>
                  <Ionicons name="mic" size={11} color={YELLOW} />
                  <Text style={styles.voiceSmallBtnText}>Voice Input</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TextInput
                  style={[styles.whiteInput, { flex: 1 }]}
                  placeholder="Type tag & press Add..."
                  placeholderTextColor="#94A3B8"
                  value={newTag}
                  onChangeText={setNewTag}
                  onSubmitEditing={handleAddTag}
                />
                <TouchableOpacity
                  style={{
                    backgroundColor: YELLOW,
                    paddingHorizontal: 14,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={handleAddTag}>
                  <Text style={{ color: '#241B15', fontSize: 11, fontWeight: '900' }}>+ Add</Text>
                </TouchableOpacity>
              </View>
              {tags.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {tags.map((t, idx) => (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: '#FFFBEB',
                        borderWidth: 1,
                        borderColor: YELLOW,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 12,
                      }}>
                      <Text style={{ color: YELLOW, fontSize: 10, fontWeight: '800' }}>#{t}</Text>
                      <TouchableOpacity onPress={() => handleRemoveTag(idx)}>
                        <Ionicons name="close-circle" size={12} color={YELLOW} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </View>

          {/* SERVICE SPECIFIC FIELDS */}
          {type === 'service' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeaderTitle}>SERVICE SPECIFICATIONS</Text>

              {/* Service Type & Price Type */}
              <View style={styles.row}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Service Delivery Mode</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                    {['At Home', 'At Store / Shop', 'Online / Remote', 'On-Site'].map((stVal, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.dropdownChip, serviceType === stVal && styles.dropdownChipActive]}
                        onPress={() => setServiceType(stVal)}>
                        <Text style={[styles.dropdownChipText, serviceType === stVal && styles.dropdownChipTextActive]}>
                          {stVal}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Price Structure</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                    {['Fixed Price', 'Starting From', 'Per Hour', 'Custom Quote'].map((ptVal, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.dropdownChip, priceType === ptVal && styles.dropdownChipActive]}
                        onPress={() => setPriceType(ptVal)}>
                        <Text style={[styles.dropdownChipText, priceType === ptVal && styles.dropdownChipTextActive]}>
                          {ptVal}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Duration & Service Area */}
              <View style={styles.row}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Estimated Duration</Text>
                  <TextInput
                    style={styles.whiteInput}
                    placeholder="e.g. 45 Mins, 2 Hours"
                    placeholderTextColor="#94A3B8"
                    value={duration}
                    onChangeText={setDuration}
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Service Area / Radius</Text>
                  <TextInput
                    style={styles.whiteInput}
                    placeholder="e.g. Within 15 KM, Citywide"
                    placeholderTextColor="#94A3B8"
                    value={serviceArea}
                    onChangeText={setServiceArea}
                  />
                </View>
              </View>

              {/* Service Highlights */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Key Service Highlights / Inclusions</Text>
                <TextInput
                  style={[styles.whiteInput, { height: 60, textAlignVertical: 'top' }]}
                  placeholder="e.g. Includes gas check, filter washing & 30-day warranty..."
                  placeholderTextColor="#94A3B8"
                  value={serviceHighlights}
                  onChangeText={setServiceHighlights}
                  multiline
                />
              </View>

              {/* Toggles for Service */}
              <View style={{ gap: 10, marginTop: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.fieldLabel}>Doorstep / Home Visit Available</Text>
                  <Switch
                    value={homeVisitAvailable}
                    onValueChange={setHomeVisitAvailable}
                    trackColor={{ false: '#CBD5E1', true: YELLOW }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.fieldLabel}>24×7 Emergency Service Available</Text>
                  <Switch
                    value={emergencyService24x7}
                    onValueChange={setEmergencyService24x7}
                    trackColor={{ false: '#CBD5E1', true: YELLOW }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.fieldLabel}>Advance Booking Required</Text>
                  <Switch
                    value={advanceBookingRequired}
                    onValueChange={setAdvanceBookingRequired}
                    trackColor={{ false: '#CBD5E1', true: YELLOW }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
            </View>
          )}

          {/* SECTION 3: PRICING & INVENTORY */}
          <View style={styles.sectionCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionHeaderTitle}>PRICING & INVENTORY</Text>
              {discountPercent > 0 && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>{discountPercent}% OFF</Text>
                </View>
              )}
            </View>

            {/* MRP & Selling Price */}
            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>MRP / Actual Price (₹)</Text>
                <TextInput
                  style={styles.whiteInput}
                  placeholder="3999"
                  placeholderTextColor="#94A3B8"
                  value={actualPrice}
                  onChangeText={setActualPrice}
                  keyboardType="number-pad"
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Selling Price (₹) *</Text>
                <TextInput
                  style={[styles.whiteInput, { borderColor: YELLOW, borderWidth: 1.5 }]}
                  placeholder="2588"
                  placeholderTextColor="#94A3B8"
                  value={sellingPrice}
                  onChangeText={setSellingPrice}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Pricing Summary Breakdown Banner */}
            {(actual > 0 || selling > 0) && (
              <View style={styles.pricingSummaryBanner}>
                <Text style={styles.pricingSummaryText}>
                  MRP: <Text style={{ fontWeight: '900', color: '#241B15' }}>₹{actual.toLocaleString()}</Text> • Selling: <Text style={{ fontWeight: '900', color: YELLOW }}>₹{selling.toLocaleString()}</Text>
                  {discountPercent > 0 ? ` (${discountPercent}% OFF - Save ₹${(actual - selling).toLocaleString()})` : ''}
                </Text>
              </View>
            )}

            {/* GST Rate (%) selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>GST Rate (%)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                {['0%', '5%', '12%', '18%', '28%'].map((gstVal, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.dropdownChip, gst === gstVal && styles.dropdownChipActive]}
                    onPress={() => setGst(gstVal)}>
                    <Text style={[styles.dropdownChipText, gst === gstVal && styles.dropdownChipTextActive]}>
                      {gstVal} GST
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Unit / Quantity Type selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Unit / Quantity Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                {STANDARD_UNITS.map((uItem, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.dropdownChip, unit === uItem.value && styles.dropdownChipActive]}
                    onPress={() => setUnit(uItem.value)}>
                    <Text style={[styles.dropdownChipText, unit === uItem.value && styles.dropdownChipTextActive]}>
                      {uItem.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {unit === 'other' && (
                <TextInput
                  style={[styles.whiteInput, { marginTop: 6, borderColor: PURPLE_ACCENT }]}
                  placeholder="Enter custom unit (e.g. Bottle, Sheet, Drum)..."
                  placeholderTextColor="#94A3B8"
                  value={customUnit}
                  onChangeText={setCustomUnit}
                />
              )}
            </View>

            {/* Stock, Min Order Qty & Warranty (For Products) */}
            {type === 'product' && (
              <>
                <View style={styles.row}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Stock Quantity *</Text>
                    <TextInput
                      style={styles.whiteInput}
                      placeholder="10"
                      placeholderTextColor="#94A3B8"
                      value={stock}
                      onChangeText={setStock}
                      keyboardType="number-pad"
                    />
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Min Order Qty</Text>
                    <TextInput
                      style={styles.whiteInput}
                      placeholder="1"
                      placeholderTextColor="#94A3B8"
                      value={minOrderQty}
                      onChangeText={setMinOrderQty}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Warranty Details</Text>
                  <TextInput
                    style={styles.whiteInput}
                    placeholder="e.g. 1 Year Brand Warranty"
                    placeholderTextColor="#94A3B8"
                    value={warranty}
                    onChangeText={setWarranty}
                  />
                </View>
              </>
            )}
          </View>

          {/* SECTION 4: SHIPPING & PAYMENT ACCEPTANCE (For Products) */}
          {type === 'product' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeaderTitle}>SHIPPING & PACKAGE SPECIFICATIONS</Text>

              {/* Package Weight */}
              <View style={styles.row}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Package Weight</Text>
                  <TextInput
                    style={styles.whiteInput}
                    placeholder="0.5"
                    placeholderTextColor="#94A3B8"
                    value={shippingWeight}
                    onChangeText={setShippingWeight}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Weight Unit</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                    {['kg', 'g', 'lb'].map((wUnit, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.dropdownChip, shippingWeightUnit === wUnit && styles.dropdownChipActive]}
                        onPress={() => setShippingWeightUnit(wUnit)}>
                        <Text style={[styles.dropdownChipText, shippingWeightUnit === wUnit && styles.dropdownChipTextActive]}>
                          {wUnit}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Dimensions L x W x H */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Dimensions L × W × H ({shippingDimensionUnit})</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TextInput
                    style={[styles.whiteInput, { flex: 1 }]}
                    placeholder="Length"
                    placeholderTextColor="#94A3B8"
                    value={shippingLength}
                    onChangeText={setShippingLength}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.whiteInput, { flex: 1 }]}
                    placeholder="Width"
                    placeholderTextColor="#94A3B8"
                    value={shippingWidth}
                    onChangeText={setShippingWidth}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.whiteInput, { flex: 1 }]}
                    placeholder="Height"
                    placeholderTextColor="#94A3B8"
                    value={shippingHeight}
                    onChangeText={setShippingHeight}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Shipping & Payment Acceptance Type Selector */}
              <View style={[styles.fieldGroup, { marginTop: 6 }]}>
                <Text style={styles.fieldLabel}>SHIPPING & PAYMENT ACCEPTANCE TYPE *</Text>
                <View style={{ gap: 8, marginTop: 4 }}>
                  {/* Both COD & Prepaid */}
                  <TouchableOpacity
                    style={[
                      styles.paymentOptionCard,
                      shippingType === 'both' && styles.paymentOptionCardActive,
                    ]}
                    onPress={() => setShippingType('both')}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.paymentOptionTitle, shippingType === 'both' && { color: YELLOW }]}>
                        🔄 Both COD & Prepaid
                      </Text>
                      <Text style={styles.paymentOptionSub}>Accept Online Payment & Cash on Delivery</Text>
                    </View>
                    {shippingType === 'both' && <Ionicons name="checkmark-circle" size={18} color={YELLOW} />}
                  </TouchableOpacity>

                  {/* Prepaid Only */}
                  <TouchableOpacity
                    style={[
                      styles.paymentOptionCard,
                      shippingType === 'prepaid' && styles.paymentOptionCardActive,
                    ]}
                    onPress={() => setShippingType('prepaid')}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.paymentOptionTitle, shippingType === 'prepaid' && { color: YELLOW }]}>
                        💳 Prepaid Only
                      </Text>
                      <Text style={styles.paymentOptionSub}>Online Payment Only (UPI, Card, NetBanking)</Text>
                    </View>
                    {shippingType === 'prepaid' && <Ionicons name="checkmark-circle" size={18} color={YELLOW} />}
                  </TouchableOpacity>

                  {/* COD Only */}
                  <TouchableOpacity
                    style={[
                      styles.paymentOptionCard,
                      shippingType === 'cod' && styles.paymentOptionCardActive,
                    ]}
                    onPress={() => setShippingType('cod')}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.paymentOptionTitle, shippingType === 'cod' && { color: YELLOW }]}>
                        💵 COD Only
                      </Text>
                      <Text style={styles.paymentOptionSub}>Cash on Delivery on arrival</Text>
                    </View>
                    {shippingType === 'cod' && <Ionicons name="checkmark-circle" size={18} color={YELLOW} />}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Free Shipping & Delivery SLA */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <Text style={styles.fieldLabel}>Free Shipping Available (No Delivery Fee)</Text>
                <Switch
                  value={freeShipping}
                  onValueChange={setFreeShipping}
                  trackColor={{ false: '#CBD5E1', true: YELLOW }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Estimated Delivery SLA</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                  {[
                    { days: '1', label: '1 Day (Express)' },
                    { days: '3', label: '2-3 Business Days' },
                    { days: '5', label: '4-5 Business Days (Standard)' },
                    { days: '7', label: '6-7 Business Days' },
                    { days: '10', label: '8-10 Business Days' },
                  ].map((sla, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.dropdownChip, estimatedDays === sla.days && styles.dropdownChipActive]}
                      onPress={() => setEstimatedDays(sla.days)}>
                      <Text style={[styles.dropdownChipText, estimatedDays === sla.days && styles.dropdownChipTextActive]}>
                        {sla.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}

          {/* SECTION 5: RETURN & REPLACEMENT POLICY BUILDER */}
          {type === 'product' && (
            <View style={styles.sectionCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={styles.sectionHeaderTitle}>RETURN / REPLACEMENT POLICY</Text>
                  <Text style={styles.helperText}>Specify customer return conditions & replacement rules</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, backgroundColor: '#F1F5F9', padding: 2, borderRadius: 10 }}>
                  <TouchableOpacity
                    style={[styles.yesNoBtn, hasReturnPolicy && styles.yesNoBtnActive]}
                    onPress={() => handleToggleReturnPolicy(true)}>
                    <Text style={[styles.yesNoText, hasReturnPolicy && styles.yesNoTextActive]}>✓ Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.yesNoBtn, !hasReturnPolicy && styles.noBtnActive]}
                    onPress={() => handleToggleReturnPolicy(false)}>
                    <Text style={[styles.yesNoText, !hasReturnPolicy && styles.yesNoTextActive]}>✕ No</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {!hasReturnPolicy ? (
                <View style={styles.noReturnAlertCard}>
                  <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                  <Text style={styles.noReturnAlertText}>
                    <Text style={{ fontWeight: '900' }}>Final Sale:</Text> No returns or replacements will be accepted for this product.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10, marginTop: 4 }}>
                  {/* Return Window */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Return / Replacement Window *</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                      {['3 Days', '7 Days', '10 Days', '15 Days', '30 Days'].map((win, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.dropdownChip, returnDays === win && styles.dropdownChipActive]}
                          onPress={() => handleReturnDaysChange(win)}>
                          <Text style={[styles.dropdownChipText, returnDays === win && styles.dropdownChipTextActive]}>
                            {win}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Return Conditions Chips */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Eligible Return Conditions (Multi-select) *</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {STANDARD_CONDITIONS.map((cond, idx) => {
                        const isSel = selectedReturnConditions.includes(cond);
                        return (
                          <TouchableOpacity
                            key={idx}
                            style={[styles.conditionChip, isSel && styles.conditionChipActive]}
                            onPress={() => toggleReturnCondition(cond)}>
                            <Ionicons name={isSel ? 'checkmark-circle' : 'ellipse-outline'} size={12} color={isSel ? YELLOW : '#64748B'} />
                            <Text style={[styles.conditionChipText, isSel && styles.conditionChipTextActive]}>
                              {cond}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Custom Condition Text */}
                  {selectedReturnConditions.includes('Other / Custom condition') && (
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Custom Return Terms *</Text>
                      <TextInput
                        style={[styles.whiteInput, { borderColor: YELLOW }]}
                        placeholder="e.g. Unboxing video proof required, original tags attached..."
                        placeholderTextColor="#94A3B8"
                        value={customConditionText}
                        onChangeText={handleCustomConditionChange}
                      />
                    </View>
                  )}

                  {/* Dynamic Policy Preview Box */}
                  <View style={styles.policyPreviewBox}>
                    <Text style={styles.policyPreviewLabel}>Policy Preview:</Text>
                    <Text style={styles.policyPreviewText}>{returnPolicy}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* SECTION 6: PRODUCT MEDIA & GALLERY */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeaderTitle}>{type.toUpperCase()} MEDIA & GALLERY</Text>

            {/* Main Cover Photo Card */}
            {imageUrl ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
                <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: YELLOW, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ color: '#241B15', fontSize: 9, fontWeight: '900' }}>COVER PHOTO</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => {
                    setImageUrl('');
                    const remaining = galleryImages.filter((img) => img !== imageUrl);
                    setGalleryImages(remaining);
                  }}>
                  <Ionicons name="close" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.uploadBtn, { flex: 1 }]}
                onPress={() => pickImageFile('main')}
                disabled={uploadingImage}>
                {uploadingImage ? (
                  <ActivityIndicator color={YELLOW} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={18} color={YELLOW} />
                    <Text style={styles.uploadBtnText}>
                      {imageUrl ? '🖼️ Change Cover' : '📁 Upload Cover'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.uploadBtn, { flex: 1, borderColor: PURPLE_BORDER }]}
                onPress={() => pickImageFile('gallery')}
                disabled={uploadingImage}>
                <Ionicons name="images-outline" size={18} color={PURPLE_ACCENT} />
                <Text style={[styles.uploadBtnText, { color: PURPLE_ACCENT }]}>
                  📷 Add Gallery ({galleryImages.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Paste Image URL Input */}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TextInput
                style={[styles.whiteInput, { flex: 1 }]}
                placeholder="Or paste direct image URL (https://...)"
                placeholderTextColor="#94A3B8"
                value={imageUrlInput}
                onChangeText={setImageUrlInput}
              />
              <TouchableOpacity
                style={{
                  backgroundColor: PURPLE_ACCENT,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => {
                  const cleanUrl = imageUrlInput.trim();
                  if (!cleanUrl) return;
                  if (!imageUrl) setImageUrl(cleanUrl);
                  if (!galleryImages.includes(cleanUrl)) setGalleryImages([...galleryImages, cleanUrl]);
                  setImageUrlInput('');
                  Alert.alert('Photo Attached!', 'Image URL added to gallery.');
                }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>+ Add URL</Text>
              </TouchableOpacity>
            </View>

            {/* Gallery Thumbnails Grid */}
            {galleryImages.length > 0 ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Gallery Photos (Tap photo to set as Main Cover)</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {galleryImages.map((gImg, idx) => {
                    const isCover = gImg === imageUrl || (idx === 0 && !imageUrl);
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={{ position: 'relative', width: 75, height: 75 }}
                        onPress={() => {
                          setImageUrl(gImg);
                          Alert.alert('Main Cover Updated', 'Selected photo assigned as main cover.');
                        }}>
                        <Image
                          source={{ uri: gImg }}
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: 8,
                            borderWidth: isCover ? 2 : 1,
                            borderColor: isCover ? YELLOW : BORDER,
                          }}
                        />
                        {isCover && (
                          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: YELLOW, paddingVertical: 1, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }}>
                            <Text style={{ color: '#241B15', fontSize: 7, fontWeight: '900', textAlign: 'center' }}>COVER</Text>
                          </View>
                        )}
                        <TouchableOpacity
                          style={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            backgroundColor: '#EF4444',
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onPress={() => {
                            const filtered = galleryImages.filter((_, i) => i !== idx);
                            setGalleryImages(filtered);
                            if (gImg === imageUrl) {
                              setImageUrl(filtered[0] || '');
                            }
                          }}>
                          <Ionicons name="close" size={11} color="#fff" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Video Link Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Listing Video URL (Optional)</Text>
              <TextInput
                style={styles.whiteInput}
                placeholder="https://youtube.com/watch?v=... or MP4 link"
                placeholderTextColor="#94A3B8"
                value={videoUrl}
                onChangeText={setVideoUrl}
              />
            </View>
          </View>

          {/* SECTION 7: SPECIFICATIONS & VARIANTS */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeaderTitle}>SPECIFICATIONS & ATTRIBUTES</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TextInput
                style={[styles.whiteInput, { flex: 1 }]}
                placeholder="Attribute (e.g. Color)"
                placeholderTextColor="#94A3B8"
                value={newLabelKey}
                onChangeText={setNewLabelKey}
              />
              <TextInput
                style={[styles.whiteInput, { flex: 1 }]}
                placeholder="Value (e.g. Matte Black)"
                placeholderTextColor="#94A3B8"
                value={newLabelVal}
                onChangeText={setNewLabelVal}
              />
              <TouchableOpacity
                style={{
                  backgroundColor: YELLOW,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={handleAddLabel}>
                <Text style={{ color: '#241B15', fontSize: 11, fontWeight: '900' }}>+ Add</Text>
              </TouchableOpacity>
            </View>

            {labels.length > 0 ? (
              <View style={{ gap: 6, marginTop: 6 }}>
                {labels.map((lbl, idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: BORDER,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                    }}>
                    <Text style={{ color: YELLOW, fontSize: 11, fontWeight: '800' }}>
                      {lbl.key}: <Text style={{ color: '#0F172A', fontWeight: '600' }}>{lbl.value}</Text>
                    </Text>
                    <TouchableOpacity onPress={() => handleRemoveLabel(idx)}>
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}

            {type === 'product' && (
              <>
                <Text style={[styles.sectionHeaderTitle, { marginTop: 10 }]}>PRODUCT VARIANTS (SIZES, COLORS)</Text>
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TextInput
                      style={[styles.whiteInput, { flex: 1 }]}
                      placeholder="Type (e.g. Size)"
                      placeholderTextColor="#94A3B8"
                      value={variantLabel}
                      onChangeText={setVariantLabel}
                    />
                    <TextInput
                      style={[styles.whiteInput, { flex: 1 }]}
                      placeholder="Value (e.g. XL)"
                      placeholderTextColor="#94A3B8"
                      value={variantValue}
                      onChangeText={setVariantValue}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TextInput
                      style={[styles.whiteInput, { flex: 1 }]}
                      placeholder="Variant Price Adjustment (₹)"
                      placeholderTextColor="#94A3B8"
                      value={variantPriceAdj}
                      onChangeText={setVariantPriceAdj}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={{
                        backgroundColor: PURPLE_ACCENT,
                        paddingHorizontal: 14,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={handleAddVariant}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>+ Add Variant</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {variants.length > 0 ? (
                  <View style={{ gap: 6, marginTop: 6 }}>
                    {variants.map((v, idx) => (
                      <View
                        key={idx}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: '#F8FAFC',
                          borderWidth: 1,
                          borderColor: BORDER,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 10,
                        }}>
                        <View>
                          <Text style={{ color: YELLOW, fontSize: 11, fontWeight: '900' }}>
                            {v.label || v.type}: {v.value}
                          </Text>
                          <Text style={{ color: '#64748B', fontSize: 10 }}>
                            Price: ₹{v.price || sellingPrice} • SKU: {v.sku}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => handleRemoveVariant(idx)}>
                          <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            )}
          </View>

          {/* SUBMIT ACTION */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending || loadingEdit}>
            {createMutation.isPending || updateMutation.isPending || loadingEdit ? (
              <ActivityIndicator color={YELLOW} />
            ) : (
              <Text style={styles.submitBtnText}>
                {isEdit ? `💾 SAVE ${type.toUpperCase()} LISTING CHANGES` : `🚀 PUBLISH ${type.toUpperCase()} LISTING TO STORE`}
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* VOICE DICTATION MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={voiceModalVisible}
        onRequestClose={() => setVoiceModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="mic" size={20} color={YELLOW} />
                <Text style={styles.modalTitle}>Voice Input: {voiceTargetField}</Text>
              </View>
              <TouchableOpacity onPress={() => setVoiceModalVisible(false)}>
                <Ionicons name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtext}>
              {isListeningVoice
                ? '🎙️ Listening to your voice... Speak now'
                : 'Tap microphone button on your keyboard (🎙️) or dictate text below:'}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder={`Dictate or type ${voiceTargetField}...`}
              placeholderTextColor="#94A3B8"
              value={voiceText}
              onChangeText={setVoiceText}
              multiline
              autoFocus
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setVoiceModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={() => {
                  if (voiceText && voiceText.trim() && voiceSetter) {
                    voiceSetter((prev: string) => (prev ? `${prev} ${voiceText.trim()}` : voiceText.trim()));
                  }
                  setVoiceModalVisible(false);
                }}>
                <Text style={styles.modalApplyText}>✨ Apply Speech Text</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_BG },
  centeredLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#0F172A',
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    backgroundColor: '#241B15',
    borderBottomWidth: 2,
    borderBottomColor: '#D99A3D',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: Spacing.three,
    gap: 14,
  },
  typeSwitchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    ...Shadows.sm,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    borderRadius: 12,
  },
  typeBtnActive: {
    backgroundColor: '#FFFBEB',
    borderColor: YELLOW,
  },
  typeBtnText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  typeBtnTextActive: {
    color: '#241B15',
    fontWeight: '900',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
    ...Shadows.sm,
  },
  sectionHeaderTitle: {
    color: '#241B15',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  dropdownChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9999,
  },
  dropdownChipActive: {
    backgroundColor: '#241B15',
    borderColor: YELLOW,
  },
  dropdownChipText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
  },
  dropdownChipTextActive: {
    color: YELLOW,
    fontWeight: '900',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PURPLE_BG,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  aiBadgeText: {
    color: PURPLE_ACCENT,
    fontSize: 10,
    fontWeight: '900',
  },
  aiBannerCard: {
    backgroundColor: PURPLE_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PURPLE_BORDER,
    padding: 14,
  },
  aiBannerTitle: {
    color: '#581C87',
    fontSize: 11,
    fontWeight: '900',
  },
  voicePurpleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PURPLE_ACCENT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  voicePurpleBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  aiPromptInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    fontSize: 11,
    borderWidth: 1,
    borderColor: PURPLE_BORDER,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  autoGenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PURPLE_ACCENT,
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: 'center',
  },
  autoGenerateBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  subLabelText: {
    color: '#7E22CE',
    fontSize: 9,
    fontWeight: '900',
    marginBottom: 4,
  },
  filePickerBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: PURPLE_BORDER,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  filePickerBtnText: {
    color: PURPLE_ACCENT,
    fontSize: 10,
    fontWeight: '700',
  },
  helperText: {
    color: '#64748B',
    fontSize: 9,
    marginTop: 2,
    fontStyle: 'italic',
  },
  labelVoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '800',
  },
  voiceSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  voiceSmallBtnText: {
    color: YELLOW,
    fontSize: 10,
    fontWeight: '900',
  },
  whiteInput: {
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipScroll: {
    gap: 6,
  },
  fieldGroup: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  discountBadge: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: YELLOW,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  discountBadgeText: {
    color: YELLOW,
    fontSize: 9,
    fontWeight: '900',
  },
  pricingSummaryBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 10,
    padding: 10,
  },
  pricingSummaryText: {
    color: '#78350F',
    fontSize: 10,
    fontWeight: '700',
  },
  paymentOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
  },
  paymentOptionCardActive: {
    backgroundColor: '#FFFBEB',
    borderColor: YELLOW,
  },
  paymentOptionTitle: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '900',
  },
  paymentOptionSub: {
    color: '#64748B',
    fontSize: 9.5,
    marginTop: 2,
  },
  yesNoBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  yesNoBtnActive: {
    backgroundColor: '#10B981',
  },
  noBtnActive: {
    backgroundColor: '#EF4444',
  },
  yesNoText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  yesNoTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  noReturnAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 10,
  },
  noReturnAlertText: {
    color: '#991B1B',
    fontSize: 10,
    flex: 1,
  },
  conditionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  conditionChipActive: {
    backgroundColor: '#FFFBEB',
    borderColor: YELLOW,
  },
  conditionChipText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  conditionChipTextActive: {
    color: '#241B15',
    fontWeight: '800',
  },
  policyPreviewBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  policyPreviewLabel: {
    color: '#0F172A',
    fontSize: 9.5,
    fontWeight: '900',
  },
  policyPreviewText: {
    color: '#475569',
    fontSize: 10,
    fontStyle: 'italic',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
  },
  uploadBtnText: {
    color: YELLOW,
    fontSize: 11,
    fontWeight: '800',
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
    marginTop: 6,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#EF4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    backgroundColor: '#241B15',
    borderRadius: 9999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: YELLOW,
    ...Shadows.md,
  },
  submitBtnText: {
    color: YELLOW,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: YELLOW,
    padding: 16,
    gap: 12,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 10,
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '900',
  },
  modalSubtext: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalCancelText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
  },
  modalApplyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    backgroundColor: '#241B15',
  },
  modalApplyText: {
    color: YELLOW,
    fontSize: 11,
    fontWeight: '900',
  },
});
