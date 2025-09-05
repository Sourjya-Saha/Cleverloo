"use client";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useSession } from 'next-auth/react'; // Add this import
import {
  ArrowLeftIcon,
  MapPinIcon,
  StarIcon,
  GlobeAltIcon,
  LockClosedIcon,
  CurrencyDollarIcon,
  ChevronRightIcon,
  MapIcon,
  BookmarkIcon as BookmarkOutlineIcon,
} from "@heroicons/react/24/outline";
import { 
  BellIcon, 
  BookmarkIcon as BookmarkSolidIcon, 
  UserCircleIcon,
  KeyIcon
} from "@heroicons/react/24/solid";
import { 
  FaToilet, 
  FaWheelchair, 
  FaUsers, 
  FaVideo, 
  FaBus, 
  FaTrain, 
  FaSubway,
  FaToiletPaper 
} from "react-icons/fa";
import { toast, ToastContainer } from 'react-toastify';
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import UserProfile from './UserProfile'; // Make sure to import UserProfile
import BookmarkedWashrooms from "./BookmarkedWashrooms";
import WriteReview from "./WriteReview";
const apiUrl = "https://cleverloo-backend-1.vercel.app";
const RestroomDetails = ({
  restroomId,
  onClose,
  session: propSession, // Rename to avoid confusion
}) => {
  // Use the hook for real-time session updates, but fall back to prop
  const { data: sessionData, update } = useSession();
  const session = sessionData || propSession;

  const [restroomDetails, setRestroomDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reviewImageIndex, setReviewImageIndex] = useState({});
  const [showAllRooms, setShowAllRooms] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false); // Add this state
 const [showBookmarks, setShowBookmarks] = useState(false);
 const [showWriteReview, setShowWriteReview] = useState(false);
const [userReviewCount, setUserReviewCount] = useState(0);

// Add this function to check if user has already reviewed:
const checkUserReviewStatus = async () => {
  if (!session?.accessToken) return;
  try {
    const response = await fetch(`${apiUrl}/restrooms/${restroomId}/user-review-status`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    
    if (response.ok) {
      const data = await response.json();
      setUserReviewCount(data.reviewCount || 0);
    }
  } catch (error) {
    console.error("ERROR CHECKING USER REVIEW STATUS:", error);
  }
};



  // Refresh API every 10 seconds
  const intervalRef = useRef();

  useEffect(() => {
    if (!session?.accessToken) {
      toast.error("PLEASE SIGN IN TO VIEW DETAILS.");
      return;
    }
    
    fetchRestroomDetails();
    checkBookmarkStatus();
    setShowAllReviews(false);
    setShowAllRooms(false);
checkUserReviewStatus();
    // Poll every 10 seconds for real-time status
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchRestroomDetails, 10000);
    return () => clearInterval(intervalRef.current);
  }, [restroomId, session?.accessToken]);

  useEffect(() => {
    if (restroomDetails?.pictures?.length > 1) {
      const slideInterval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % restroomDetails.pictures.length);
      }, 4000);
      return () => clearInterval(slideInterval);
    }
  }, [restroomDetails?.pictures?.length]);

  const fetchRestroomDetails = async () => {
    if (!session?.accessToken) {
      toast.error("PLEASE SIGN IN TO VIEW DETAILS.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/restrooms/${restroomId}/details`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (typeof data.description === "string") {
        try {
          data.description = JSON.parse(data.description);
        } catch {
          data.description = {};
        }
      }

      setRestroomDetails(data);
    } catch (error) {
      console.error("ERROR FETCHING RESTROOM DETAILS:", error);
      toast.error("FAILED TO FETCH RESTROOM DETAILS.");
      setRestroomDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const checkBookmarkStatus = async () => {
    if (!session?.accessToken) return;
    try {
      const response = await fetch(`${apiUrl}/user/bookmarks`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        let bookmarks = data.bookmarks || [];
        const restroomIdNum = parseInt(restroomId);
        setIsBookmarked(bookmarks.includes(restroomIdNum));
      } else {
        console.error("Failed to fetch bookmarks:", response.status);
        setIsBookmarked(false);
      }
    } catch (error) {
      console.error("ERROR CHECKING BOOKMARK STATUS:", error);
      setIsBookmarked(false);
    }
  };

  const toggleBookmark = async () => {
    if (!session?.accessToken) {
      toast.error("PLEASE SIGN IN TO BOOKMARK.");
      return;
    }
    
    setBookmarkLoading(true);
    try {
      const response = await fetch(`${apiUrl}/user/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ restroomId: parseInt(restroomId) }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsBookmarked(data.isBookmarked);
        toast.success(data.action === 'added' ? "ADDED TO BOOKMARKS" : "REMOVED FROM BOOKMARKS");
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "FAILED TO UPDATE BOOKMARK");
      }
    } catch (error) {
      console.error("ERROR TOGGLING BOOKMARK:", error);
      toast.error("FAILED TO UPDATE BOOKMARK");
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleProfileClick = () => {
    setIsProfileOpen(true);
  };

  const handleBackClick = () => {
    setIsProfileOpen(false);
  };


    const handleOpenBookmarks = () => setShowBookmarks(true);
  // Handler to close bookmarks and return here
  const handleCloseBookmarks = () => setShowBookmarks(false);

  const renderStars = (rating) => {
    const stars = [];
    const numRating = Number(rating) || 0;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <StarIcon
          key={i}
          className={`h-4 w-4 ${i <= numRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
        />
      );
    }
    return stars;
  };

  const getRestroomTypeInfo = (type) => {
    switch (type) {
      case "public":
        return {
          icon: FaToilet,
          label: "PUBLIC",
          color: "text-green-800 bg-green-100",
        };
      case "private":
        return {
          icon: LockClosedIcon,
          label: "PRIVATE",
          color: "text-red-800 bg-red-100",
        };
      case "paid":
        return {
          icon: () => <span className="text-xs mr-1 font-bold">₹</span>,
          label: "PAID",
          color: "text-blue-800 bg-blue-100",
        };
      default:
        return {
          icon: FaToilet,
          label: "PUBLIC",
          color: "text-green-800 bg-green-100",
        };
    }
  };

const getQueueStatusBadge= (status) => {
    let color;
    let label = status?.toUpperCase() || 'UNKNOWN';
    
    if (status?.toLowerCase() === "vacant") {
        color = "bg-green-100 text-green-800";
    } else if (status?.toLowerCase() === "in use") {
        color = "bg-red-100 text-red-800";
    } else if (status?.toLowerCase() === "cleaning") {
        color = "bg-blue-100 text-blue-800";
    } else if (status?.toLowerCase() === "under maintenance") {
        color = "bg-yellow-100 text-yellow-800";
    } else {
        color = "bg-gray-100 text-gray-800";
    }
    
    return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${color} space-x-1`}>
            <FaToilet className="h-3 w-3" />
            <span>{label}</span>
        </span>
    );
};

  const getFeatureIcon = (feature) => {
    switch (feature) {
      case "cctv":
        return FaVideo;
      case "handicap_accessible":
        return FaWheelchair;
      case "baby_changing_station":
        return FaUsers;
      default:
        return FaUsers;
    }
  };

  const getRatingDistribution = (reviews) => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((review) => {
      const rating = Math.floor(review.rating);
      if (rating >= 1 && rating <= 5) {
        distribution[rating]++;
      }
    });
    return distribution;
  };

  const handleReviewImageChange = (reviewId, imageIndex) => {
    setReviewImageIndex((prev) => ({ ...prev, [reviewId]: imageIndex }));
  };

  const NoImagePlaceholder = ({ title, className = "" }) => (
    <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
      <div className="text-center">
        <FaToilet className="h-12 w-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500 text-sm uppercase tracking-wider">{title}</p>
      </div>
    </div>
  );

  const handleGetDirections = () => {
    if (restroomDetails.latitude && restroomDetails.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${restroomDetails.latitude},${restroomDetails.longitude}&travelmode=driving`;
      window.open(url, "_blank");
    } else if (restroomDetails.address) {
      const encodedAddress = encodeURIComponent(restroomDetails.address);
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`;
      window.open(url, "_blank");
    } else {
      toast.error("LOCATION NOT AVAILABLE FOR DIRECTIONS");
    }
  };

const calculateStatus = () => {
    if (!restroomDetails?.rooms?.length) return "INACTIVE";
    
    // Check if any room is vacant - if so, return 'VACANT'
    const hasVacantRoom = restroomDetails.rooms.some(room => room.queue_status === "Vacant");
    if (hasVacantRoom) {
        return "VACANT";
    }
    
    // If no vacant rooms, find the most common status among all rooms
    const statusCounts = {};
    restroomDetails.rooms.forEach(room => {
        const status = room.queue_status || 'Unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    const mostCommonStatus = Object.keys(statusCounts).reduce((a, b) => 
        statusCounts[a] > statusCounts[b] ? a : b
    );
    
    // Return the most common status, or map it to your preferred labels
    return mostCommonStatus.toLowerCase() === "in use" ? "IN USE" : mostCommonStatus.toUpperCase();
};



const handleWriteReview = () => {
  if (!session?.accessToken) {
    toast.error("PLEASE SIGN IN TO WRITE A REVIEW.");
    return;
  }
  setShowWriteReview(true);
};

const handleCloseWriteReview = () => {
  setShowWriteReview(false);
};

const handleReviewSubmitted = (newReview) => {
  // Add the new review to the existing reviews
  setRestroomDetails(prev => ({
    ...prev,
    reviews: [newReview, ...(prev.reviews || [])]
  }));
  setUserReviewCount(prev => prev + 1);
  setShowWriteReview(false);
};

// Add this conditional render at the top of your return statement:
if (showWriteReview) {
  return (
    <WriteReview
      restroomId={restroomId}
      restroomName={restroomDetails?.name}
      onClose={handleCloseWriteReview}
      onSubmit={handleReviewSubmitted}
      session={session}
      userReviewCount={userReviewCount}
    />
  );
}

  const typeInfo = getRestroomTypeInfo(restroomDetails?.type);
  const ratingDistribution = getRatingDistribution(restroomDetails?.reviews || []);
  const totalReviews = restroomDetails?.reviews?.length || 0;
  const displayReviews = showAllReviews ? restroomDetails?.reviews : restroomDetails?.reviews?.slice(0, 3);
  console.log("Display Reviews:" , displayReviews)
  const totalRooms = restroomDetails?.rooms?.length || 0;
  const displayRooms = showAllRooms ? restroomDetails?.rooms : restroomDetails?.rooms?.slice(0, 3);

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#BDFa70] to-[#87BC43]">
                        {/* Background Icons */}
                        <div className="absolute inset-0 overflow-hidden z-0">
                            <FaToilet className="absolute top-40 left-10 h-32 w-32 text-white opacity-25 rotate-12" />
                            <FaToiletPaper className="absolute bottom-40 right-16 h-28 w-28 text-white opacity-15 -rotate-12" />
                        </div>
        
                        {/* Background Blobs */}
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="w-48 h-48 bg-white/10 rounded-full blur-2xl absolute top-1/4 left-1/4 animate-blob"></div>
                            <div className="w-64 h-64 bg-[#026738]/10 rounded-full blur-2xl absolute bottom-1/4 right-1/4 animate-blob animation-delay-2000"></div>
                        </div>
        
                        {/* Logo */}
                        <div className="relative z-10 flex flex-col items-center">
                            <Image
                                src="/Clever Loo LOGO - 3.png"
                                alt="CLEVER LOO LOGO"
                                width={250}
                                height={150}
                                className="animate-pulse mb-6"
                            />
        
                            {/* Loading Spinner and Text */}
                            <div className="flex flex-col items-center mt-[-10px]">
              
                                <p className="text-[#026738] font-semibold uppercase tracking-wider text-sm ">   LOADING WASHROOM...</p>
                            </div>
                        </div>
                    </div>
    );
  }

  if (!restroomDetails) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 uppercase tracking-wider">RESTROOM NOT FOUND</p>
          <button
            onClick={onClose}
            className="mt-4 bg-[#026738] text-white px-6 py-2 rounded-full uppercase tracking-wider"
          >
            GO BACK
          </button>
        </div>
      </div>
    );
  }

  if (isProfileOpen) {
    return <UserProfile session={session} handleBackClick={handleBackClick} updateSession={update} />;
  }


   if (showBookmarks) {
    return (
      <BookmarkedWashrooms
        onClose={handleCloseBookmarks}
        onViewRestroom={(id) => {
          setShowBookmarks(false);
          // Possibly update restroomId or trigger navigation to that restroom details
        }}
        session={session}
        UserProfile={UserProfile}
        isProfileOpen={isProfileOpen}
        handleBackClick={handleBackClick}
        updateSession={update}
      />
    );
  }
  // Enhanced Blurry Overlay with perfect gradient and backdrop filter
  const EnhancedBlurryOverlay = () => (
    <div
      className="absolute bottom-0 left-0 w-full h-5 pointer-events-none"
      style={{
        background: `
          linear-gradient(
            0deg, 
            rgba(255,255,255,0.95) 0%, 
            rgba(255,255,255,0.85) 25%, 
            rgba(255,255,255,0.6) 50%, 
            rgba(255,255,255,0.3) 75%, 
            rgba(255,255,255,0.0) 100%
          )
        `,
        backdropFilter: 'blur(25px) saturate(180%)',
        WebkitBackdropFilter: 'blur(25px) saturate(180%)',
      }}
    />
  );

  // Transport Icons
  const MetroIcon = FaSubway;
  const TrainIconComp = FaTrain;
  const BusIconComp = FaBus;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header image with enhanced blurry bottom */}
      <div className="relative">
        <div className="relative h-64 bg-gray-200 overflow-hidden">
          {restroomDetails.pictures && restroomDetails.pictures.length > 0 ? (
            <>
              <div className="relative w-full h-full">
                <Image
                  src={restroomDetails.pictures[currentImageIndex]}
                  alt={restroomDetails.name}
                  fill
                  className="object-cover transition-all duration-1000 ease-in-out"
                  priority
                />
                <EnhancedBlurryOverlay />
              </div>
              {restroomDetails.pictures.length > 1 && (
                <div className="absolute bottom-7 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
                  {restroomDetails.pictures.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        index === currentImageIndex 
                          ? "bg-white scale-110 shadow-lg" 
                          : "bg-white/60 hover:bg-white/80"
                      }`}
                      aria-label={`Select image ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <NoImagePlaceholder title="NO IMAGE AVAILABLE" className="h-full" />
          )}
          
          {/* Back button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg hover:bg-white transition-all duration-200 z-10"
            aria-label="Close restroom details"
          >
            <ArrowLeftIcon className="h-5 w-5 text-[#026738]" />
          </button>

          {/* Bookmark button */}
          <button
            onClick={toggleBookmark}
            disabled={bookmarkLoading}
            className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg hover:bg-white transition-all duration-200 z-10 disabled:opacity-50"
            aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
          >
            {bookmarkLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#026738]"></div>
            ) : isBookmarked ? (
              <BookmarkSolidIcon className="h-5 w-5 text-[#026738]" />
            ) : (
              <BookmarkOutlineIcon className="h-5 w-5 text-[#026738]" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-36 px-4">
        {/* Title + Type + Status with toilet icon */}
        <div className="flex items-center justify-between mt-4 mb-2">
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <h1 className="text-xl font-bold text-[#026738] uppercase tracking-wider">{restroomDetails.name}</h1>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${typeInfo.color}`}>
                <typeInfo.icon className="h-4 w-4 mr-1" />
                <span className="tracking-wider">{typeInfo.label}</span>
              </span>
              <span className="ml-3">{getQueueStatusBadge(calculateStatus())}</span>
            </div>
          </div>
        </div>

        {/* Rating */}
        <div className="flex items-center mb-4 mt-3">
          <div className="flex items-center mr-2">{renderStars(restroomDetails.rating)}</div>
          <span className="text-sm text-gray-600 uppercase tracking-wider">({totalReviews} review{totalReviews !== 1 ? 's' : ''})</span>
        </div>

        {/* Address */}
        {restroomDetails.address && (
          <div className="flex items-start space-x-2 mb-4">
            <MapPinIcon className="h-7 w-7 text-[#026738] bg-green-100 p-1 rounded-2xl mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600 uppercase tracking-wider">{restroomDetails.address}</p>
          </div>
        )}

        {/* Get Directions with fixed map background */}
        <div className="mb-6">
          <button
            onClick={handleGetDirections}
            className="w-full rounded-xl h-16 flex items-center justify-center group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            aria-label="Get directions to restroom location"
          >
            <div className="absolute inset-0">
              <Image
                src="/map.png"
                alt="Map background"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/70 to-blue-800/70 group-hover:from-blue-700/80 group-hover:to-blue-900/80 transition-all duration-300"></div>
            <div className="relative z-10 flex items-center justify-center space-x-3 text-white uppercase tracking-wide font-bold">
              <ArrowUpRightIcon className="h-7 w-7 text-blue-600/70 bg-white rounded-2xl p-1" strokeWidth={4} />
              <div>
                <div className="text-lg">GET DIRECTIONS</div>
              </div>
            </div>
          </button>
        </div>

        {/* Nearest Transport */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <h3 className="font-semibold text-[#026738] mb-3 uppercase tracking-wider flex items-center">
            <FaBus className="h-7 w-7 mr-2 bg-green-100 p-1 rounded-2xl" />
            Nearby Transport
          </h3>
          {!restroomDetails.description?.nearest_transport_train &&
          !restroomDetails.description?.nearest_transport_bus &&
          !restroomDetails.description?.nearest_transport_metro ? (
            <p className="text-sm text-gray-500 uppercase tracking-wide">No nearby transport info available.</p>
          ) : (
            <ul className="space-y-2 text-sm text-gray-700 uppercase tracking-wide">
              {restroomDetails.description?.nearest_transport_train && (
                <li className="flex items-center space-x-3 p-2 bg-white rounded-lg">
                  <TrainIconComp className="h-7 w-7 p-1 text-white bg-[#026738] rounded-2xl" />
                  <span>{restroomDetails.description.nearest_transport_train}</span>
                </li>
              )}
              {restroomDetails.description?.nearest_transport_bus && (
                <li className="flex items-center space-x-3 p-2 bg-white rounded-lg">
                  <BusIconComp className="h-7 w-7 p-1 text-white bg-[#026738] rounded-2xl" />
                  <span>{restroomDetails.description.nearest_transport_bus}</span>
                </li>
              )}
              {restroomDetails.description?.nearest_transport_metro && (
                <li className="flex items-center space-x-3 p-2 bg-white rounded-lg">
                  <MetroIcon className="h-7 w-7 p-1 text-white bg-[#026738] rounded-2xl" />
                  <span>{restroomDetails.description.nearest_transport_metro}</span>
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Features */}
        {restroomDetails.description?.features?.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-[#026738] mb-3 uppercase tracking-wider flex items-center">
              <KeyIcon className="h-7 w-7 mr-2 bg-green-100 p-1 rounded-2xl" />
              Features
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {restroomDetails.description.features.map((feature, idx) => {
                const Icon = getFeatureIcon(feature);
                return (
                  <div key={idx} className="flex items-center space-x-3 p-2 bg-white rounded-lg">
                    <span className="flex items-center justify-center h-7 w-7 p-1 text-white bg-[#026738] rounded-2xl">
                      <Icon className="text-white" />
                    </span>
                    <span className="text-[#026738] text-sm font-medium uppercase tracking-wider flex-1">
                      {feature.replace(/_/g, " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rooms */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-[#026738] mb-3 uppercase tracking-wider flex items-center">
            <FaToilet className="h-7 w-7 mr-2 bg-green-100 p-1 rounded-2xl" />
            Washroom Rooms
          </h3>
          <div className="space-y-3">
            {displayRooms.map((room) => (
              <div key={room.room_id} className="p-4 bg-white rounded-lg shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <p className="font-semibold text-[#026738] uppercase tracking-wider">{room.room_name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600 uppercase tracking-wide">
                        Status: {getQueueStatusBadge(room.queue_status)}
                      </p>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Last Cleaned: {new Date(room.last_cleaned).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalRooms > 3 && (
            <div className="text-center mt-4">
              {!showAllRooms ? (
                <button
                  onClick={() => setShowAllRooms(true)}
                  className="flex items-center justify-center space-x-2 text-[#026738] font-semibold text-sm uppercase tracking-wider hover:underline mx-auto transition-all duration-200"
                  aria-label="View more rooms"
                >
                  <span>+ VIEW MORE ROOMS</span>
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => setShowAllRooms(false)}
                  className="text-[#026738] font-semibold text-sm uppercase tracking-wider hover:underline transition-all duration-200"
                  aria-label="Show less rooms"
                >
                  SHOW LESS
                </button>
              )}
            </div>
          )}
        </div>

        {/* Reviews */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-[#026738] mb-3 uppercase tracking-wider flex items-center">
            <StarIcon className="h-7 w-7 mr-2 bg-green-100 p-1 rounded-2xl" />
            REVIEWS
          </h2>

          {/* Rating Distribution Bar */}
          {totalReviews > 0 && (
            <div className="mb-4 space-y-2 bg-gray-50 rounded-xl p-4">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center space-x-3">
                  <span className="text-sm font-medium w-2 text-[#026738]">{rating}</span>
                  <StarIcon className="h-4 w-4 text-yellow-400" />
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-[#026738] to-[#87BC43] h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(ratingDistribution[rating] / totalReviews) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-6 text-right">{ratingDistribution[rating]}</span>
                </div>
              ))}
            </div>
          )}

          {/* Individual Reviews */}
          <div className="space-y-4">
            {displayReviews?.length > 0 ? (
              displayReviews.map((review, idx) => {
                const hasReviewImages = review.pictures && review.pictures.length > 0;
                return (
                  <div key={review.review_id || idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#026738] to-[#87BC43] rounded-full flex items-center justify-center shadow-md">
                        <span className="text-white text-sm font-bold uppercase">
                          {review.user_name?.charAt(0) || "U"}
                        </span>
                        
                      </div>
                      <div className="flex-1">
                         <span className="text-[#026738] text-sm font-bold uppercase">
                          {review.user_name}
                        </span>
                        <div className="flex items-center mb-2">{renderStars(review.rating)}</div>
                        {review.comment && (
                          <p className="text-sm text-gray-600 uppercase tracking-wider mb-3 leading-relaxed">
                            {review.comment}
                          </p>
                        )}

                        {hasReviewImages ? (
                          <div className="mt-3">
                            <div className="relative w-full h-40 rounded-lg overflow-hidden shadow-md">
                              <Image
                                src={review.pictures[reviewImageIndex[review.review_id] || 0]}
                                alt="Review image"
                                fill
                                className="object-cover transition-all duration-300"
                              />
                            </div>
                            {review.pictures.length > 1 && (
                              <div className="flex space-x-1 mt-2 overflow-x-auto pb-1">
                                {review.pictures.map((image, imgIndex) => (
                                  <button
                                    key={imgIndex}
                                    onClick={() => handleReviewImageChange(review.review_id, imgIndex)}
                                    className={`relative w-14 h-10 rounded border-2 flex-shrink-0 transition-all duration-200 ${
                                      imgIndex === (reviewImageIndex[review.review_id] || 0)
                                        ? "border-[#026738] scale-105"
                                        : "border-transparent hover:border-gray-300"
                                    }`}
                                    aria-label={`Select review image ${imgIndex + 1}`}
                                  >
                                    <Image
                                      src={image}
                                      alt={`Review image ${imgIndex + 1}`}
                                      fill
                                      className="object-cover rounded"
                                    />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <StarIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 uppercase tracking-wider">NO REVIEWS YET</p>
                <p className="text-sm text-gray-400 mt-1 uppercase tracking-wider">
                  BE THE FIRST TO REVIEW THIS RESTROOM
                </p>
              </div>
            )}
          </div>

          {totalReviews > 3 && (
            <div className="text-center mt-4">
              {!showAllReviews ? (
                <button
                  onClick={() => setShowAllReviews(true)}
                  className="flex items-center justify-center space-x-2 text-[#026738] font-semibold text-sm uppercase tracking-wider hover:underline mx-auto transition-all duration-200"
                  aria-label="View more reviews"
                >
                  <span>VIEW MORE REVIEWS</span>
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => setShowAllReviews(false)}
                  className="text-[#026738] font-semibold text-sm uppercase tracking-wider hover:underline transition-all duration-200"
                  aria-label="Show less reviews"
                >
                  SHOW LESS
                </button>
              )}
            </div>
          )}
        </div>
        {/* Write Review Button */}
<div className="mb-8">
  <button
    onClick={handleWriteReview}
    className="w-full bg-gradient-to-r from-[#026738] to-[#87BC43] text-white py-4 px-6 rounded-xl font-bold uppercase tracking-wider hover:from-[#025730] hover:to-[#7AA93C] transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
    aria-label="Write a review for this washroom"
  >
    
    <span>
      
        Write a Review
      
    </span>
  </button>
</div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-gradient-to-br from-[#BDFa70] to-[#87BC43] p-4 flex items-center justify-around py-6 relative shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-[rgba(2,103,56,0.3)] to-transparent pointer-events-none" />
          <button
            className="flex flex-col items-center text-[#026738] hover:text-[#026738]/80 transition-all duration-200 hover:scale-110 p-2 rounded-lg"
            aria-label="Notifications"
          >
            <BellIcon className="h-7 w-7 text-[#026738]" />
          </button>
          <button
          onClick={handleOpenBookmarks}
            className="flex flex-col items-center text-[#026738] hover:text-[#026738]/80 transition-all duration-200 hover:scale-110 p-2 rounded-lg"
            aria-label="Bookmarks"
          >
            <BookmarkSolidIcon className="h-7 w-7 text-[#026738]" />
          </button>
          <button
            onClick={handleProfileClick}
            className="flex flex-col items-center text-[#026738] hover:text-[#026738]/80 transition-all duration-200 hover:scale-110 p-2 rounded-lg"
            aria-label="User Profile"
          >
            <UserCircleIcon className="h-7 w-7 text-[#026738]" />
          </button>
        </div>
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
    </div>
  );
};

export default RestroomDetails;