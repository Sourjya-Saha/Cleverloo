import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import {
  ArrowLeftIcon,
  BuildingOffice2Icon,
  LockClosedIcon,
  PhoneIcon,
  MapPinIcon,
  EyeIcon,
  EyeSlashIcon,
  UserCircleIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid';
import { ArrowPathIcon, MapPinIcon as MapPinOutlineIcon } from '@heroicons/react/24/outline';
import { FaToilet } from 'react-icons/fa';

const apiUrl = "https://cleverloo-backend-1.vercel.app";

const RestroomProfile = ({ session, handleBackClick, updateSession }) => {
  const { update: updateNextAuthSession } = useSession();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.accessToken) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await axios.get(`${apiUrl}/restroom/profile`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        const restroom = response.data.restroom;
        setName(restroom.name || '');
        setAddress(restroom.address || '');
        setPhone(restroom.phone || '');
        setLatitude(restroom.latitude?.toString() || '');
        setLongitude(restroom.longitude?.toString() || '');
      } catch (error) {
        console.error('Error fetching restroom profile:', error);
        toast.error("Failed to load profile data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [session?.accessToken]);

  // Update profile handler
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name || !address || !latitude || !longitude) {
      toast.error("Name, address, latitude, and longitude are required.");
      return;
    }

    setIsUpdating(true);
    try {
      await axios.put(
        `${apiUrl}/restroom/edit`,
        {
          name,
          address,
          phone,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        },
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      toast.success("Profile updated successfully!");

      const response = await axios.get(`${apiUrl}/restroom/profile`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });

      updateSession({ user: response.data.restroom });
      await updateNextAuthSession({
        name: response.data.restroom.name,
        address: response.data.restroom.address,
        phone: response.data.restroom.phone,
        latitude: response.data.restroom.latitude,
        longitude: response.data.restroom.longitude,
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || "Failed to update profile. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Get current location and reverse geocode via Nominatim
  const handleCurrentLocation = () => {
    setIsGeolocating(true);
    toast.dismiss();
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      setIsGeolocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lon } = position.coords;
        setLatitude(lat.toString());
        setLongitude(lon.toString());
        toast.success('Location obtained successfully!');

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
          );
          if (!response.ok) {
            toast.warn('Could not retrieve detailed address; showing coordinates.');
            setAddress(`Lat: ${lat.toFixed(6)}, Long: ${lon.toFixed(6)}`);
            setIsGeolocating(false);
            return;
          }
          const data = await response.json();
          // Defensive check for display_name
          const resolvedAddress = data.display_name?.trim() ?? `Lat: ${lat.toFixed(6)}, Long: ${lon.toFixed(6)}`;
          if (!data.display_name) {
            toast.warn('Address not found; showing coordinates.');
          }
          setAddress(resolvedAddress);
        } catch (error) {
          console.error('Error fetching address:', error);
          toast.warn('Failed to get address; showing coordinates.');
          setAddress(`Lat: ${lat.toFixed(6)}, Long: ${lon.toFixed(6)}`);
        } finally {
          setIsGeolocating(false);
        }
      },
      (error) => {
        setIsGeolocating(false);
        let message = "Unable to retrieve your location. Please enter manually.";
        if (error.code === error.PERMISSION_DENIED) {
          message = "Location access denied. Please enable it in your browser settings.";
        }
        toast.error(message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Change password handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    setIsChangingPassword(true);
    try {
      await axios.put(
        `${apiUrl}/restroom/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${session.accessToken}` } }
      );
      toast.success("Password changed successfully!");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || "Failed to change password. Check your current password and try again.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Delete account handler - NO ROUTER DEPENDENCIES
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePassword.trim()) {
      toast.error("Password is required to delete account.");
      return;
    }
    setIsDeletingAccount(true);
    try {
      await axios.delete(
        `${apiUrl}/restroom/delete`,
        { headers: { Authorization: `Bearer ${session.accessToken}` }, data: { password: deletePassword } }
      );
      
      toast.success("Account deleted successfully!");
      
      // Clear any local storage or session data
      try {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
      } catch (storageError) {
        console.warn('Could not clear storage:', storageError);
      }
      
      // Sign out from NextAuth
      try {
        await signOut({ redirect: false });
      } catch (signOutError) {
        console.warn('Sign out error:', signOutError);
      }
      
      // Simple redirect to login page
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.replace('/');
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(error.response?.data?.message || "Failed to delete account. Please check your password and try again.");
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteConfirm(false);
      setDeletePassword('');
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-r from-[#BDFa70] to-[#87BC43] z-50">
        <Image
          src="/Clever Loo LOGO - 3.png"
          alt="clever loo logo"
          width={150}
          height={75}
          className="animate-pulse mb-4"
        />
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#026738]"></div>
          <p className="text-[#026738] font-medium uppercase tracking-wider text-sm">loading restroom profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 font-sans uppercase tracking-wider text-[#026738] overflow-hidden">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-[#bdfa70] to-[#87bc43] p-6 flex items-center justify-start flex-shrink-0 shadow-lg">
        <button
          onClick={handleBackClick}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/40 transition-colors duration-200"
          aria-label="Back"
        >
          <ArrowLeftIcon className="h-6 w-6 text-[#026738]" />
        </button>
        <div className="flex flex-col items-center w-full">
          <UserCircleIcon className="h-20 w-20 text-[#026738] mb-2" />
          <h1 className="text-lg font-bold text-white drop-shadow-md">{name || 'Restroom Profile'}</h1>
          <div className="flex items-center space-x-4 text-white/90 drop-shadow-sm">
            <p className="flex items-center">
              <PhoneIcon className="h-4 w-4 inline-block mr-2 text-[#026738]" />
              {phone || 'n/a'}
            </p>
            <p className="flex items-center">
              <MapPinIcon className="h-4 w-4 inline-block mr-2 text-[#026738]" />
              {address ? `${address.substring(0, 20)}...` : 'n/a'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow overflow-y-auto p-4 space-y-6 md:p-6">
        {/* Edit Profile */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-200">
          <div className="flex items-center space-x-3 text-[#026738] mb-4">
            <BuildingOffice2Icon className="h-6 w-6" />
            <h2 className="text-lg font-bold">Edit Restroom Profile</h2>
          </div>
          <form onSubmit={handleUpdateProfile} className="space-y-4" noValidate>
            {/* Name */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 flex items-center space-x-2">
                <FaToilet className="h-4 w-4 inline-block mr-1 text-gray-500" />
                <span>Restroom Name:</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-[#026738] focus:border-transparent transition-colors duration-200 text-sm text-[#026738] placeholder-[#026738]/60"
                required
                aria-required="true"
                aria-label="Restroom Name"
              />
            </div>

            {/* Address - locked */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 flex items-center space-x-2">
                <MapPinIcon className="h-4 w-4 inline-block mr-1 text-gray-500" />
                <span>Address:</span>
              </label>
              <input
                type="text"
                value={address}
                readOnly
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-100 text-sm text-[#026738] placeholder-[#026738]/60 cursor-not-allowed"
                aria-readonly="true"
                aria-label="Restroom Address"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 flex items-center space-x-2">
                <PhoneIcon className="h-4 w-4 inline-block mr-1 text-gray-500" />
                <span>Phone:</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-[#026738] focus:border-transparent transition-colors duration-200 text-sm text-[#026738] placeholder-[#026738]/60"
                aria-label="Phone Number"
              />
            </div>

            {/* Latitude and Longitude - locked */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600">Latitude:</label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  readOnly
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-100 text-sm text-[#026738] placeholder-[#026738]/60 cursor-not-allowed"
                  aria-readonly="true"
                  aria-label="Latitude"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600">Longitude:</label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  readOnly
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-100 text-sm text-[#026738] placeholder-[#026738]/60 cursor-not-allowed"
                  aria-readonly="true"
                  aria-label="Longitude"
                />
              </div>
            </div>

            {/* Use current location button */}
            <button
              type="button"
              onClick={handleCurrentLocation}
              disabled={isGeolocating}
              className="w-full bg-[#b5e171] text-[#026738] py-4 rounded-xl font-bold uppercase transition-colors duration-200 flex items-center justify-center "
              aria-busy={isGeolocating}
              aria-label="Use current location"
            >
              {isGeolocating ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <MapPinOutlineIcon className="h-5 w-5 mr-2" />
                  Use Current Location
                </>
              )}
            </button>

            {/* Submit */}
            <button
              type="submit"
              disabled={isUpdating}
              className="w-full bg-[#026738] text-white py-4 rounded-xl font-bold uppercase hover:bg-[#026738]/90 transition-colors duration-200 flex items-center justify-center "
              aria-disabled={isUpdating}
            >
              {isUpdating ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Update Profile'
              )}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-200">
          <div className="flex items-center space-x-3 text-[#026738] mb-4">
            <LockClosedIcon className="h-6 w-6" />
            <h2 className="text-lg font-bold">Change Password</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4" noValidate>
            {/* Current Password */}
            <div className="relative space-y-2">
              <label className="text-xs font-semibold text-gray-600 flex items-center space-x-2">
                <span>Current Password:</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-[#026738] focus:border-transparent transition-colors duration-200 text-sm text-[#026738] placeholder-[#026738]/60"
                required
                aria-required="true"
                aria-label="Current Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 mt-2 -translate-y-1/2 text-gray-500 hover:text-[#026738] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>

            {/* New Password */}
            <div className="relative space-y-2">
              <label className="text-xs font-semibold text-gray-600 flex items-center space-x-2">
                <span>New Password:</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-[#026738] focus:border-transparent transition-colors duration-200 text-sm text-[#026738] placeholder-[#026738]/60"
                required
                aria-required="true"
                aria-label="New Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 mt-2 -translate-y-1/2 text-gray-500 hover:text-[#026738] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>

            {/* Confirm New Password */}
            <div className="relative space-y-2">
              <label className="text-xs font-semibold text-gray-600 flex items-center space-x-2">
                <span>Confirm New Password:</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-[#026738] focus:border-transparent transition-colors duration-200 text-sm text-[#026738] placeholder-[#026738]/60"
                required
                aria-required="true"
                aria-label="Confirm New Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 mt-2 -translate-y-1/2 text-gray-500 hover:text-[#026738] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-[#026738] text-white py-4 rounded-xl font-bold uppercase hover:bg-[#026738]/90 transition-colors duration-200 flex items-center justify-center "
              disabled={isChangingPassword}
              aria-disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Change Password'
              )}
            </button>
          </form>
        </div>

        {/* Delete Account Section */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-red-200">
          <div className="flex items-center space-x-3 text-red-600 mb-4">
            <TrashIcon className="h-6 w-6" />
            <h2 className="text-lg font-bold">Delete Account</h2>
          </div>

          {!showDeleteConfirm ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 mb-4">
                Permanently delete your restroom account and all associated data. This action cannot be undone.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full bg-red-600 text-white py-4 rounded-xl font-bold uppercase hover:bg-red-700 transition-colors duration-200 flex items-center justify-center "
              >
                Delete Account
              </button>
            </div>
          ) : (
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-red-800 mb-1">Confirm Account Deletion</h3>
                    <p className="text-xs text-red-700 leading-relaxed">
                      This will permanently delete your restroom account, all associated data, reviews, and room information.
                      This action cannot be reversed.
                    </p>
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <label className="text-xs font-semibold text-gray-600">Enter password to confirm:</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-200 text-sm text-red-800 placeholder-red-800/60"
                      required
                      aria-required="true"
                      aria-label="Confirm password for account deletion"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-600 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletePassword('');
                  }}
                  className="flex-grow bg-gray-200 text-gray-700 py-4 rounded-xl font-bold uppercase hover:bg-gray-300 transition-colors duration-200 "
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-grow bg-red-600 text-white py-4 rounded-xl font-bold uppercase hover:bg-red-700 transition-colors duration-200 flex items-center justify-center "
                  disabled={isDeletingAccount}
                  aria-disabled={isDeletingAccount}
                >
                  {isDeletingAccount ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    'Confirm Delete'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestroomProfile;