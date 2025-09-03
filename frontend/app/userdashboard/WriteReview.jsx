"use client";
import { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeftIcon, 
  StarIcon, 
  PhotoIcon 
} from '@heroicons/react/24/outline';
import { 
  StarIcon as StarSolidIcon 
} from '@heroicons/react/24/solid';
import { toast, ToastContainer } from 'react-toastify';
import Image from 'next/image';
const apiUrl = "https://cleverloo-backend-1.vercel.app";
const WriteReview = ({ 
  restroomId, 
  restroomName, 
  onClose, 
  onSubmit, 
  session,
  userReviewCount = 0 
}) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userPreviousReviews, setUserPreviousReviews] = useState([]);
  const fileInputRef = useRef(null);

  // Fetch user's previous reviews
  const fetchUserPreviousReviews = async () => {
    if (!session?.accessToken || userReviewCount === 0) return;
    
    try {
      const response = await fetch(`${apiUrl}/restrooms/${restroomId}/user-reviews`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserPreviousReviews(data.reviews || []);
      }
    } catch (error) {
      console.error("ERROR FETCHING USER PREVIOUS REVIEWS:", error);
    }
  };

  // Call this function when component mounts
  useEffect(() => {
    if (userReviewCount > 0) {
      fetchUserPreviousReviews();
    }
  }, [userReviewCount, restroomId, session?.accessToken]);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size and type
    if (file.size > 2 * 1024 * 1024) {
      toast.error('IMAGE SIZE MUST BE UNDER 2MB.');
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('PLEASE UPLOAD A VALID IMAGE FILE (JPG, PNG, GIF, WEBP).');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'cleverloo');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/dnrej03py/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || 'Cloudinary upload failed with an unknown error.');
      }

      const data = await response.json();
      
      if (!data.secure_url) {
        throw new Error('Cloudinary upload failed: secure_url not found');
      }

      setUploadedImage(data.secure_url);
      toast.success('IMAGE UPLOADED SUCCESSFULLY!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(`FAILED TO UPLOAD IMAGE. ${error.message || ''}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('PLEASE SELECT A RATING.');
      return;
    }

    setIsSubmitting(true);

    try {
      const reviewData = {
        rating,
        comment: comment.trim() || null,
        pictures: uploadedImage ? [uploadedImage] : []
      };

      const response = await fetch(`${apiUrl}/restrooms/${restroomId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(reviewData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit review');
      }

      toast.success('REVIEW SUBMITTED SUCCESSFULLY!');
      onSubmit(data.review);
      onClose();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(error.message || 'FAILED TO SUBMIT REVIEW. PLEASE TRY AGAIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (starRating = null, isInteractive = true, size = 'large') => {
    const stars = [];
    const currentRating = starRating !== null ? starRating : (hoverRating || rating);
    
    // Define star sizes
    const sizeClasses = {
      large: 'h-8 w-8',  // Changed from h-12 w-12 to h-8 w-8
      small: 'h-4 w-4'
    };
    
    for (let i = 1; i <= 5; i++) {
      const isActive = i <= currentRating;
      stars.push(
        <button
          key={i}
          type="button"
          onMouseEnter={isInteractive ? () => setHoverRating(i) : undefined}
          onMouseLeave={isInteractive ? () => setHoverRating(0) : undefined}
          onClick={isInteractive ? () => setRating(i) : undefined}
          className={`focus:outline-none transition-all duration-200 ${
            isInteractive 
              ? 'hover:scale-110 cursor-pointer' 
              : 'cursor-default'
          }`}
          aria-label={`Rate ${i} stars`}
          disabled={!isInteractive}
        >
          {isActive ? (
            <StarSolidIcon className={`${sizeClasses[size]} text-yellow-400`} />
          ) : (
            <StarIcon className={`${sizeClasses[size]} text-gray-300`} />
          )}
        </button>
      );
    }
    return stars;
  };

  // Get user initials or fallback
  const getUserDisplayName = () => {
    if (session?.user?.name) {
      const names = session.user.name.split(' ');
      if (names.length > 1) {
        return names[0][0] + names[names.length - 1][0];
      }
      return names[0].substring(0, 1);
    }
    if (session?.user?.email) {
      return session.user.email.substring(0, 1);
    }
    return 'ME';
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className=" bg-gradient-to-br from-[#BDFa70] to-[#87BC43] px-4 py-6 flex items-center relative shadow-lg">
        <button
          onClick={onClose}
          className="absolute left-4 text-[#026738] hover:text-gray-300 transition-colors duration-200"
          aria-label="Close review form"
        >
          <ArrowLeftIcon className="h-6 w-6" />
        </button>
        <h1 className="text-[#026738] text-xl font-semibold uppercase  tracking-wider text-center flex-1">
           Give Review
        </h1>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 bg-gray-50 overflow-y-auto pb-24">
        <div className="px-4 py-8">
          <div className="max-w-md mx-auto space-y-8">
            
            {/* Rating Section */}
            <div>
              <h2 className="text-2xl font-bold text-[#026738] mb-8 text-center">
                {userReviewCount > 0 ? 
                  `Share your latest experience?` : 
                  `How was your experience?`
                }
              </h2>
              <div className="flex justify-center space-x-1">
                {renderStars(null, true, 'large')}
              </div>
            </div>

            {/* Comment Section */}
            <div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write Something"
                className="w-full p-4 border-2 border-gray-300 rounded-lg bg-white text-gray-700 placeholder-gray-400 focus:border-[#026738] focus:outline-none resize-none h-24 uppercase tracking-wider"
                maxLength={500}
              />
            </div>

            {/* Photo Upload Section */}
            <div>
              {!uploadedImage ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#026738] transition-colors duration-200 bg-white"
                >
                  <PhotoIcon className="h-16 w-16 text-gray-400 mb-2" />
                  <p className="text-gray-500 uppercase tracking-wider font-medium">Add Photo</p>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Max 1 photo, 2MB limit</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="w-full h-40 rounded-lg overflow-hidden bg-gray-200">
                    <Image
                      src={uploadedImage}
                      alt="Review photo"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors duration-200"
                    aria-label="Remove photo"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="text-center">
                <div className="inline-flex items-center px-4 py-2 bg-[#87BC43] text-[#026738] rounded-full">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#026738] mr-2 text-xs"></div>
                  UPLOADING IMAGE...
                </div>
              </div>
            )}

            {/* Previous Reviews Section */}
            {userReviewCount > 0 && userPreviousReviews.length > 0 && (
              <div className="mt-12">
                <h3 className="text-lg font-bold text-[#026738] mb-4 uppercase tracking-wider">
                  Your Previous Reviews 
                </h3>
                <div className="space-y-4">
                  {userPreviousReviews.map((review, idx) => (
                    <div key={review.review_id || idx} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#026738] to-[#87BC43] rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                          <span className="text-white text-sm font-bold">
                            {getUserDisplayName().toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center mb-2 space-x-0.5">
                            {renderStars(review.rating, false, 'small')}
                          </div>
                          {review.comment && (
                            <p className="text-xs text-gray-600 mb-3 leading-relaxed uppercase tracking-wider">
                              {review.comment}
                            </p>
                          )}
                          {review.pictures && review.pictures.length > 0 && (
                            <div className="mb-3">
                              <div className="relative w-full h-32 rounded-lg overflow-hidden shadow-sm">
                                <Image
                                  src={review.pictures[0]}
                                  alt="Your review photo"
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 uppercase tracking-wide">
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-50 px-4 py-6 flex space-x-4 border-t border-gray-200 shadow-lg">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="flex-1 py-3 px-6 border-2 border-[#026738]-300 text-[#026738] rounded-full font-bold uppercase tracking-wider hover:bg-[#026738]-100 transition-colors duration-200 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={rating === 0 || isSubmitting || isUploading}
          className="flex-1 py-3 px-6 bg-[#BDFa70] text-[#026738] rounded-full font-bold uppercase tracking-wider hover:bg-[#2E3440] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              SUBMITTING...
            </>
          ) : (
            'Submit'
          )}
        </button>
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

export default WriteReview;
