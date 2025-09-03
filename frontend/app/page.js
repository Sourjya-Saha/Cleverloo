'use client';

import { useState, useRef, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  UserCircleIcon,
  PhoneIcon,
  LockClosedIcon,
  MapPinIcon,
  GlobeAltIcon,
  BuildingStorefrontIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import { FaToilet, FaToiletPaper } from 'react-icons/fa';

const API_BASE_URL = 'https://cleverloo-backend-1.vercel.app';

export default function LoginPage() {
  const [isUser, setIsUser] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [restroomName, setRestroomName] = useState('');
  const [restroomAddress, setRestroomAddress] = useState('');
  const [restroomLat, setRestroomLat] = useState('');
  const [restroomLong, setRestroomLong] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoadingScreen(false);
    }, 2000);

    if (status === 'authenticated' && session?.user?.role) {
      console.log('User authenticated, redirecting...', session.user.role);
      if (session.user.role === 'user') {
        router.push('/userdashboard');
      } else if (session.user.role === 'restroom') {
        router.push('/restroomdashboard');
      }
    }

    return () => clearTimeout(timer);
  }, [session, status, router]);

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    toast.dismiss(); // Dismiss any previous errors
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser.');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setRestroomLat(latitude.toString());
        setRestroomLong(longitude.toString());
        toast.success('Location obtained successfully!');

        try {
          const fallbackResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json();
            const address = data.display_name || `${latitude}, ${longitude}`;
            setRestroomAddress(address);
          } else {
            setRestroomAddress(`Lat: ${latitude.toFixed(6)}, Long: ${longitude.toFixed(6)}`);
          }
        } catch (error) {
          console.error('Error getting address:', error);
          setRestroomAddress(`Lat: ${latitude.toFixed(6)}, Long: ${longitude.toFixed(6)}`);
        }
        setLocationLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Unable to retrieve your location. Please enter manually.');
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    toast.dismiss();
    setIsLoading(true);

    if (phoneNumber.length !== 10 || !/^\d{10}$/.test(phoneNumber)) {
      toast.error('Please enter a valid 10-digit phone number.');
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      setIsLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        let endpoint = '';
        let payload = { password };

        if (isUser) {
          if (!userName || !phoneNumber || !password) {
            toast.error('Please fill in all user sign-up fields.');
            setIsLoading(false);
            return;
          }
          endpoint = '/signup/user';
          payload = { ...payload, name: userName, phone: phoneNumber };
        } else {
          if (!restroomName || !phoneNumber || !password) {
            toast.error('Please fill in restroom name, phone, and password.');
            setIsLoading(false);
            return;
          }
          endpoint = '/signup/restroom';
          payload = {
            ...payload,
            name: restroomName,
            phone: phoneNumber,
            latitude: parseFloat(restroomLat) || null,
            longitude: parseFloat(restroomLong) || null,
            address: restroomAddress || null
          };
        }

        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || `Server error: ${res.status}`);
        }

        toast.success(data.message + ' You can now sign in!');
        setIsSignUp(false);
        setPhoneNumber('');
        setPassword('');
        setUserName('');
        setRestroomName('');
        setRestroomAddress('');
        setRestroomLat('');
        setRestroomLong('');
      } else {
        const providerId = isUser ? 'user-login' : 'restroom-login';
        const credentials = {
          phone: phoneNumber,
          password,
          rememberMe,
        };
        
        const result = await signIn(providerId, { 
          ...credentials, 
          redirect: false,
          callbackUrl: isUser ? '/userdashboard' : '/restroomdashboard'
        });

        if (result?.error) {
          toast.error(result.error);
        } else if (result?.ok) {
          toast.success('Signed in successfully! Redirecting...');
          // The useEffect will handle the redirect based on session data
        } else {
          toast.error('An unexpected error occurred.');
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error(error.message || 'Failed to connect to the server. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

if (status === 'loading' || showLoadingScreen) {
  return (
    <div className="min-h-screen flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#bdfa70] to-[#87bc43] font-sans overflow-hidden relative">

      {/* Floating Restroom Icons */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <FaToilet className="absolute top-40 left-10 h-32 w-32 text-white opacity-25 rotate-12 " />
        <FaToiletPaper className="absolute bottom-40 right-16 h-28 w-28 text-white opacity-15 -rotate-12 " />
      </div>

      {/* Blurry Blob Backgrounds */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="w-48 h-48 bg-[#ffffff]/10 rounded-full blur-2xl absolute top-1/4 left-1/4 animate-blob"></div>
        <div className="w-64 h-64 bg-[#026738]/10 rounded-full blur-2xl absolute bottom-1/4 right-1/4 animate-blob animation-delay-2000"></div>
      </div>

      {/* Logo */}
      <div className="text-center relative z-10">
        <Image
          src="/Clever Loo LOGO - 3.png"
          alt="Clever Loo Logo"
          width={250}
          height={150}
          className="mx-auto mb-4 animate-pulse"
        />
      </div>
    </div>
  );
}


  return (
    <div className="min-h-screen flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#bdfa70] to-[#87bc43] font-sans overflow-hidden relative">

      {/* Floating Icons behind the main content */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <FaToilet className="absolute top-10 left-10 h-32 w-32 text-white opacity-25 rotate-12 float-around-delay" />
        <FaToiletPaper className="absolute bottom-20 right-16 h-28 w-28 text-white opacity-15 -rotate-12 float-around-delay" />
         <FaToilet className="absolute bottom-1/5 left-1/8 h-28 w-28 rotate-12 text-white opacity-15 float-around-delay" />
         <FaToiletPaper className="absolute top-1/5 right-1/8 h-24 w-24 text-white opacity-15 -rotate-12 float-around-delay" /> 
        {/* You can add more icons here */}
      </div>

      <div className="max-w-md w-full relative z-10 mx-auto">
        <div className="text-center mb-6 animate-fadeInDown">
          <div className="relative inline-block">
            <Image
              src="/Clever Loo LOGO - 3.png"
              alt="Clever Loo Logo"
              width={200}
              height={100}
              className="relative z-10 mx-auto"
            />
          </div>
          <div className="flex items-center justify-center w-full gap-4 mt-4 px-4">
            <div className="flex-grow border-t border-black"></div>
            <h2
              className="text-sm font-bold text-[#026738] tracking-wide uppercase whitespace-nowrap"
              style={{ fontFamily: "Poppins" }}
            >
              The smart way to find a loo.
            </h2>
            <div className="flex-grow border-t border-black"></div>
          </div>
        </div>

        <div className="rounded-[2rem] p-6 pt-0 sm:p-8 space-y-5 animate-slideInUp animation-delay-400 ">

          <div className="relative bg-[#026738]/10 p-1 px-2 rounded-2xl shadow-inner border border-[#026738]/20">
            <div
              className={`absolute top-1 bottom-1 rounded-xl transition-all duration-500 ease-out shadow-md ${
                isUser ? 'left-1 right-1/2 mr-1 bg-[#bdfa70]' : 'right-1 left-1/2 ml-1 bg-[#87bc43]'
              }`}
            ></div>
          <div className="relative grid grid-cols-2 gap-3">
  {/* User Button */}
  <button
    onClick={() => setIsUser(true)}
    className={`py-3 px-4 rounded-xl text-[12px] sm:text-base font-semibold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all duration-500 ease-in-out transform-gpu ${
      isUser
        ? 'text-[#026738] bg-white scale-105'
        : 'text-[#026738] opacity-70 hover:opacity-100 scale-100'
    }`}
  >
    <UserCircleIcon
      className={`h-5 w-5 transition-transform duration-700 ease-in-out transform-gpu ${
        isUser ? 'scale-110' : 'scale-100'
      }`}
    />
    <span className={`transition-opacity duration-500 ${isUser ? 'opacity-100' : 'opacity-80'}`}>User</span>
  </button>

  {/* Restroom Button */}
  <button
    onClick={() => setIsUser(false)}
    className={`py-3 px-4 rounded-xl text-[12px] sm:text-base font-semibold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all duration-500 ease-in-out transform-gpu ${
      !isUser
        ? 'text-[#026738] bg-white scale-105'
        : 'text-[#026738] opacity-70 hover:opacity-100 scale-100'
    }`}
  >
    <FaToilet
      className={`h-4 w-4 transition-transform duration-700 ease-in-out transform-gpu ${
        !isUser ? 'scale-110' : 'scale-100'
      }`}
    />
    <span className={`transition-opacity duration-500 ${!isUser ? 'opacity-100' : 'opacity-80'}`}>Restroom</span>
  </button>
</div>

          </div>

          <form className="space-y-4" onSubmit={handleSubmit} ref={formRef}>
            <div className="space-y-4">
              {isSignUp && (
                <div className={`transition-all duration-500 transform ${isSignUp ? 'animate-slideInLeft' : 'opacity-0 -translate-x-full'}`}>
                  {isUser ? (
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                        <UserCircleIcon className="h-5 w-5 text-[#87bc43] group-focus-within:text-[#026738] transition-colors duration-200" />
                      </div>
                      <input
                        type="text"
                        required
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full pl-12 pr-4 py-2.5 sm:py-3 bg-white/50 border border-gray-300 rounded-xl placeholder-[#026738] text-black focus:outline-none focus:ring-2 focus:ring-[#87bc43] focus:border-transparent transition-all duration-300 hover:bg-white/80 text-sm sm:text-base font-semibold uppercase tracking-wider"
                        placeholder="Your Name"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                          <FaToilet className="h-4 w-4 text-[#87bc43] group-focus-within:text-[#026738] transition-colors duration-200" />
                        </div>
                        <input
                          type="text"
                          required
                          value={restroomName}
                          onChange={(e) => setRestroomName(e.target.value)}
                          className="w-full pl-12 pr-4 py-2.5 sm:py-3 bg-white/50 border border-gray-300 rounded-xl placeholder-[#026738] text-black focus:outline-none focus:ring-2 focus:ring-[#87bc43] focus:border-transparent transition-all duration-300 hover:bg-white/80 text-sm sm:text-base font-semibold uppercase tracking-wider"
                          placeholder="Restroom Name"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={getCurrentLocation}
                        disabled={locationLoading}
                        className="w-full py-2.5 sm:py-3 px-4 bg-gradient-to-r from-[#87bc43] to-[#bdfa70] text-[#026738] rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-[12px] sm:text-base uppercase tracking-wider shadow-md"
                      >
                        <GlobeAltIcon className={`h-5 w-5 ${locationLoading ? 'animate-spin' : 'animate-pulse'}`} />
                        <span>{locationLoading ? 'Getting Location...' : 'Use Current Location'}</span>
                      </button>

                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                          <MapPinIcon className="h-5 w-5 text-[#87bc43] group-focus-within:text-[#026738] transition-colors duration-200" />
                        </div>
                        <input
                          type="text"
                          readOnly
                          value={restroomAddress}
                          onChange={(e) => setRestroomAddress(e.target.value)}
                          className="w-full pl-12 pr-4 py-2.5 sm:py-3 bg-white/50 border border-gray-300 rounded-xl placeholder-[#026738] text-black focus:outline-none focus:ring-2 focus:ring-[#87bc43] focus:border-transparent transition-all duration-300 hover:bg-white/80 text-sm sm:text-base font-semibold uppercase tracking-wider"
                          placeholder="Restroom Address"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                  <PhoneIcon className="h-5 w-5 text-[#87bc43] group-focus-within:text-[#026738] transition-colors duration-200" />
                </div>
                <input
                  type="text"
                  required
                  value={phoneNumber}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value) && value.length <= 10) {
                      setPhoneNumber(value);
                    }
                  }}
                  className="w-full pl-12 pr-4 py-2.5 sm:py-3 bg-white/50 border border-gray-300 rounded-xl placeholder-[#026738] text-black focus:outline-none focus:ring-2 focus:ring-[#87bc43] focus:border-transparent transition-all duration-300 uppercase tracking-wider hover:bg-white/80 text-sm sm:text-base font-semibold"
                  placeholder="Phone number"
                  maxLength={10}
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                  <LockClosedIcon className="h-5 w-5 text-[#87bc43] group-focus-within:text-[#026738] transition-colors duration-200" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-2.5 sm:py-3 bg-white/50 border border-gray-300 rounded-xl placeholder-[#026738] text-black focus:outline-none focus:ring-2 uppercase tracking-wider focus:ring-[#87bc43] focus:border-transparent transition-all duration-300 hover:bg-white/80 text-sm sm:text-base font-semibold"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#87bc43] hover:text-[#026738] focus:outline-none transition-colors duration-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {!isSignUp && (
              <div className="flex items-center justify-start mt-2">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-[#026738] bg-white border-gray-300 rounded focus:ring-2 focus:ring-[#87bc43]"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm sm:text-base text-[#026738] font-semibold uppercase tracking-wider">
                  Remember Me
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2.5 sm:py-3 px-4 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-105 hover:shadow-xl text-sm sm:text-base ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-[#026738] to-[#87bc43] hover:from-[#87bc43] hover:to-[#026738] shadow-lg'
              }`}
            >
              <span className="flex items-center justify-center uppercase tracking-wider space-x-2">
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Please wait...</span>
                  </>
                ) : (
                  <>
                    {isSignUp ? <UserCircleIcon className="h-5 w-5" /> : <LockClosedIcon className="h-5 w-5" />}
                    <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="text-center mt-4">
            <p className="text-gray-600 text-sm sm:text-base">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  toast.dismiss();
                  setPhoneNumber('');
                  setPassword('');
                  setUserName('');
                  setRestroomName('');
                  setRestroomAddress('');
                  setRestroomLat('');
                  setRestroomLong('');
                }}
                className="font-semibold text-[#026738] hover:text-[#026738]/80 transition-all duration-200 hover:scale-105 inline-block"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-5 w-full text-center z-10 animate-slideInUp animation-delay-600">
        <span className="text-xs text-[#026738] font-bold uppercase tracking-wider">
          Powered by
        </span>
        <Image
          src="/BIOAXAR COMPANY Logo - 3.png"
          alt="Bioaxar Logo"
          width={100}
          height={50}
          className="mx-auto mt-1"
        />
      </div>

  <ToastContainer
  position="top-right"
  autoClose={3000}
  hideProgressBar={false}
  newestOnTop={false}
  closeOnClick
  rtl={false}
  pauseOnFocusLoss
  draggable
  pauseOnHover
  theme="light"
  toastClassName="custom-toast"
  progressClassName="custom-progress"
  style={{ zIndex: 1000 }}
/>

      <style jsx>{`
        body {
          font-family: 'Poppins', sans-serif;
        }
        
        .custom-progress {
          background: linear-gradient(90deg, #bdfa70, #87bc43);
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
        
        @keyframes float-delay {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-10deg); }
        }
        
        @keyframes float-short {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }

        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delay { animation: float-delay 7s ease-in-out infinite; }
        .animate-float-short { animation: float-short 5s ease-in-out infinite; }
        .animate-blob { animation: blob 7s ease-in-out infinite; }
        .animate-fadeInDown { animation: fadeInDown 0.8s ease-out; }
        .animate-slideInUp { animation: slideInUp 0.8s ease-out; }
        .animate-slideInLeft { animation: slideInLeft 0.5s ease-out; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-400 { animation-delay: 0.4s; }
        .animation-delay-600 { animation-delay: 0.6s; }
        .animation-delay-2000 { animation-delay: 2s; }
      `}</style>
    </div>
  );
}