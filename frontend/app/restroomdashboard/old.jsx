"use client";
import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CameraIcon,
  ClipboardDocumentCheckIcon,
  StarIcon as StarOutlineIcon,
  BuildingOffice2Icon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  ArrowRightOnRectangleIcon,
  WrenchScrewdriverIcon,
  ClockIcon,
  PhotoIcon,
  ArrowPathIcon as ArrowPathOutlineIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import {
  BellIcon,
  BookmarkIcon,
  StarIcon as StarSolidIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/solid';
import { FaToilet, FaMale, FaFemale, FaUsers, FaWheelchair, FaBaby, FaEye, FaBus, FaTrain, FaSubway, FaToiletPaper } from 'react-icons/fa';
import { GiKey } from 'react-icons/gi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import RestroomProfile from './RestroomProfile ';
const apiUrl = "https://cleverloo-backend-1.vercel.app";


const RestroomManagement = ({ onBack, onProfileClick }) => {
   const { data: session, status, update } = useSession();
  const [activeTab, setActiveTab] = useState('settings');
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [restroom, setRestroom] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // Settings state
  const [gender, setGender] = useState('unisex');
  const [type, setType] = useState('public');


  // Pictures state
  const [pictures, setPictures] = useState([]);
  const [isUploading, setIsUploading] = useState(false);


  // Description state
  const [features, setFeatures] = useState([]);
  const [transportBus, setTransportBus] = useState('');
  const [transportMetro, setTransportMetro] = useState('');
  const [transportTrain, setTransportTrain] = useState('');


  // Rooms state
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [editingRoom, setEditingRoom] = useState(null);
  const [editRoomName, setEditRoomName] = useState('');


  // Reviews state
  const [reviews, setReviews] = useState([]);


  const restroomId = session?.user?.id;


  useEffect(() => {
    if (restroomId) {
      fetchRestroomData();
    }
  }, [restroomId]);


  const fetchRestroomData = async () => {
    try {
      // Fetch restroom profile
      const profileResponse = await fetch(`${apiUrl}/restroom/profile`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setRestroom(profileData.restroom);
        setGender(profileData.restroom.gender || 'unisex');
        setType(profileData.restroom.type || 'public');
      }


      // Fetch pictures, description, rooms, and reviews in parallel
      await Promise.all([
        fetchPictures(),
        fetchDescription(),
        fetchRooms(),
        fetchReviews(),
      ]);
    } catch (error) {
      console.error('Error fetching restroom data:', error);
      toast.error('failed to load restroom data.');
    } finally {
      setLoading(false);
    }
  };


  const onSignOut = async () => {
    setSigningOut(true);
    await signOut({ callbackUrl: '/' });
  };


  const fetchPictures = async () => {
    try {
      const response = await fetch(`${apiUrl}/restrooms/${restroomId}/pictures`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPictures(data.pictures || []);
      } else {
        throw new Error('failed to fetch pictures');
      }
    } catch (error) {
      console.error('Error fetching pictures:', error);
      toast.error('failed to fetch pictures.');
    }
  };


  const fetchDescription = async () => {
    try {
      const response = await fetch(`${apiUrl}/restrooms/${restroomId}/description`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setFeatures(data.description.features || []);
        setTransportBus(data.description.nearest_transport_bus || '');
        setTransportMetro(data.description.nearest_transport_metro || '');
        setTransportTrain(data.description.nearest_transport_train || '');
      } else {
        throw new Error('failed to fetch description');
      }
    } catch (error) {
      console.error('Error fetching description:', error);
      toast.error('failed to fetch description.');
    }
  };


  const fetchRooms = async () => {
    try {
      const response = await fetch(`${apiUrl}/restrooms/${restroomId}/rooms`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRooms(data.rooms || []);
      } else {
        throw new Error('failed to fetch rooms');
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('failed to fetch rooms.');
    }
  };


  const fetchReviews = async () => {
    try {
      const response = await fetch(`${apiUrl}/restrooms/${restroomId}/reviews/admin`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      } else {
        throw new Error('failed to fetch reviews');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('failed to fetch reviews.');
    }
  };


  const handleSettingsUpdate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/restrooms/${restroomId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ gender, type }),
      });
      if (response.ok) {
        toast.success('settings updated successfully!');
      } else {
        const error = await response.json();
        toast.error(error.message || 'failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('failed to update settings');
    } finally {
      setLoading(false);
    }
  };


  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;


    if (pictures.length >= 4) {
      toast.error('maximum of 4 pictures allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('image size must be under 2mb.');
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('please upload a valid image file (jpg, png, gif, webp).');
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'cleverloo');


      const cloudinaryResponse = await fetch('https://api.cloudinary.com/v1_1/dnrej03py/image/upload', {
        method: 'POST',
        body: formData,
      });


      if (!cloudinaryResponse.ok) {
        const errorData = await cloudinaryResponse.json();
        throw new Error(errorData.error.message || 'cloudinary upload failed.');
      }
      const data = await cloudinaryResponse.json();
      if (!data.secure_url) {
        throw new Error('cloudinary upload failed: secure_url not found');
      }


      const backendResponse = await fetch(`${apiUrl}/restrooms/${restroomId}/pictures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ imageUrl: data.secure_url }),
      });


      if (backendResponse.ok) {
        await fetchPictures();
        toast.success('image uploaded successfully!');
      } else {
        const error = await backendResponse.json();
        toast.error(error.message || 'failed to save image url to database.');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(`failed to upload image. ${error.message || ''}`);
    } finally {
      setIsUploading(false);
    }
  };


  const handleDeletePicture = async (imageUrl) => {
    if (!window.confirm('are you sure you want to delete this picture?')) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/restrooms/${restroomId}/pictures`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ imageUrl }),
      });
      if (response.ok) {
        await fetchPictures();
        toast.success('picture deleted successfully!');
      } else {
        const error = await response.json();
        toast.error(error.message || 'failed to delete picture.');
      }
    } catch (error) {
      console.error('Error deleting picture:', error);
      toast.error('failed to delete picture.');
    } finally {
      setLoading(false);
    }
  };


  const handleDescriptionUpdate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/restrooms/${restroomId}/description`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          features,
          nearest_transport_bus: transportBus || null,
          nearest_transport_metro: transportMetro || null,
          nearest_transport_train: transportTrain || null,
        }),
      });


      if (response.ok) {
        toast.success('description updated successfully!');
      } else {
        const error = await response.json();
        toast.error(error.message || 'failed to update description');
      }
    } catch (error) {
      console.error('Error updating description:', error);
      toast.error('failed to update description');
    } finally {
      setLoading(false);
    }
  };


  const handleFeatureToggle = (feature) => {
    setFeatures((prev) => (prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]));
  };


  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      toast.error('room name is required');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/restrooms/${restroomId}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ room_name: newRoomName.trim() }),
      });
      if (response.ok) {
        setNewRoomName('');
        await fetchRooms();
        toast.success('room created successfully!');
      } else {
        const error = await response.json();
        toast.error(error.message || 'failed to create room');
      }
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('failed to create room');
    } finally {
      setLoading(false);
    }
  };


  const handleEditRoom = (room) => {
    setEditingRoom(room.room_id);
    setEditRoomName(room.room_name);
  };


  const handleUpdateRoom = async (roomId) => {
    if (!editRoomName.trim()) {
      toast.error('room name cannot be empty');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/restrooms/${restroomId}/rooms/${roomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ room_name: editRoomName.trim() }),
      });
      if (response.ok) {
        setEditingRoom(null);
        await fetchRooms();
        toast.success('room updated successfully!');
      } else {
        const error = await response.json();
        toast.error(error.message || 'failed to update room');
      }
    } catch (error) {
      console.error('Error updating room:', error);
      toast.error('failed to update room');
    } finally {
      setLoading(false);
    }
  };


  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm('are you sure you want to delete this room?')) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/restrooms/${restroomId}/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (response.ok) {
        await fetchRooms();
        toast.success('room deleted successfully!');
      } else {
        const error = await response.json();
        toast.error(error.message || 'failed to delete room');
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      toast.error('failed to delete room');
    } finally {
      setLoading(false);
    }
  };


  const handleChangeRoomStatus = async (roomId, status) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/restrooms/${restroomId}/rooms/${roomId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ queue_status: status }),
      });
      if (response.ok) {
        await fetchRooms();
        toast.success('room status updated!');
      } else {
        const error = await response.json();
        toast.error(error.message || 'failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('failed to update status');
    } finally {
      setLoading(false);
    }
  };



  const handleProfileClick = () => {
      setIsProfileOpen(true);
  };


  const handleBackClick = () => {
      setIsProfileOpen(false);
  };
  if (isProfileOpen) {
      return <RestroomProfile session={session} handleBackClick={handleBackClick} updateSession={update} />;
  }



  const tabs = [
    { key: 'settings', label: 'settings', icon: WrenchScrewdriverIcon },
    { key: 'pictures', label: 'pictures', icon: PhotoIcon },
    { key: 'description', label: 'description', icon: ClipboardDocumentCheckIcon },
    { key: 'rooms', label: 'rooms', icon: FaToilet },
    { key: 'reviews', label: 'reviews', icon: StarSolidIcon }
  ];


  const renderContent = () => {
    switch (activeTab) {
      case 'settings':
        return (
          <div className="p-6 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-base font-semibold text-[#026738] uppercase tracking-wider flex items-center gap-2">
                  <WrenchScrewdriverIcon className="h-5 w-5 text-[#87BC43]" />
                  restroom settings
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#026738] uppercase tracking-wider mb-3">restroom gender</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'male', icon: FaMale, label: 'male' },
                      { value: 'female', icon: FaFemale, label: 'female' },
                      { value: 'unisex', icon: FaUsers, label: 'unisex' }
                    ].map(({ value, icon: Icon, label }) => (
                      <button
                        key={value}
                        onClick={() => setGender(value)}
                        className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-md border text-sm font-semibold uppercase tracking-wider transition-all ${
                          gender === value 
                            ? 'bg-[#026738] text-white border-[#026738]' 
                            : 'bg-white text-[#026738] border-[#87BC43] hover:border-[#026738]'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#026738] uppercase tracking-wider mb-3">restroom type</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'public', icon: GlobeAltIcon, label: 'public' },
                      { value: 'paid', icon: CurrencyDollarIcon, label: 'paid' },
                      { value: 'private', icon: GiKey, label: 'private' }
                    ].map(({ value, icon: Icon, label }) => (
                      <button
                        key={value}
                        onClick={() => setType(value)}
                        className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-md border text-sm font-semibold uppercase tracking-wider transition-all ${
                          type === value 
                            ? 'bg-[#026738] text-white border-[#026738]' 
                            : 'bg-white text-[#026738] border-[#87BC43] hover:border-[#026738]'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleSettingsUpdate}
                  disabled={loading}
                  className="w-full bg-[#026738] text-white font-semibold text-base uppercase tracking-wider py-3 px-6 rounded-md hover:bg-[#026738]/90 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#026738]" /> : 'save settings'}
                </button>
              </div>
            </div>
          </div>
        );
      case 'pictures':
        return (
          <div className="p-6 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-base font-semibold text-[#026738] uppercase tracking-wider flex items-center gap-2">
                  <PhotoIcon className="h-5 w-5 text-[#87BC43]" />
                  restroom pictures
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {pictures.map((pic, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                      <img src={pic} alt={`restroom ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => handleDeletePicture(pic)}
                        className="absolute top-2 right-2 p-2 bg-white/90 rounded-full text-red-500 hover:bg-red-100 transition-colors"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                  {pictures.length < 4 && (
                    <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-[#87BC43] rounded-lg cursor-pointer hover:border-[#026738] hover:bg-green-100 transition-colors">
                      <CameraIcon className="h-8 w-8 text-[#87BC43]" />
                      <span className="mt-2 text-sm font-semibold text-[#026738] uppercase tracking-wider">
                        {isUploading ? 'uploading...' : 'add photo'}
                      </span>
                      <input type="file" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                    </label>
                  )}
                </div>
                <p className="text-sm text-[#026738] text-center uppercase tracking-wider">
                  max 4 pictures • 2mb each
                </p>
              </div>
            </div>
          </div>
        );
      case 'description':
        return (
          <div className="p-6 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-base font-semibold text-[#026738] uppercase tracking-wider flex items-center gap-2">
                  <ClipboardDocumentCheckIcon className="h-5 w-5 text-[#87BC43]" />
                  restroom details
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#026738] uppercase tracking-wider mb-3">features</label>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: 'cctv', icon: FaEye, label: 'cctv' },
                      { key: 'handicap_accessible', icon: FaWheelchair, label: 'handicap accessible' },
                      { key: 'baby_changing_station', icon: FaBaby, label: 'baby station' }
                    ].map(({ key, icon: Icon, label }) => (
                      <button
                        key={key}
                        onClick={() => handleFeatureToggle(key)}
                        className={`flex items-center space-x-2 px-4 py-2 text-sm rounded-md border font-semibold uppercase tracking-wider transition-colors ${
                          features.includes(key)
                            ? 'bg-[#026738] text-white border-[#026738]'
                            : 'bg-white text-[#026738] border-[#87BC43] hover:border-[#026738]'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-6">
                  {[
                    { key: 'bus', icon: FaBus, label: 'nearest bus stop', value: transportBus, setter: setTransportBus },
                    { key: 'metro', icon: FaSubway, label: 'nearest metro', value: transportMetro, setter: setTransportMetro },
                    { key: 'train', icon: FaTrain, label: 'nearest train', value: transportTrain, setter: setTransportTrain }
                  ].map(({ key, icon: Icon, label, value, setter }) => (
                    <div key={key}>
                      <label className="flex items-center text-sm font-medium text-[#026738] uppercase tracking-wider mb-2">
                        <Icon className="h-4 w-4 mr-2 text-[#87BC43]" />
                        {label}
                      </label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => setter(e.target.value)}
                        className="w-full px-4 py-3 border border-[#87BC43] rounded-md focus:ring-1 focus:ring-[#87BC43] focus:border-[#87BC43] text-sm text-[#026738] placeholder:text-[#026738] uppercase tracking-wider font-semibold"
                        placeholder={`e.g. ${label}, 5-min walk`}
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleDescriptionUpdate}
                  disabled={loading}
                  className="w-full bg-[#026738] text-white font-semibold text-base uppercase tracking-wider py-3 px-6 rounded-md hover:bg-[#026738]/90 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#026738]" /> : 'save details'}
                </button>
              </div>
            </div>
          </div>
        );
      case 'rooms':
        return (
          <div className="p-6 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-base font-semibold text-[#026738] uppercase tracking-wider flex items-center gap-2">
                  <FaToilet className="h-5 w-5 text-[#87BC43]" />
                  manage rooms
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center space-x-4">
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="enter room name..."
                    className="flex-grow px-4 py-3 border border-[#87BC43] rounded-md focus:ring-1 focus:ring-[#87BC43] focus:border-[#87BC43] text-base font-semibold text-[#026738] placeholder:text-[#026738] uppercase tracking-wider"
                  />
                  <button
                    onClick={handleCreateRoom}
                    disabled={loading}
                    className="bg-[#87BC43] text-[#026738] p-3 rounded-md hover:bg-[#87BC43]/90 transition-colors disabled:opacity-50 flex justify-center items-center"
                  >
                    <PlusIcon className="h-6 w-6" />
                  </button>
                </div>
                <div className="space-y-3">
                  {rooms.map((room) => (
                    <div key={room.room_id} className="bg-gray-50 rounded-md border border-gray-200">
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-4 w-full max-w-[70%]">
                          {editingRoom === room.room_id ? (
                            <div className="flex items-center space-x-3 w-full">
                              <input
                                type="text"
                                value={editRoomName}
                                onChange={(e) => setEditRoomName(e.target.value)}
                                className="flex-grow px-3 py-2 text-base border border-[#87BC43] rounded-md uppercase tracking-wider font-semibold text-[#026738]"
                              />
                              <button onClick={() => handleUpdateRoom(room.room_id)} className="text-[#87BC43] hover:text-[#026738]">
                                <CheckCircleIcon className="h-6 w-6" />
                              </button>
                              <button onClick={() => setEditingRoom(null)} className="text-red-500 hover:text-red-700">
                                <XMarkIcon className="h-6 w-6" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="font-semibold text-lg text-[#026738] uppercase tracking-wider truncate">{room.room_name}</span>
                              <span className={`px-3 py-1 text-sm rounded-full font-semibold uppercase tracking-wider ${
                                room.queue_status === 'Vacant' ? 'bg-green-100 text-green-700' :
                                room.queue_status === 'In Use' ? 'bg-yellow-100 text-yellow-700' :
                                room.queue_status === 'Cleaning' ? 'bg-blue-100 text-blue-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {room.queue_status}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 w-full max-w-[30%] justify-end">
                          <button onClick={() => handleEditRoom(room)} className="text-[#87BC43] hover:text-[#026738] p-2">
                            <PencilIcon className="h-6 w-6" />
                          </button>
                          <button onClick={() => handleDeleteRoom(room.room_id)} className="text-red-500 hover:text-red-700 p-2">
                            <TrashIcon className="h-6 w-6" />
                          </button>
                        </div>
                      </div>
                      <div className="px-4 pb-4">
                        <select
                          value={room.queue_status}
                          onChange={(e) => handleChangeRoomStatus(room.room_id, e.target.value)}
                          className="w-full px-4 py-3 border border-[#87BC43] rounded-md text-base bg-white text-[#026738] font-semibold uppercase tracking-wider focus:ring-1 focus:ring-[#87BC43] focus:border-[#87BC43]"
                        >
                          <option value="Vacant">vacant</option>
                          <option value="In Use">in use</option>
                          <option value="Cleaning">cleaning</option>
                          <option value="Under Maintenance">maintenance</option>
                        </select>
                      </div>
                      {room.queue_status === 'Cleaning' && (
                        <div className="px-4 pb-4 pt-0">
                          <p className="text-sm text-[#026738] flex items-center gap-2 uppercase tracking-wider">
                            <ClockIcon className="h-4 w-4" />
                            last cleaned: {new Date(room.last_cleaned).toLocaleTimeString()}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'reviews':
        return (
          <div className="p-6 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-[#026738] uppercase tracking-wider flex items-center gap-2">
                    <StarSolidIcon className="h-5 w-5 text-[#87BC43]" />
                    customer reviews
                  </h3>
                  {reviews.length > 0 && (
                    <span className="text-sm text-[#026738] uppercase tracking-wider">
                      {reviews.length} reviews
                    </span>
                  )}
                </div>
              </div>
              <div className="p-6">
                {reviews.length > 0 ? (
                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <div key={review.review_id} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
                        <div className="flex items-start space-x-5">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <UserCircleIcon className="h-7 w-7 text-[#026738]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-semibold text-sm text-[#026738] uppercase tracking-wider truncate">
                                {review.user_name || 'anonymous user'}
                              </p>
                              <span className="text-sm text-[#026738] uppercase tracking-wider whitespace-nowrap ml-2">
                                {new Date(review.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center mb-3">
                              {Array.from({ length: 5 }, (_, i) => (
                                i < review.rating ? 
                                  <StarSolidIcon key={i} className="h-5 w-5 text-yellow-400" /> : 
                                  <StarOutlineIcon key={i} className="h-5 w-5 text-gray-300" />
                              ))}
                              <span className="ml-2 text-sm text-[#026738] font-semibold">
                                {review.rating}/5
                              </span>
                            </div>
                            {review.comment && (
                              <p className="text-sm text-[#026738] leading-relaxed mb-3">
                                {review.comment}
                              </p>
                            )}
                            {review.pictures && review.pictures.length > 0 && (
                              <div className="flex space-x-3 mt-3">
                                {review.pictures.map((pic, index) => (
                                  <img 
                                    key={index} 
                                    src={pic} 
                                    alt={`review ${index + 1}`} 
                                    className="w-full h-full object-cover rounded-md border border-gray-200 max-w-[100px]"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-[#87BC43]">
                    <StarOutlineIcon className="h-10 w-10 mb-3" />
                    <p className="text-sm font-semibold uppercase tracking-wider text-center">
                      no reviews yet
                    </p>
                    <p className="text-sm text-[#026738] text-center mt-2 max-w-xs">
                      reviews will appear here once customers start rating your restroom
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };


  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
        <div className="text-center p-8 bg-white rounded-lg border border-gray-200 max-w-sm mx-auto">
          <ExclamationTriangleIcon className="h-14 w-14 text-red-400 mx-auto mb-6" />
          <h2 className="text-base font-semibold text-[#026738] mb-4 uppercase tracking-wider">access denied</h2>
          <p className="text-sm text-[#026738] font-semibold tracking-wider">please log in as a restroom owner to access this page.</p>
        </div>
      </div>
    );
  }


  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 font-sans">
      {/* FIXED HEADER */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#BDFa70] to-[#87BC43] shadow-sm">
        <div className="flex items-center justify-between p-4">
          <Image
            src="/Clever Loo LOGO - 3.png"
            alt="clever loo logo"
            width={100}
            height={50}
            className="bg-transparent"
          />
          <div className="flex items-center space-x-3">
            <button
              onClick={handleProfileClick}
              className="bg-white/20 backdrop-blur-sm w-12 h-12 rounded-full text-[#026738] transition-all duration-200 hover:bg-white/30 flex items-center justify-center"
              aria-label="profile"
            >
              <UserCircleIcon className="h-6 w-6" />
            </button>
            <button
              onClick={onSignOut}
              disabled={signingOut}
              className="bg-white/20 backdrop-blur-sm w-12 h-12 rounded-full text-[#026738] transition-all duration-200 hover:bg-white/30 flex items-center justify-center disabled:opacity-50"
              aria-label="sign out"
            >
              {signingOut ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#026738]" />
              ) : (
                <ArrowRightOnRectangleIcon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
        
        {/* HORIZONTAL SCROLLABLE TABS */}
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex border-t border-white/20">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-shrink-0 flex items-center space-x-2 px-6 py-4 font-semibold text-sm uppercase tracking-wider transition-all border-b-4 ${
                  activeTab === key
                    ? 'text-[#026738] border-[#026738] bg-white/20'
                    : 'text-[#026738]/80 border-transparent hover:text-[#026738] hover:bg-white/10'
                }`}
              >
                {typeof Icon === 'function' && Icon.prototype && Icon.prototype.render ? (
                  <Icon className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
                <span className="whitespace-nowrap">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>


      {/* MAIN CONTENT AREA */}
      <div className="flex-1 pt-32 overflow-auto">
        {loading ? (
          <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-r from-[#BDFa70] to-[#87BC43] z-50">
            <Image
              src="/Clever Loo LOGO - 3.png"
              alt="clever loo logo"
              width={160}
              height={80}
              className="animate-pulse mb-6"
            />
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
              <p className="text-white font-semibold uppercase tracking-wider text-lg">loading restroom...</p>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            {renderContent()}
          </div>
        )}
      </div>


    </div>
  );
};


export default RestroomManagement;
