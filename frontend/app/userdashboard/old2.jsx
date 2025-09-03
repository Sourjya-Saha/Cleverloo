"use client";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import {
  ArrowLeftIcon,
  MapPinIcon,
  StarIcon,
  GlobeAltIcon,
  LockClosedIcon,
  CurrencyDollarIcon,
  ChevronRightIcon,
  MapIcon,
} from "@heroicons/react/24/outline";
import { BellIcon, BookmarkIcon, UserCircleIcon } from "@heroicons/react/24/solid";
import {
  FaToilet,
  FaWheelchair,
  FaUsers,
  FaVideo,
  FaBus,
  FaTrain,
  FaSubway,
  FaLock,
  FaGlobeAmericas,
  FaDollarSign,
} from "react-icons/fa";
import { toast } from "react-toastify";

const apiUrl = "http://localhost:5000";



const RestroomDetails = ({
  restroomId,
  onClose,
  session,
  UserProfile,
  isProfileOpen,
  handleBackClick,
  updateSession,
}) => {
  const [restroomDetails, setRestroomDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reviewImageIndex, setReviewImageIndex] = useState({});
  const [showAllRooms, setShowAllRooms] = useState(false);

  const intervalRef = useRef();

  useEffect(() => {
    fetchRestroomDetails();
    setShowAllReviews(false);
    setShowAllRooms(false);

    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchRestroomDetails, 10000);
    return () => clearInterval(intervalRef.current);
  }, [restroomId]);

  useEffect(() => {
    if (restroomDetails?.pictures?.length > 1) {
      const slideInterval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % restroomDetails.pictures.length);
      }, 3000);
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

  // Enhanced icons for public/paid/private with better icons and same style
  const getRestroomTypeInfo = (type) => {
    switch (type) {
      case "public":
        return {
          icon: FaGlobeAmericas,
          label: "PUBLIC",
          color: "text-green-800 bg-green-100",
        };
      case "private":
        return {
          icon: FaLock,
          label: "PRIVATE",
          color: "text-red-800 bg-red-100",
        };
      case "paid":
        return {
          icon: FaDollarSign,
          label: "PAID",
          color: "text-blue-800 bg-blue-100",
        };
      default:
        return {
          icon: FaGlobeAmericas,
          label: "PUBLIC",
          color: "text-green-800 bg-green-100",
        };
    }
  };

  const getQueueStatusBadge = (status) => {
    let icon = FaToilet;
    let color = "bg-green-100 text-green-800";
    let label = status;
    if (status.toLowerCase() === "vacant") {
      icon = FaToilet;
      color = "bg-green-100 text-green-800";
    } else if (status.toLowerCase() === "in use") {
      icon = FaToilet;
      color = "bg-red-100 text-red-800";
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color} space-x-1`}>
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
    const vacantCount = restroomDetails.rooms.filter((r) => r.queue_status === "Vacant").length;
    return vacantCount >= 2 ? "VACANT" : "IN USE";
  };

  const typeInfo = getRestroomTypeInfo(restroomDetails?.type);
  const ratingDistribution = getRatingDistribution(restroomDetails?.reviews || []);
  const totalReviews = restroomDetails?.reviews?.length || 0;
  const displayReviews = showAllReviews ? restroomDetails?.reviews : restroomDetails?.reviews?.slice(0, 3);
  const totalRooms = restroomDetails?.rooms?.length || 0;
  const displayRooms = showAllRooms ? restroomDetails?.rooms : restroomDetails?.rooms?.slice(0, 3);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <FaToilet className="h-16 w-16 text-[#026738] mx-auto mb-4 animate-pulse" />
          <p className="text-[#026738] font-semibold uppercase tracking-wider">LOADING DETAILS...</p>
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
    return <UserProfile session={session} handleBackClick={handleBackClick} updateSession={updateSession} />;
  }

  // Blurry overlays
  const BottomBlurryOverlay = () => (
    <div
      className="absolute bottom-0 left-0 w-full h-14 pointer-events-none z-30"
      style={{
        background:
          "linear-gradient(0deg, rgba(255,255,255,0.85) 40%, rgba(255,255,255,0) 100%)",
        backdropFilter: "blur(14px)",
      }}
    />
  );

  const TopOutsideBlur = () => (
    <div
      className="fixed top-0 left-0 right-0 h-8 pointer-events-none z-40"
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(255,255,255,0.45), rgba(255,255,255,0))",
        backdropFilter: "blur(8px)",
        boxShadow: "0 4px 8px rgba(255,255,255,0.15)",
      }}
    />
  );

  // Transport Icons
  const MetroIcon = FaSubway;
  const TrainIconComp = FaTrain;
  const BusIconComp = FaBus;

  return (
    <>
      <TopOutsideBlur />
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        {/* Header image with blurry bottom */}
        <div className="relative">
          <div className="relative h-64 bg-gray-200 overflow-hidden">
            {restroomDetails.pictures && restroomDetails.pictures.length > 0 ? (
              <>
                <div className="relative w-full h-full">
                  <Image
                    src={restroomDetails.pictures[currentImageIndex]}
                    alt={restroomDetails.name}
                    fill
                    className="object-cover"
                  />
                  <BottomBlurryOverlay />
                </div>
                {restroomDetails.pictures.length > 1 && (
                  <div className="absolute bottom-7 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
                    {restroomDetails.pictures.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentImageIndex ? "bg-white" : "bg-white/50"
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
            <button
              onClick={onClose}
              className="absolute top-4 left-4 bg-white/90 p-2 rounded-full shadow-lg hover:bg-white transition-colors z-10"
              aria-label="Close restroom details"
            >
              <ArrowLeftIcon className="h-5 w-5 text-[#026738]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-36 px-4">
          {/* Title + Icon + Type + Status */}
          <div className="flex items-center justify-between mt-4 mb-3">
            <div className="flex items-center space-x-2">
              <FaToilet className="h-6 w-6 text-[#026738]" />
              <h1 className="text-xl font-bold text-[#026738] uppercase tracking-wider">{restroomDetails.name}</h1>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`inline-flex items-center px-2 rounded-full text-xs font-semibold ${typeInfo.color}`}
              >
                <typeInfo.icon className="h-4 w-4 mr-1" />
                <span className="tracking-wider">{typeInfo.label}</span>
              </span>
              <span className="ml-3">{getQueueStatusBadge(calculateStatus())}</span>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center mb-4">
            <div className="flex items-center mr-2">{renderStars(restroomDetails.rating)}</div>
            <span className="text-sm text-gray-600 uppercase tracking-wider">
              ({totalReviews} review{totalReviews !== 1 ? "s" : ""})
            </span>
          </div>

          {/* Address */}
          {restroomDetails.address && (
            <div className="flex items-start space-x-2 mb-4">
              <MapPinIcon className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600 uppercase tracking-wider">{restroomDetails.address}</p>
            </div>
          )}

          {/* Nearest Transport */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <h3 className="font-semibold text-[#026738] mb-3 uppercase tracking-wider flex items-center">
              <FaBus className="h-4 w-4 mr-2" />
              Nearby Transport
            </h3>
            {!restroomDetails.description?.nearest_transport_train &&
            !restroomDetails.description?.nearest_transport_bus &&
            !restroomDetails.description?.nearest_transport_metro ? (
              <p className="text-sm text-gray-500 uppercase tracking-wide">No nearby transport info available.</p>
            ) : (
              <ul className="space-y-1 text-sm text-gray-700 uppercase tracking-wide">
                {restroomDetails.description?.nearest_transport_train && (
                  <li className="flex items-center space-x-2">
                    <TrainIconComp className="w-5 h-5 text-[#026738]" />
                    <span>{restroomDetails.description.nearest_transport_train}</span>
                  </li>
                )}
                {restroomDetails.description?.nearest_transport_bus && (
                  <li className="flex items-center space-x-2">
                    <BusIconComp className="w-5 h-5 text-[#026738]" />
                    <span>{restroomDetails.description.nearest_transport_bus}</span>
                  </li>
                )}
                {restroomDetails.description?.nearest_transport_metro && (
                  <li className="flex items-center space-x-2">
                    <MetroIcon className="w-5 h-5 text-[#026738]" />
                    <span>{restroomDetails.description.nearest_transport_metro}</span>
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Features */}
          {restroomDetails.description?.features?.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-[#026738] mb-3 uppercase tracking-wider">Features</h3>
              <div className="flex flex-wrap gap-4">
                {restroomDetails.description.features.map((feature, idx) => {
                  const Icon = getFeatureIcon(feature);
                  return (
                    <div key={idx} className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-[#026738] flex items-center justify-center">
                        <Icon className="h-3 w-3 text-white" />
                      </span>
                      <span className="text-[#026738] text-sm font-medium uppercase tracking-wider">
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
              <FaToilet className="h-5 w-5 mr-2" />
              Washroom Rooms
            </h3>
            <div className="space-y-5">
              {displayRooms.map((room) => (
                <div
                  key={room.room_id}
                  className="p-4 bg-white rounded-lg shadow-sm flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold text-[#026738] uppercase tracking-wider mb-1">{room.room_name}</p>
                    <p className="text-xs text-gray-700 uppercase tracking-wide mb-1">
                      Queue Status: {getQueueStatusBadge(room.queue_status)}
                    </p>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Last Cleaned: {new Date(room.last_cleaned).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {totalRooms > 3 && (
              <div className="text-center mt-4">
                {!showAllRooms ? (
                  <button
                    onClick={() => setShowAllRooms(true)}
                    className="flex items-center justify-center space-x-2 text-[#026738] font-semibold text-sm uppercase tracking-wider hover:underline mx-auto"
                    aria-label="View more rooms"
                  >
                    <span>+ VIEW MORE ROOMS</span>
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAllRooms(false)}
                    className="text-[#026738] font-semibold text-sm uppercase tracking-wider hover:underline"
                    aria-label="Show less rooms"
                  >
                    SHOW LESS
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Get Directions */}
          <div className="mb-6">
            <button
              onClick={handleGetDirections}
              className="w-full rounded-xl h-16 flex items-center justify-center group relative overflow-hidden bg-blue-600 hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 transition-colors"
              style={{
                backgroundImage: "url('/map.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              aria-label="Get directions to restroom location"
            >
              <div className="absolute inset-0 bg-black bg-opacity-30 group-hover:bg-opacity-40 transition duration-300"></div>
              <div className="relative z-10 flex items-center justify-center space-x-3 text-white uppercase tracking-wide font-bold">
                <MapIcon className="h-5 w-5" />
                <div>
                  GET DIRECTIONS
                  <div className="text-sm font-normal uppercase tracking-wider text-white/80">
                    NAVIGATE WITH GOOGLE MAPS
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Reviews */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-[#026738] mb-3 uppercase tracking-wider">
              REVIEWS ({totalReviews})
            </h2>

            {totalReviews > 0 && (
              <div className="mb-4 space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center space-x-2">
                    <span className="text-sm font-medium w-2">{rating}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#026738] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(ratingDistribution[rating] / totalReviews) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-6 text-right">{ratingDistribution[rating]}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4">
              {displayReviews?.length > 0 ? (
                displayReviews.map((review, idx) => {
                  const hasReviewImages = review.pictures && review.pictures.length > 0;
                  return (
                    <div key={review.review_id || idx} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-[#026738] rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-semibold uppercase">
                            {review.user_name?.charAt(0) || "U"}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-semibold text-[#026738] text-sm uppercase tracking-wider">
                              {review.user_name || "ANONYMOUS USER"}
                            </span>
                          </div>
                          <div className="flex items-center mb-2">{renderStars(review.rating)}</div>
                          {review.comment && (
                            <p className="text-sm text-gray-600 uppercase tracking-wider mb-2">{review.comment}</p>
                          )}

                          {hasReviewImages ? (
                            <div className="mt-2">
                              <div className="relative w-full h-40 rounded-lg overflow-hidden">
                                <Image
                                  src={review.pictures[reviewImageIndex[review.review_id] || 0]}
                                  alt="Review image"
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              {review.pictures.length > 1 && (
                                <div className="flex space-x-1 mt-2 overflow-x-auto">
                                  {review.pictures.map((image, imgIndex) => (
                                    <button
                                      key={imgIndex}
                                      onClick={() => handleReviewImageChange(review.review_id, imgIndex)}
                                      className={`relative w-12 h-8 rounded border-2 flex-shrink-0 ${
                                        imgIndex === (reviewImageIndex[review.review_id] || 0)
                                          ? "border-[#026738]"
                                          : "border-transparent"
                                      }`}
                                      aria-label={`Select review image ${imgIndex + 1}`}
                                    >
                                      <Image
                                        src={image}
                                        alt={`Review image ${imgIndex + 1}`}
                                        fill
                                        className="object-cover"
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
                <div className="text-center py-8">
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
                    className="flex items-center justify-center space-x-2 text-[#026738] font-semibold text-sm uppercase tracking-wider hover:underline mx-auto"
                    aria-label="View more reviews"
                  >
                    <span>+ VIEW MORE REVIEWS</span>
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAllReviews(false)}
                    className="text-[#026738] font-semibold text-sm uppercase tracking-wider hover:underline"
                    aria-label="Show less reviews"
                  >
                    SHOW LESS
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div
            className="bg-gradient-to-br from-[#BDFa70] to-[#87BC43] p-4 flex items-center justify-around py-6 relative shadow-lg"
          >
            <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-[rgba(2,103,56,0.4)] to-transparent pointer-events-none" />
            <button
              className="flex flex-col items-center text-[#026738] hover:text-[#026738]/80 transition-all duration-200 hover:scale-110"
              aria-label="Notifications"
            >
              <BellIcon className="h-7 w-7 text-[#026738]" />
            </button>
            <button
              className="flex flex-col items-center text-[#026738] hover:text-[#026738]/80 transition-all duration-200 hover:scale-110"
              aria-label="Bookmarks"
            >
              <BookmarkIcon className="h-7 w-7 text-[#026738]" />
            </button>
            <button
              onClick={() => updateSession({ isProfileOpen: true })}
              className="flex flex-col items-center text-[#026738] hover:text-[#026738]/80 transition-all duration-200 hover:scale-110"
              aria-label="User Profile"
            >
              <UserCircleIcon className="h-7 w-7 text-[#026738]" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default RestroomDetails;
