"use client";
import { useState, useEffect } from 'react';
import Papa from 'papaparse';

export default function Home() {
  const [userLocation, setUserLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nearestLocation, setNearestLocation] = useState(null);
  const [locations, setLocations] = useState([]);
  const [mapUrl, setMapUrl] = useState('');

  // Get user's current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(userLoc);
          setMapUrl(`https://www.google.com/maps?q=${userLoc.lat},${userLoc.lng}&z=15`);
          setIsLoading(false);
        },
        (error) => {
          setError(`Error getting location: ${error.message}`);
          setIsLoading(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
      setIsLoading(false);
    }
  }, []);

  // Load CSV file automatically on mount
  useEffect(() => {
    fetch('/locations.csv')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load locations data');
        }
        return response.text();
      })
      .then(csvData => {
        Papa.parse(csvData, {
          header: true,
          complete: (results) => {
            const parsedLocations = results.data
              .filter(item => item.latitude && item.longitude)
              .map(item => ({
                lat: parseFloat(item.latitude),
                lng: parseFloat(item.longitude),
                name: item.name || 'Unnamed Location'
              }));
            
            setLocations(parsedLocations);
          },
          error: (error) => {
            setError(`Error parsing CSV: ${error.message}`);
          }
        });
      })
      .catch(error => {
        setError(`Error loading locations data: ${error.message}`);
      });
  }, []);

  // Calculate distance between two points using the Haversine formula
  const calculateDistance = (point1, point2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  // Find the nearest location to the user
  const findNearestLocation = (userLoc, locationsList) => {
    if (!locationsList.length) return null;
    
    let nearestLoc = locationsList[0];
    let minDistance = calculateDistance(userLoc, nearestLoc);
    
    for (let i = 1; i < locationsList.length; i++) {
      const distance = calculateDistance(userLoc, locationsList[i]);
      if (distance < minDistance) {
        minDistance = distance;
        nearestLoc = locationsList[i];
      }
    }
    
    return {
      ...nearestLoc,
      distance: minDistance
    };
  };

  // Effect to update nearest location when user location or locations change
  useEffect(() => {
    if (userLocation && locations.length > 0) {
      const nearest = findNearestLocation(userLocation, locations);
      setNearestLocation(nearest);
    }
  }, [userLocation, locations]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center text-indigo-800 mb-8">Nearest Location Finder</h1>
        
        <div className="max-w-xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
              <p className="ml-4 text-lg text-gray-700">Locating you...</p>
            </div>
          ) : error ? (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-md">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Location</h2>
                <div className="flex items-center justify-between">
                  <p className="text-gray-600">
                    <span className="font-medium">Coordinates:</span> {userLocation?.lat.toFixed(6)}, {userLocation?.lng.toFixed(6)}
                  </p>
                  <a 
                    href={mapUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    View on Map
                  </a>
                </div>
              </div>
              
              {nearestLocation ? (
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Nearest Location</h2>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold text-green-700">{nearestLocation.name}</p>
                    <p className="text-gray-600">
                      <span className="font-medium">Coordinates:</span> {nearestLocation.lat.toFixed(6)}, {nearestLocation.lng.toFixed(6)}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Distance:</span> <span className="font-bold text-indigo-600">{nearestLocation.distance.toFixed(2)} km</span>
                    </p>
                    <a 
                      href={`https://www.google.com/maps?q=${nearestLocation.lat},${nearestLocation.lng}&z=15`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-block mt-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700 transition-colors"
                    >
                      View on Map
                    </a>
                  </div>
                </div>
              ) : locations.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <p className="text-yellow-600">Finding nearest location...</p>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <p className="text-yellow-600">Loading location data...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}