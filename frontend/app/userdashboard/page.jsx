"use client"
import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    MapPinIcon,
    CurrencyDollarIcon,
    UserIcon,
    ChevronUpIcon,
    ArrowLeftIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    ArrowPathIcon as ArrowPathOutlineIcon,
    ArrowRightOnRectangleIcon,
    HomeIcon,
    LockClosedIcon,
    BuildingOfficeIcon,
    GlobeAltIcon
} from '@heroicons/react/24/outline';
import { BellIcon, BookmarkIcon, UserCircleIcon } from "@heroicons/react/24/solid";

import {
    StarIcon,
    ArrowPathIcon,
    PhoneIcon as PhoneIconSolid,
    ChatBubbleLeftRightIcon
} from '@heroicons/react/24/solid';
import { 
    CheckCircleIcon, 
    ExclamationTriangleIcon, 
    WrenchScrewdriverIcon,
    ClockIcon 
} from '@heroicons/react/24/solid';
import { 
    CameraIcon
} from '@heroicons/react/24/outline';
import { 
    GiPushBroom 
} from 'react-icons/gi';
import { BrushCleaning } from 'lucide-react';
import axios from 'axios';
import { FaWheelchair, FaMale, FaFemale, FaUsers, FaToilet, FaToiletPaper } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import UserProfile from './UserProfile';
import RestroomDetails from './RestroomDetails';
import BookmarkedWashrooms from './BookmarkedWashrooms';

  // Refresh API every 10 seconds


const apiUrl = "http://localhost:5000";

// Utility functions for data persistence using state only
const saveUserData = (key, data) => {
    // Using state only - no localStorage
    console.log('Saving to state:', key, data);
};

const loadUserData = (key) => {
    // Using state only - no localStorage  
    return null;
};

// MapUpdater component for Leaflet
const MapUpdater = dynamic(() => {
    return import('react-leaflet').then(mod => {
        const useMap = mod.useMap;
        return ({ position }) => {
            const map = useMap();
            useEffect(() => {
                if (position && map) {
                    try {
                        map.flyTo([position.latitude, position.longitude], 16, {
                            animate: true,
                            duration: 1.5
                        });
                    } catch (error) {
                        console.error('ERROR FLYING TO POSITION:', error);
                        try {
                            map.setView([position.latitude, position.longitude], 16);
                        } catch (fallbackError) {
                            console.error('ERROR SETTING VIEW:', fallbackError);
                        }
                    }
                }
            }, [position, map]);
            return null;
        };
    });
}, { ssr: false });

// Dynamic imports for Leaflet components
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });


const getMostCommonStatus = (rooms) => {
    if (!rooms || rooms.length === 0) return null;
    
    // Check if any room is vacant - if so, return 'Vacant'
    const hasVacantRoom = rooms.some(room => room.queue_status === 'Vacant');
    if (hasVacantRoom) {
        return 'Vacant';
    }
    
    // If no vacant rooms, find the most common status among remaining rooms
    const statusCounts = {};
    rooms.forEach(room => {
        statusCounts[room.queue_status] = (statusCounts[room.queue_status] || 0) + 1;
    });
    
    return Object.keys(statusCounts).reduce((a, b) => 
        statusCounts[a] > statusCounts[b] ? a : b
    );
};

const getStatusInfo = (status) => {
    switch (status) {
        case 'Vacant':
            return {
                icon: CheckCircleIcon,
                label: 'VACANT',
                color: 'text-green-600 bg-green-100',
                dotColor: 'bg-green-500'
            };
        case 'In Use':
            return {
                icon: ClockIcon,
                label: 'IN USE',
                color: 'text-orange-600 bg-orange-100',
                dotColor: 'bg-orange-500'
            };
        case 'Cleaning':
            return {
                icon: BrushCleaning,
                label: 'CLEANING',
                color: 'text-blue-600 bg-blue-100',
                dotColor: 'bg-blue-500'
            };
        case 'Under Maintenance':
            return {
                icon: WrenchScrewdriverIcon,
                label: 'MAINTENANCE',
                color: 'text-red-600 bg-red-100',
                dotColor: 'bg-red-500'
            };
        default:
            return {
                icon: ExclamationTriangleIcon,
                label: 'UNKNOWN',
                color: 'text-gray-600 bg-gray-100',
                dotColor: 'bg-gray-500'
            };
    }
};

// Example usage and test cases:

const getFeatureInfo = (feature) => {
    switch (feature) {
        case 'cctv':
            return {
                icon: CameraIcon,
                label: 'CCTV',
                color: 'text-purple-700 bg-purple-100'
            };
        case 'handicap_accessible':
            return {
                icon: FaWheelchair,
                label: 'ACCESSIBLE',
                color: 'text-blue-700 bg-blue-100'
            };
        case 'baby_changing_station':
            return {
                icon: () => <span className="text-sm">👶</span>,
                label: 'BABY STATION',
                color: 'text-pink-700 bg-pink-100'
            };
        default:
            return {
                icon: CheckCircleIcon,
                label: feature.toUpperCase(),
                color: 'text-gray-700 bg-gray-100'
            };
    }
};

const getMarkerColor = (status) => {
    switch (status) {
        case 'Vacant':
            return 'green';
        case 'In Use':
            return 'gold';
        case 'Cleaning':
            return 'orange';
        case 'Under Maintenance':
            return 'red';
        default:
            return 'red'; // Unknown status
    }
};



const RestroomFinder = () => {
    const [userPosition, setUserPosition] = useState(null);
    const [restrooms, setRestrooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [icons, setIcons] = useState(null);
    const [isClient, setIsClient] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [genderFilter, setGenderFilter] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [locationSuggestions, setLocationSuggestions] = useState([]);
    const [isListOpen, setIsListOpen] = useState(true);
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const [selectedRestroomId, setSelectedRestroomId] = useState(null);
    const [showRestroomDetails, setShowRestroomDetails] = useState(false);
    const { data: session, status, update } = useSession();
    const router = useRouter();
    const mapRef = useRef(null);
    const searchTimeoutRef = useRef(null);
 const [showBookmarks, setShowBookmarks] = useState(false);
    useEffect(() => {
        if (status === 'loading') return;
        if (!session || session.user?.role !== 'user') {
            router.push('/');
        }
    }, [session, status, router]);

    useEffect(() => {
        setIsClient(true);
    }, []);

  const [signingOut, setSigningOut] = useState(false);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await handleSignOut();
    } finally {
      setSigningOut(false);
    }
  };

    const handleRestroomClick = (restroomId) => {
        setSelectedRestroomId(restroomId);
        setShowRestroomDetails(true);
        setIsListOpen(false);
    };

    const handleCloseRestroomDetails = () => {
        setShowRestroomDetails(false);
        setSelectedRestroomId(null);
        setIsListOpen(true);
    };

    // Enhanced geolocation with retry logic
    const getCurrentLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by this browser.'));
                return;
            }

            const options = {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 300000
            };

            let attemptCount = 0;
            const maxAttempts = 3;

            const tryGetLocation = () => {
                attemptCount++;
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve(position);
                    },
                    (error) => {
                        console.error(`Geolocation attempt ${attemptCount} failed:`, error);
                        
                        if (attemptCount < maxAttempts) {
                            const retryOptions = {
                                enableHighAccuracy: attemptCount === 1 ? false : true,
                                timeout: attemptCount === 1 ? 30000 : 15000,
                                maximumAge: attemptCount === 1 ? 600000 : 300000
                            };
                            
                            setTimeout(() => {
                                navigator.geolocation.getCurrentPosition(
                                    resolve,
                                    () => {
                                        if (attemptCount < maxAttempts) {
                                            tryGetLocation();
                                        } else {
                                            reject(error);
                                        }
                                    },
                                    retryOptions
                                );
                            }, 2000);
                        } else {
                            reject(error);
                        }
                    },
                    options
                );
            };

            tryGetLocation();
        });
    };

    useEffect(() => {
        if (!isClient || !session?.accessToken) return;
        
      const setupMap = async () => {
        const L = (await import('leaflet')).default;
        const userIcon = L.divIcon({
            className: 'CUSTOM-USER-MARKER',
            html: '<div style="background-color: #007bff; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.5);"></div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11],
        });

        // Create colored restroom icons
        const createColoredIcon = (color) => {
            return new L.Icon({
                iconUrl: `https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });
        };

        const icons = {
            user: userIcon,
            restroom: {
                green: createColoredIcon('green'),
                gold: createColoredIcon('yellow'), // Using yellow for gold
                orange: createColoredIcon('orange'),
                red: createColoredIcon('red')
            }
        };

        setIcons(icons);
    };
    setupMap();

        getCurrentLocation()
            .then((position) => {
                const { latitude, longitude } = position.coords;
                setUserPosition({ latitude, longitude });
                fetchRestrooms(latitude, longitude, searchQuery, genderFilter);
            })
            .catch((error) => {
                console.error("GEOLOCATION ERROR:", error);
                let errorMessage = "GEOLOCATION IS NOT ENABLED. PLEASE ALLOW LOCATION ACCESS TO USE THIS FEATURE.";
                
                if (error.code === 1) {
                    errorMessage = "LOCATION ACCESS DENIED. PLEASE ENABLE LOCATION PERMISSIONS IN YOUR BROWSER.";
                } else if (error.code === 2) {
                    errorMessage = "LOCATION UNAVAILABLE. PLEASE CHECK YOUR GPS OR NETWORK CONNECTION.";
                } else if (error.code === 3) {
                    errorMessage = "LOCATION REQUEST TIMED OUT. PLEASE CHECK YOUR CONNECTION AND TRY AGAIN.";
                }
                
                toast.error(errorMessage);
                setLoading(false);
            });



            
    }, [isClient, session]);

    const searchLocation = async (query) => {
        if (query.length < 3) {
            setLocationSuggestions([]);
            return;
        }

        try {
            setIsSearchingLocation(true);
            const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
                params: {
                    q: query,
                    format: 'json',
                    limit: 5,
                    countrycodes: 'in',
                    addressdetails: 1
                }
            });
            
            const suggestions = response.data.map(item => ({
                display_name: item.display_name,
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon),
                type: 'location'
            }));
            
            setLocationSuggestions(suggestions);
        } catch (error) {
            console.error('Error searching locations:', error);
            setLocationSuggestions([]);
        } finally {
            setIsSearchingLocation(false);
        }
    };

    const fetchRestrooms = async (lat, lon, query, gender) => {
        if (!session?.accessToken) {
            toast.error("PLEASE SIGN IN TO VIEW RESTROOMS.");
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const response = await axios.get(`${apiUrl}/restrooms/search`, {
                params: {
                    latitude: lat,
                    longitude: lon,
                    query,
                    gender
                },
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });
            console.log("Restroom Datas:" , response.data)
            setRestrooms(response.data);
            setLoading(false);
        } catch (error) {
            console.error('ERROR FETCHING RESTROOMS:', error);
            toast.error("FAILED TO FETCH RESTROOMS. PLEASE TRY AGAIN.");
            setLoading(false);
        }
    };

    const handleSearch = () => {
        if (userPosition) {
            fetchRestrooms(userPosition.latitude, userPosition.longitude, searchQuery, genderFilter);
        } else {
            toast.info("GETTING YOUR LOCATION. PLEASE WAIT.");
        }
    };

    const handleSuggestionClick = (suggestion) => {
        if (suggestion.type === 'location') {
            setSearchQuery(suggestion.display_name);
            const newPosition = { latitude: suggestion.lat, longitude: suggestion.lon };
            setUserPosition(newPosition);
            fetchRestrooms(suggestion.lat, suggestion.lon, '', genderFilter);
            setLocationSuggestions([]);
            setSuggestions([]);
        } else {
            setSearchQuery(suggestion.name);
            setUserPosition({ latitude: suggestion.latitude, longitude: suggestion.longitude });
            setSuggestions([]);
            setLocationSuggestions([]);
        }
    };

    const handleRefresh = async () => {
        setLoading(true);
        setSearchQuery('');
        setGenderFilter('');
        
        try {
            const position = await getCurrentLocation();
            const { latitude, longitude } = position.coords;
            setUserPosition({ latitude, longitude });
            fetchRestrooms(latitude, longitude, '', '');
            toast.success("LOCATION REFRESHED SUCCESSFULLY!");
        } catch (error) {
            console.error("GEOLOCATION ERROR:", error);
            let errorMessage = "FAILED TO GET CURRENT LOCATION. PLEASE TRY AGAIN.";
            
            if (error.code === 1) {
                errorMessage = "LOCATION ACCESS DENIED. PLEASE ENABLE LOCATION PERMISSIONS.";
            } else if (error.code === 2) {
                errorMessage = "LOCATION UNAVAILABLE. PLEASE CHECK YOUR GPS.";
            } else if (error.code === 3) {
                errorMessage = "LOCATION REQUEST TIMED OUT. PLEASE TRY AGAIN.";
            }
            
            toast.error(errorMessage);
            setLoading(false);
        }
    };

    const handleRecenter = () => {
        if (userPosition && mapRef.current) {
            try {
                mapRef.current.flyTo([userPosition.latitude, userPosition.longitude], 16, {
                    animate: true,
                    duration: 1.5
                });
                toast.success("MAP CENTERED TO YOUR LOCATION!");
            } catch (error) {
                console.error("Error centering map:", error);
                try {
                    mapRef.current.setView([userPosition.latitude, userPosition.longitude], 16);
                } catch (fallbackError) {
                    toast.error("FAILED TO CENTER MAP. PLEASE TRY AGAIN.");
                }
            }
        } else {
            toast.info("YOUR LOCATION IS NOT YET AVAILABLE.");
        }
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setGenderFilter('');
        setSuggestions([]);
        setLocationSuggestions([]);
        if (userPosition) {
            fetchRestrooms(userPosition.latitude, userPosition.longitude, '', '');
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut({ redirect: false });
            router.push('/');
        } catch (error) {
            console.error('ERROR SIGNING OUT:', error);
            toast.error("ERROR SIGNING OUT. PLEASE TRY AGAIN.");
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
                    className={`h-4 w-4 ${i <= numRating ? 'text-yellow-400' : 'text-gray-300'}`}
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


    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            if (searchQuery.length > 2) {
                const filteredSuggestions = restrooms.filter(restroom =>
                    restroom.name.toLowerCase().includes(searchQuery.toLowerCase())
                );
                setSuggestions(filteredSuggestions);
                searchLocation(searchQuery);
            } else {
                setSuggestions([]);
                setLocationSuggestions([]);
            }
        }, 300);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, restrooms]);

    const filteredRestrooms = restrooms.filter(restroom => {
        const matchesGender = genderFilter ? restroom.gender === genderFilter : true;
        const matchesSearch = searchQuery ? restroom.name.toLowerCase().includes(searchQuery.toLowerCase()) : true;
        return matchesGender && matchesSearch;
    });

    if (status === 'loading' || !isClient) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-[#BDFa70] to-[#87BC43] font-sans">
                <div className="absolute inset-0 overflow-hidden z-0">
                    <FaToilet className="absolute top-40 left-10 h-32 w-32 text-white opacity-25 rotate-12" />
                    <FaToiletPaper className="absolute bottom-40 right-16 h-28 w-28 text-white opacity-15 -rotate-12" />
                </div>
                <div className="absolute inset-0 overflow-hidden">
                    <div className="w-48 h-48 bg-[#ffffff]/10 rounded-full blur-2xl absolute top-1/4 left-1/4 animate-blob"></div>
                    <div className="w-64 h-64 bg-[#026738]/10 rounded-full blur-2xl absolute bottom-1/4 right-1/4 animate-blob animation-delay-2000"></div>
                </div>
                <div className="text-center relative z-10">
                    <Image
                        src="/Clever Loo LOGO - 3.png"
                        alt="CLEVER LOO LOGO"
                        width={250}
                        height={150}
                        className="mx-auto mb-4 animate-pulse"
                    />
                </div>
            </div>
        );
    }

    if (!icons) {
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
                        <p className="text-[#026738] font-semibold uppercase tracking-wider text-sm">LOADING MAP...</p>
                    </div>
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

    if (showRestroomDetails) {
        return (
            <RestroomDetails 
                restroomId={selectedRestroomId} 
                onClose={handleCloseRestroomDetails} 
                session={session} 
            />
        );
    }

    return (
        <div className="fixed inset-0 flex flex-col bg-white font-sans">
            {/* FIXED HEADER WITH GRADIENT */}
            <div className="fixed top-0 left-0 right-0 z-[1001] bg-gradient-to-br from-[#BDFa70] to-[#87BC43] p-4 flex items-center justify-between shadow-lg">
                <Image
                    src="/Clever Loo LOGO - 3.png"
                    alt="CLEVER LOO LOGO"
                    width={120}
                    height={60}
                    className="bg-transparent rounded-lg"
                />
                <button
      onClick={onSignOut}
      disabled={signingOut}
      className="bg-white w-12 h-12 rounded-full text-[#026738] shadow-md transition-all duration-200 hover:scale-110 flex items-center justify-center disabled:opacity-50"
    >
      {signingOut ? (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#026738]"></div>
      ) : (
        <ArrowRightOnRectangleIcon className="h-6 w-6" />
      )}
      <span className="sr-only">Sign Out</span>
    </button>
            </div>

            {/* FIXED SEARCH AND FILTER BAR */}
            <div className="fixed top-20 left-0 right-0 z-[1000] px-2 pt-2">
                {/* Search Bar */}
                <div className="p-1 rounded-3xl bg-[#026738] shadow-xl flex items-center space-x-2 mb-2">
                    <div className="relative flex-grow">
                        <MagnifyingGlassIcon className="h-4 w-4 absolute top-1/2 left-3 transform -translate-y-1/2 text-[#026738] z-10" />
                        <input
                            type="text"
                            placeholder="SEARCH FOR RESTROOMS OR LOCATIONS..."
                            className="w-full p-2 pl-9 rounded-3xl text-sm bg-gray-100 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#026738] border border-[#026738] transition-colors duration-200 uppercase tracking-wider"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                        />
                        {(suggestions.length > 0 || locationSuggestions.length > 0) && (
                            <ul className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-2 z-50 max-h-48 overflow-y-auto">
                                {locationSuggestions.length > 0 && (
                                    <>
                                        <li className="px-4 py-2 text-xs font-semibold text-white bg-[#026738] uppercase tracking-wider">
                                            LOCATIONS
                                        </li>
                                        {locationSuggestions.map((suggestion, index) => (
                                            <li
                                                key={`location-${index}`}
                                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm uppercase tracking-wider flex items-center text-[#026738]"
                                                onClick={() => handleSuggestionClick(suggestion)}
                                            >
                                                <MapPinIcon className="h-4 w-4 mr-2 text-[#026738]" />
                                                <span className="truncate">{suggestion.display_name}</span>
                                            </li>
                                        ))}
                                    </>
                                )}
                                {suggestions.length > 0 && (
                                    <>
                                        {locationSuggestions.length > 0 && (
                                            <li className="border-t border-gray-200"></li>
                                        )}
                                        <li className="px-4 py-2 text-xs font-semibold text-white bg-[#026738] uppercase tracking-wider">
                                            RESTROOMS
                                        </li>
                                        {suggestions.map(restroom => (
                                            <li
                                                key={restroom.restroom_id}
                                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm uppercase tracking-wider flex items-center text-[#026738]"
                                                onClick={() => handleSuggestionClick(restroom)}
                                            >
                                                <FaToilet className="h-4 w-4 mr-2 text-[#026738]" />
                                                <span className="truncate">{restroom.name}</span>
                                            </li>
                                        ))}
                                    </>
                                )}
                                {isSearchingLocation && (
                                    <li className="px-4 py-2 text-center text-sm text-gray-500 uppercase tracking-wider">
                                        SEARCHING LOCATIONS...
                                    </li>
                                )}
                            </ul>
                        )}
                    </div>
                    <button 
                        onClick={handleRecenter}
                        className="bg-[#bdfa70] p-1.5 rounded-full text-[#026738] transition-all duration-200 hover:scale-110"
                        title="RECENTER MAP"
                    >
                         <MapPinIcon className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={handleRefresh}
                        className="bg-[#bdfa70] p-1.5 rounded-full text-[#026738] transition-all duration-200 hover:scale-110"
                        title="REFRESH LIST"
                    >
                        <ArrowPathOutlineIcon className="h-4 w-4" />
                    </button>
                </div>
                
                {/* Gender Filter Buttons */}
                <div className="flex justify-start items-center space-x-2 px-1 pb-3 overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide">
                    <button
                        onClick={() => setGenderFilter(genderFilter === 'male' ? '' : 'male')}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors duration-200 uppercase tracking-wider flex-shrink-0 ${
                            genderFilter === 'male'
                            ? 'bg-[#026738] text-white'
                            : 'bg-[#bdfa70] text-[#026738]'
                        }`}
                    >
                        <FaMale className="h-4 w-4" />
                        <span>MALE</span>
                    </button>

                    <button
                        onClick={() => setGenderFilter(genderFilter === 'female' ? '' : 'female')}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors duration-200 uppercase tracking-wider flex-shrink-0 ${
                            genderFilter === 'female'
                                 ? 'bg-[#026738] text-white'
                            : 'bg-[#bdfa70] text-[#026738]'
                        }`}
                    >
                        <FaFemale className="h-4 w-4" />
                        <span>FEMALE</span>
                    </button>

                    <button
                        onClick={() => setGenderFilter(genderFilter === 'unisex' ? '' : 'unisex')}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors duration-200 uppercase tracking-wider flex-shrink-0 ${
                            genderFilter === 'unisex'
                             ? 'bg-[#026738] text-white'
                            : 'bg-[#bdfa70] text-[#026738]'
                        }`}
                    >
                        <FaUsers className="h-4 w-4" />
                        <span>UNISEX</span>
                    </button>

                    {(genderFilter || searchQuery) && (
                        <button
                            onClick={handleClearFilters}
                            className="flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-semibold text-white bg-gray-500 hover:bg-gray-600 transition-colors duration-200 uppercase tracking-wider flex-shrink-0"
                        >
                            <XMarkIcon className="h-4 w-4" />
                            <span>CLEAR</span>
                        </button>
                    )}
                </div>
            </div>

            {/* MAP SECTION - Fills remaining space */}
            <div className="absolute inset-0" style={{ top: '80px', bottom: isListOpen ? '300px' : '80px' }}>
    <MapContainer
        center={userPosition ? [userPosition.latitude, userPosition.longitude] : [28.6139, 77.2090]}
        zoom={userPosition ? 16 : 10}
        scrollWheelZoom={true}
        className="h-full w-full z-0"
        ref={mapRef}
    >
        <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OPENSTREETMAP</a> CONTRIBUTORS'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {userPosition && <MapUpdater position={userPosition} />}
        
        {userPosition && (
            <Marker position={[userPosition.latitude, userPosition.longitude]} icon={icons.user}>
                <Popup>YOU ARE HERE!</Popup>
            </Marker>
        )}
        {filteredRestrooms.map(restroom => {
            // Get the most common status for this restroom
            const mostCommonStatus = getMostCommonStatus(restroom.rooms);
            const markerColor = getMarkerColor(mostCommonStatus);
            const statusInfo = mostCommonStatus ? getStatusInfo(mostCommonStatus) : null;
            
            return (
                <Marker
                    key={restroom.restroom_id}
                    position={[restroom.latitude, restroom.longitude]}
                    icon={icons.restroom[markerColor]}
                    eventHandlers={{
                        click: () => handleRestroomClick(restroom.restroom_id)
                    }}
                >
                    <Popup>
                        <div className="text-center font-bold text-[#026738] mb-2 uppercase tracking-wider">
                            {restroom.name}
                        </div>
                        <div className="text-sm uppercase tracking-wider">
                            {restroom.address}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
                            {restroom.distance_km} KM AWAY
                        </div>
                        {/* Status indicator in popup */}
                        {statusInfo && (
                            <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full mt-2 ${statusInfo.color}`}>
                                <span className="text-xs font-semibold uppercase tracking-wider">
                                    {statusInfo.label}
                                </span>
                            </div>
                        )}
                        <button 
                            onClick={() => handleRestroomClick(restroom.restroom_id)}
                            className="mt-2 bg-[#026738] text-white px-3 py-1 rounded-full text-xs uppercase tracking-wider block w-full"
                        >
                            VIEW DETAILS
                        </button>
                    </Popup>
                </Marker>
            );
        })}
    </MapContainer>
</div>

            {/* COLLAPSIBLE LIST SECTION - Fixed at bottom */}
            <div className="fixed bottom-19 left-0 right-0 z-40 ">
                {/* Toggle button */}
                <div className="flex justify-center ">
                  <button
                        onClick={() => setIsListOpen(!isListOpen)}
                        className={`bg-[#026738] px-8 py-3 w-full rounded-t-3xl 
                                    flex items-center justify-center space-x-2 
                                    text-white font-bold uppercase tracking-wider text-sm 
                                    transition-all duration-300 hover:bg-[#026738]/90
                                    ${!isListOpen ? 'shadow-[0_8px_25px_rgba(2,103,56,0.45)]' : ''}`}
                    >
                        <MapPinIcon className="h-5 w-5" />
                        <span>{isListOpen ? 'HIDE NEARBY RESTROOMS' : 'SHOW NEARBY RESTROOMS'}</span>
                        <ChevronUpIcon
                            className={`h-5 w-5 transition-transform duration-300 ${
                                isListOpen ? 'rotate-180' : ''
                            }`}
                        />
                    </button>
                </div>

                {/* List content */}
                 <div 
                    className={`bg-white transition-all duration-300 ${
                        isListOpen ? 'h-60 opacity-100' : 'h-0 opacity-0 overflow-hidden'
                    }`}
                >
                    <div className="h-full px-4 pt-2">
                        {loading ? (
                            <div className="flex justify-center items-center h-full">
                                {/* <ArrowPathIcon className="h-10 w-10 animate-spin text-[#026738]" /> */}
                                <div className="animate-spin rounded-full h-11 w-11 border-b-2 border-[#026738]"></div>
                            </div>
                        ) : (
                            <div className="h-full overflow-y-auto pb-4">
                                <div className="space-y-3">
{filteredRestrooms.length > 0 ? (
    filteredRestrooms.map(restroom => {
        const typeInfo = getRestroomTypeInfo(restroom.type);
        const TypeIcon = typeInfo.icon;
        
        // Get the most common status from rooms
        const mostCommonStatus = getMostCommonStatus(restroom.rooms);
        const statusInfo = mostCommonStatus ? getStatusInfo(mostCommonStatus) : null;
        const StatusIcon = statusInfo?.icon;
        
        // Get features from description
        const features = restroom.description?.features || [];
        
        return (
            <div
                key={restroom.restroom_id}
                className="bg-white p-4 rounded-2xl shadow-md border border-[#026738]/10 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] cursor-pointer"
                onClick={() => handleRestroomClick(restroom.restroom_id)}
            >
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-grow min-w-0">
                        <div className="flex items-center space-x-2 mb-1 flex-wrap">
                            <h3 className="text-base font-bold text-[#026738] uppercase tracking-wider">{restroom.name}</h3>
                            <div className={`flex items-center space-x-1 p-1 rounded-2xl ${typeInfo.color}`}>
                                <TypeIcon className="h-4 w-4" />
                                <span className="text-xs font-semibold uppercase tracking-wider">{typeInfo.label}</span>
                            </div>
                            {/* Status Indicator */}
                            {statusInfo && (
                                <div className={`flex items-center space-x-1 p-1 rounded-2xl ${statusInfo.color}`}>
                                   
                                    <StatusIcon className="h-3 w-3" />
                                    <span className="text-xs font-semibold uppercase tracking-wider">{statusInfo.label}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-start space-x-2 mb-2">
                            <MapPinIcon className="h-7 w-7 text-[#026738] bg-green-100 p-1 rounded-2xl mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-600 uppercase tracking-wider overflow-hidden">{restroom.address}</p>
                        </div>
                        <div className="flex items-center mb-2">
                            <div className="flex">
                                {renderStars(restroom.rating)}
                            </div>
                            <span className="ml-2 text-sm text-gray-500 uppercase tracking-wider">
                                ({restroom.rating || 0}/5)
                            </span>
                            <span className="ml-4 text-sm text-[#026738] font-semibold uppercase tracking-wider">
                                {restroom.distance_km} KM AWAY
                            </span>
                        </div>
                        
                        {/* Room Count */}
                        {restroom.rooms && restroom.rooms.length > 0 && (
                            <div className="mb-2">
                                <div className="flex items-center space-x-1 text-gray-600">
                                    <FaToilet className="h-3 w-3" />
                                    <span className="text-xs uppercase tracking-wider">
                                        {restroom.rooms.length} ROOM{restroom.rooms.length > 1 ? 'S' : ''} AVAILABLE
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Features and Actions Row */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex flex-wrap gap-2">
                        {restroom.has_disabled_access && (
                            <div className="flex items-center space-x-1 bg-green-100 p-1 rounded-2xl text-[#026738]">
                                <FaWheelchair className="h-4 w-4" />
                                <span className="text-xs uppercase tracking-wider">ACCESSIBLE</span>
                            </div>
                        )}
                        {restroom.gender && (
                            <div className="flex items-center space-x-1 bg-green-100 p-1 rounded-2xl text-[#026738]">
                                {restroom.gender === 'male' && <FaMale className="h-4 w-4" />}
                                {restroom.gender === 'female' && <FaFemale className="h-4 w-4" />}
                                {restroom.gender === 'unisex' && <FaUsers className="h-4 w-4" />}
                                <span className="text-xs uppercase tracking-wider">{restroom.gender}</span>
                            </div>
                        )}
                        {/* Individual feature badges */}
                        {features.includes('cctv') && (
                            <div className="flex items-center space-x-1 bg-green-100 p-1 rounded-2xl text-[#026738]">
                                <CameraIcon className="h-4 w-4" />
                                <span className="text-xs uppercase tracking-wider">CCTV</span>
                            </div>
                        )}
                        {features.includes('handicap_accessible') && (
                            <div className="flex items-center space-x-1 bg-green-100 p-1 rounded-2xl text-[#026738]">
                                <FaWheelchair className="h-4 w-4" />
                                <span className="text-xs uppercase tracking-wider">ACCESSIBLE</span>
                            </div>
                        )}
                        {features.includes('baby_changing_station') && (
                            <div className="flex items-center space-x-1 bg-green-100 p-1 rounded-2xl text-[#026738]">
                                <span className="text-sm">👶</span>
                                <span className="text-xs uppercase tracking-wider">BABY STATION</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex space-x-2">
                        {restroom.phone && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`tel:${restroom.phone}`, '_self');
                                }}
                                className="bg-[#026738] text-white p-2 rounded-full hover:bg-[#026738]/80 transition-colors"
                                title="CALL"
                            >
                                <PhoneIconSolid className="h-4 w-4" />
                            </button>
                        )}
                       
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if (mapRef.current) {
                                    mapRef.current.flyTo([restroom.latitude, restroom.longitude], 18, {
                                        animate: true,
                                        duration: 1.5
                                    });
                                    setIsListOpen(false);
                                }
                            }}
                            className="bg-[#bdfa70] text-[#026738] p-2 rounded-full hover:bg-[#bdfa70]/80 transition-colors"
                            title="VIEW ON MAP"
                        >
                            <MapPinIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    })
) : (
    <div className="text-center py-15">
        <FaToilet className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 uppercase tracking-wider mb-4">NO RESTROOMS FOUND NEARBY.</p>
    </div>
)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* FIXED BOTTOM NAVIGATION BAR */}
            <div className="fixed bottom-0 left-0 right-0 z-50">
                <div className="bg-gradient-to-br from-[#BDFa70] to-[#87BC43] 
                                p-4 flex items-center justify-around py-6
                                relative">

                    {/* Inner top shadow */}
                    <div className="absolute top-0 left-0 right-0 h-3 
                                    bg-gradient-to-b from-[rgba(2,103,56,0.4)] to-transparent pointer-events-none">
                    </div>

                    <button className="flex flex-col items-center text-[#026738] hover:text-[#026738]/80 transition-all duration-200 hover:scale-110">
                        <BellIcon className="h-7 w-7 text-[#026738]" />
                    </button>

                    <button
                      onClick={handleOpenBookmarks} className="flex flex-col items-center text-[#026738] hover:text-[#026738]/80 transition-all duration-200 hover:scale-110">
                        <BookmarkIcon className="h-7 w-7 text-[#026738]" />
                    </button>

                    <button 
                        onClick={handleProfileClick} 
                        className="flex flex-col items-center text-[#026738] hover:text-[#026738]/80 transition-all duration-200 hover:scale-110"
                    >
                        <UserCircleIcon className="h-7 w-7 text-[#026738]" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RestroomFinder;