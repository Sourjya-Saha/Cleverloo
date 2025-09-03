"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowLeftIcon,
  XMarkIcon,
  MapPinIcon,
  StarIcon,
  TrashIcon,
  EyeIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolidIcon } from "@heroicons/react/24/solid";
import { FaToilet, FaToiletPaper } from "react-icons/fa";
import { toast } from "react-toastify";
import RestroomDetails from "./RestroomDetails";
const apiUrl = "http://localhost:5000";
const BookmarkedWashrooms = ({
  onClose,
  session,
  isProfileOpen,
  UserProfile,
  handleBackClick,
  updateSession,
}) => {
  const [bookmarkedWashrooms, setBookmarkedWashrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingBookmark, setRemovingBookmark] = useState(null);
  const [selectedRestroomId, setSelectedRestroomId] = useState(null);
  const [showRestroomDetails, setShowRestroomDetails] = useState(false);

  useEffect(() => {
    fetchBookmarkedWashrooms();
  }, []);

  const fetchBookmarkedWashrooms = async () => {
    if (!session?.accessToken) {
      toast.error("PLEASE SIGN IN TO VIEW BOOKMARKS.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/user/bookmarks/details`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setBookmarkedWashrooms(data.bookmarks || []);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "FAILED TO FETCH BOOKMARKS.");
        setBookmarkedWashrooms([]);
      }
    } catch (error) {
      console.error("ERROR FETCHING BOOKMARKS:", error);
      toast.error("FAILED TO FETCH BOOKMARKS.");
      setBookmarkedWashrooms([]);
    } finally {
      setLoading(false);
    }
  };

  const removeBookmark = async (restroomId) => {
    if (!session?.accessToken) {
      toast.error("PLEASE SIGN IN TO REMOVE BOOKMARKS.");
      return;
    }
    setRemovingBookmark(restroomId);
    try {
      const response = await fetch(`${apiUrl}/user/bookmarks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ restroomId: parseInt(restroomId) }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.action === "removed") {
          setBookmarkedWashrooms((prev) =>
            prev.filter((w) => w.restroom_id !== restroomId)
          );
          toast.success("REMOVED FROM BOOKMARKS");
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "FAILED TO REMOVE BOOKMARK");
      }
    } catch (error) {
      console.error("ERROR REMOVING BOOKMARK:", error);
      toast.error("FAILED TO REMOVE BOOKMARK");
    } finally {
      setRemovingBookmark(null);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const numRating = Number(rating) || 0;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <StarIcon
          key={i}
          className={`h-4 w-4 ${
            i <= numRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
          }`}
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
          icon: () => <LockClosedIcon className="h-4 w-4" />,
          label: "PRIVATE",
          color: "text-red-800 bg-red-100",
        };
      case "paid":
        return {
          icon: () => (
            <span className="text-xs mr-1 font-bold" aria-label="Paid restroom">
              ₹
            </span>
          ),
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

  const handleViewDetails = (restroomId) => {
    setSelectedRestroomId(restroomId);
    setShowRestroomDetails(true);
  };

  const handleCloseDetails = () => {
    setShowRestroomDetails(false);
    setSelectedRestroomId(null);
  };

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
            <p className="text-[#026738] font-semibold uppercase tracking-wider text-sm ">LOADING BOOKMARKS...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isProfileOpen) {
    return <UserProfile session={session} handleBackClick={handleBackClick} updateSession={updateSession} />;
  }

  if (showRestroomDetails && selectedRestroomId) {
    return (
      <RestroomDetails
        restroomId={selectedRestroomId}
        onClose={handleCloseDetails}
        session={session}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#BDFa70] to-[#87BC43] p-5 shadow-lg flex items-center justify-between">
        <Image
          src="/Clever Loo LOGO - 3.png"
          alt="CLEVER LOO LOGO"
          width={120}
          height={60}
          className="bg-transparent rounded-lg"
        />
        <button
          onClick={onClose}
          aria-label="Close bookmarks"
          className="bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-all duration-200"
        >
          <XMarkIcon className="h-5 w-5 text-[#026738] " />
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-[#026738]/70 scrollbar-track-gray-100">
        {bookmarkedWashrooms.length > 0 && (
          <h1 className="text-[#026738] text-xl font-extrabold uppercase tracking-wide flex justify-center flex-1 select-none">
            SAVED WASHROOMS
          </h1>
        )}

        {bookmarkedWashrooms.length > 0 ? (
          bookmarkedWashrooms.map((washroom) => {
            const typeInfo = getRestroomTypeInfo(washroom.type);
            return (
              <RestroomCard key={washroom.restroom_id} washroom={washroom} typeInfo={typeInfo} removeBookmark={removeBookmark} handleViewDetails={handleViewDetails} removingBookmark={removingBookmark} renderStars={renderStars} />
            );
          })
        ) : (
          <div className="fixed inset-0 flex items-center justify-center p-12 bg-white z-50 text-center">
            <div className="flex flex-col items-center space-y-4 text-gray-400 uppercase tracking-wide select-none w-full">
              <FaToilet className="h-28 w-28 mx-auto text-gray-300" />
              <h2 className="text-xl font-bold mb-1 select-none">NO SAVED WASHROOMS</h2>
              <p className="text-sm select-none">START EXPLORING AND SAVE YOUR FAVORITE WASHROOMS</p>
              <button
                onClick={onClose}
                className="bg-[#026738] text-white px-8 py-3 rounded-full uppercase tracking-wide font-semibold hover:bg-[#05622b] transition-all duration-200"
                type="button"
              >
                EXPLORE WASHROOMS
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// New RestroomCard component to handle image sliding
const RestroomCard = ({ washroom, typeInfo, removeBookmark, handleViewDetails, removingBookmark, renderStars }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    // Check if there are multiple pictures to slide through
    if (washroom.pictures && washroom.pictures.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex(prevIndex => (prevIndex + 1) % washroom.pictures.length);
      }, 2000); // 3-second slide interval

      return () => clearInterval(interval);
    }
  }, [washroom.pictures]);

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200 hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col">
      {/* Image container with rounded top corners */}
      <div className="relative w-full h-44 flex-shrink-0 rounded-t-2xl overflow-hidden bg-gray-50">
        {washroom.pictures && washroom.pictures.length > 0 ? (
          <div className="relative w-full h-full">
            {washroom.pictures.map((pic, index) => (
              <Image
                key={index}
                src={pic}
                alt={`${washroom.name} image ${index + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className={`absolute inset-0 object-cover transition-opacity duration-1000 ease-in-out ${
                  index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-gray-100">
            <FaToiletPaper className="text-gray-400 h-10 w-10" />
          </div>
        )}
      </div>

      <div className="flex-1 p-5 flex flex-col justify-between ">
        <div>
          <h3 className="text-[#026738] font-bold uppercase tracking-wide text-lg mb-1 select-text">
            {washroom.name}
          </h3>
          <div className="inline-flex items-center space-x-2 mb-4">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${typeInfo.color} select-none`}
            >
              <typeInfo.icon className="h-4 w-4 mr-1" aria-hidden="true" />
              <span className="tracking-wide">{typeInfo.label}</span>
            </span>
          </div>

          <div className="flex items-center space-x-2 mb-2 select-none">
            <div className="flex items-center space-x-1">{renderStars(washroom.rating)}</div>
            <span className="text-xs text-gray-600 uppercase tracking-wide font-semibold">
              ({washroom.total_reviews || 0} reviews)
            </span>
          </div>

          {washroom.address && (
            <div className="flex items-start space-x-3">
              <MapPinIcon
                className="h-6 w-6 text-[#026738] bg-green-100 p-1 rounded-2xl mt-0.5 flex-shrink-0"
                aria-hidden="true"
              />
              <p className="text-sm text-gray-700 uppercase tracking-wide select-text">
                {washroom.address}
              </p>
            </div>
          )}
        </div>

        <div className="flex space-x-3 mt-6 ">
          <button
            onClick={() => handleViewDetails(washroom.restroom_id)}
            aria-label="View restroom details"
            className="bg-[#026738] hover:bg-[#05622b] text-white p-3 rounded-lg transition-all duration-250 hover:scale-105 shadow-md flex items-center justify-center flex-shrink-0 w-[50%]"
            type="button"
          >
            <EyeIcon className="h-5 w-5" />
            <span className="sr-only">View Details</span>
          </button>

          <button
            onClick={() => removeBookmark(washroom.restroom_id)}
            disabled={removingBookmark === washroom.restroom_id}
            aria-label="Remove bookmark"
            className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg transition-all duration-250 hover:scale-105 shadow-md flex items-center justify-center flex-shrink-0 disabled:opacity-50 w-[50%]"
            type="button"
          >
            {removingBookmark === washroom.restroom_id ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <TrashIcon className="h-5 w-5" />
            )}
            <span className="sr-only">Remove Bookmark</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookmarkedWashrooms;