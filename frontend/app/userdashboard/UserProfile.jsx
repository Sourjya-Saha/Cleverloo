import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useSession, signOut } from 'next-auth/react';
import {
  ArrowLeftIcon,
  UserCircleIcon,
  UserIcon,
  LockClosedIcon,
  PhoneIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

const apiUrl = "https://cleverloo-backend-1.vercel.app";

const UserProfile = ({ session, handleBackClick, updateSession }) => {
  const { update: updateNextAuthSession } = useSession();

  const [name, setName] = useState(session?.user?.name || '');
  const [phone, setPhone] = useState(session?.user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setName(session?.user?.name || '');
    setPhone(session?.user?.phone || '');
  }, [session?.user]);

  // Profile Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await axios.put(
        `${apiUrl}/user/edit`,
        { name, phone },
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      toast.success("PROFILE UPDATED SUCCESSFULLY!");

      const response = await axios.get(`${apiUrl}/user/profile/details`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      updateSession({ user: response.data });

      await updateNextAuthSession({
        name: response.data.name,
        phone: response.data.phone,
        // Add more fields if needed
      });

    } catch (error) {
      console.error('ERROR UPDATING PROFILE:', error);
      const errorMessage =
        error.response?.data?.message || "FAILED TO UPDATE PROFILE. PLEASE TRY AGAIN.";
      toast.error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  // Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast.error("NEW PASSWORDS DO NOT MATCH.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("PASSWORD MUST BE AT LEAST 6 CHARACTERS LONG.");
      return;
    }
    setIsChangingPassword(true);
    try {
      await axios.put(
        `${apiUrl}/user/change-password`,
        { currentPassword, newPassword },
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      toast.success("PASSWORD CHANGED SUCCESSFULLY!");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      console.error('ERROR CHANGING PASSWORD:', error);
      const errorMessage =
        error.response?.data?.message ||
        "FAILED TO CHANGE PASSWORD. CHECK YOUR CURRENT PASSWORD AND TRY AGAIN.";
      toast.error(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Delete Account
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePassword.trim()) {
      toast.error("PASSWORD IS REQUIRED TO DELETE ACCOUNT.");
      return;
    }
    setIsDeletingAccount(true);
    try {
      await axios.delete(
        `${apiUrl}/user/delete`,
        { 
          headers: { Authorization: `Bearer ${session.accessToken}` }, 
          data: { password: deletePassword } 
        }
      );
      
      toast.success("ACCOUNT DELETED SUCCESSFULLY!");
      
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
      console.error('ERROR DELETING ACCOUNT:', error);
      toast.error(error.response?.data?.message || "FAILED TO DELETE ACCOUNT. PLEASE CHECK YOUR PASSWORD AND TRY AGAIN.");
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteConfirm(false);
      setDeletePassword('');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 font-sans uppercase tracking-wider text-[#026738] overflow-hidden">
      {/* PROFILE HEADER */}
      <div className="relative bg-gradient-to-br from-[#bdfa70] to-[#87bc43] p-6 flex items-center justify-start flex-shrink-0 shadow-lg">
        <button
          onClick={handleBackClick}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/40 transition-colors duration-200"
        >
          <ArrowLeftIcon className="h-6 w-6 text-[#026738]" />
        </button>
        <div className="flex flex-col items-center w-full">
          <UserCircleIcon className="h-20 w-20 text-[#026738] mb-2" />
          <h1 className="text-xl font-bold text-white drop-shadow-md">{session?.user?.name || 'USER PROFILE'}</h1>
          <p className=" text-white/90 drop-shadow-sm flex items-center justify-between"> <PhoneIcon className="h-4 w-4 inline-block mr-2 text-[#026738]" />{session?.user?.phone || 'N/A'}</p>
        </div>
      </div>

      {/* PROFILE CONTENT */}
      <div className="flex-grow overflow-y-auto p-4 space-y-6 md:p-6">
        {/* EDIT PROFILE FORM */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-200">
          <div className="flex items-center space-x-3 text-[#026738] mb-4">
            <UserIcon className="h-6 w-6" />
            <h2 className="text-lg font-bold">EDIT PROFILE</h2>
          </div>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 flex items-center space-x-2">
                <span className="flex-shrink-0">
                  <EnvelopeIcon className="h-4 w-4 inline-block mr-1 text-gray-500" />
                  NAME:
                </span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-[#026738] focus:border-transparent transition-colors duration-200 text-sm text-[#026738] placeholder-[#026738]/60"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 flex items-center space-x-2">
                <span className="flex-shrink-0">
                  <PhoneIcon className="h-4 w-4 inline-block mr-1 text-gray-500" />
                  PHONE:
                </span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-[#026738] focus:border-transparent transition-colors duration-200 text-sm text-[#026738] placeholder-[#026738]/60"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#026738] text-white py-4 rounded-xl font-bold uppercase hover:bg-[#026738]/90 transition-colors duration-200 flex items-center justify-center shadow-lg"
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
              ) : (
                'UPDATE DETAILS'
              )}
            </button>
          </form>
        </div>

        {/* CHANGE PASSWORD FORM */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-200">
          <div className="flex items-center space-x-3 text-[#026738] mb-4">
            <LockClosedIcon className="h-6 w-6" />
            <h2 className="text-lg font-bold">CHANGE PASSWORD</h2>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="relative space-y-2">
              <label className="text-xs font-semibold text-gray-600 flex items-center space-x-2">
                <span className="flex-shrink-0">CURRENT PASSWORD:</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-[#026738] focus:border-transparent transition-colors duration-200 text-sm text-[#026738] placeholder-[#026738]/60"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 mt-2 -translate-y-1/2 text-gray-500 hover:text-[#026738] transition-colors"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            <div className="relative space-y-2">
              <label className="text-xs font-semibold text-gray-600 flex items-center space-x-2">
                <span className="flex-shrink-0">NEW PASSWORD:</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-[#026738] focus:border-transparent transition-colors duration-200 text-sm text-[#026738] placeholder-[#026738]/60"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 mt-2 -translate-y-1/2 text-gray-500 hover:text-[#026738] transition-colors"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            <div className="relative space-y-2">
              <label className="text-xs font-semibold text-gray-600 flex items-center space-x-2">
                <span className="flex-shrink-0">CONFIRM NEW PASSWORD:</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-[#026738] focus:border-transparent transition-colors duration-200 text-sm text-[#026738] placeholder-[#026738]/60"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 mt-2 -translate-y-1/2 text-gray-500 hover:text-[#026738] transition-colors"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            <button
              type="submit"
              className="w-full bg-[#026738] text-white py-4 rounded-xl font-bold uppercase hover:bg-[#026738]/90 transition-colors duration-200 flex items-center justify-center shadow-lg"
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
              ) : (
                'CHANGE PASSWORD'
              )}
            </button>
          </form>
        </div>

        {/* DELETE ACCOUNT SECTION */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-red-200">
          <div className="flex items-center space-x-3 text-red-600 mb-4">
            <TrashIcon className="h-6 w-6" />
            <h2 className="text-lg font-bold">DELETE ACCOUNT</h2>
          </div>

          {!showDeleteConfirm ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 mb-4">
                PERMANENTLY DELETE YOUR USER ACCOUNT AND ALL ASSOCIATED DATA. THIS ACTION CANNOT BE UNDONE.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full bg-red-600 text-white py-4 rounded-xl font-bold uppercase hover:bg-red-700 transition-colors duration-200 flex items-center justify-center shadow-lg"
              >
                DELETE ACCOUNT
              </button>
            </div>
          ) : (
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-red-800 mb-1">CONFIRM ACCOUNT DELETION</h3>
                    <p className="text-xs text-red-700 leading-relaxed">
                      THIS WILL PERMANENTLY DELETE YOUR USER ACCOUNT, ALL ASSOCIATED DATA, REVIEWS, AND PERSONAL INFORMATION.
                      THIS ACTION CANNOT BE REVERSED.
                    </p>
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <label className="text-xs font-semibold text-gray-600">ENTER PASSWORD TO CONFIRM:</label>
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
                  className="flex-grow bg-gray-200 text-gray-700 py-4 rounded-xl font-bold uppercase hover:bg-gray-300 transition-colors duration-200 shadow-lg"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-grow bg-red-600 text-white py-4 rounded-xl font-bold uppercase hover:bg-red-700 transition-colors duration-200 flex items-center justify-center shadow-lg"
                  disabled={isDeletingAccount}
                  aria-disabled={isDeletingAccount}
                >
                  {isDeletingAccount ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    'CONFIRM DELETE'
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

export default UserProfile;