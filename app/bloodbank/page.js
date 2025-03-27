"use client";
import { useState, useEffect } from 'react';
import Papa from 'papaparse';

export default function NearestBloodBankFinder() {
  const [userLocation, setUserLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nearestBloodBank, setNearestBloodBank] = useState(null);
  const [bloodBanks, setBloodBanks] = useState([]);
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
    fetch('/bloodbank.csv')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load blood bank data');
        }
        return response.text();
      })
      .then(csvData => {
        Papa.parse(csvData, {
          header: true,
          complete: (results) => {
            const parsedBloodBanks = results.data
              .filter(item => item['LATITUDE'] && item['LONGITUDE'])
              .map(item => ({
                lat: parseFloat(item['LATITUDE']),
                lng: parseFloat(item['LONGITUDE']),
                name: item['Blood Bank Name'] || 'Not Available',
                address: item['Address'] || 'Not Available'
              }));
            
            setBloodBanks(parsedBloodBanks);
          },
          error: (error) => {
            setError(`Error parsing CSV: ${error.message}`);
          }
        });
      })
      .catch(error => {
        setError(`Error loading blood bank data: ${error.message}`);
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

  // Find the nearest blood bank to the user
  const findNearestBloodBank = (userLoc, bloodBanksList) => {
    if (!bloodBanksList.length) return null;
    
    let nearestBank = bloodBanksList[0];
    let minDistance = calculateDistance(userLoc, nearestBank);
    
    for (let i = 1; i < bloodBanksList.length; i++) {
      const distance = calculateDistance(userLoc, bloodBanksList[i]);
      if (distance < minDistance) {
        minDistance = distance;
        nearestBank = bloodBanksList[i];
      }
    }
    
    return {
      ...nearestBank,
      distance: minDistance
    };
  };

  // Update nearest blood bank when user location or blood banks change
  useEffect(() => {
    if (userLocation && bloodBanks.length > 0) {
      const nearest = findNearestBloodBank(userLocation, bloodBanks);
      setNearestBloodBank(nearest);
    }
  }, [userLocation, bloodBanks]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100">
      <div className="container mx-auto px-4 py-12">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-red-800">Nearest Blood Bank Finder</h1>
          <p className="mt-4 text-lg text-gray-700">Find the closest blood bank based on your current location</p>
        </header>
        
        <div className="max-w-2xl mx-auto space-y-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-500"></div>
              <p className="mt-4 text-lg text-gray-700">Locating you...</p>
            </div>
          ) : error ? (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded shadow-md">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          ) : (
            <>
              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Location</h2>
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <p className="text-gray-600">
                    <span className="font-bold">Coordinates:</span>{" "}
                    <span className="font-bold ml-2">
                      {userLocation?.lat.toFixed(6)}, {userLocation?.lng.toFixed(6)}
                    </span>
                  </p>
                  <a 
                    href={mapUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-2 sm:mt-0 text-red-600 hover:text-red-800 font-bold"
                  >
                    View on Map
                  </a>
                </div>
              </div>
              
              {nearestBloodBank ? (
                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-red-500">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Nearest Blood Bank</h2>
                  <div className="space-y-4">
                    <p className="text-xl font-bold text-red-700">{nearestBloodBank.name}</p>
                    <p className="text-gray-600">
                      <span className="font-bold">Coordinates:</span>{" "}
                      <span className="ml-2">{nearestBloodBank.lat.toFixed(6)}, {nearestBloodBank.lng.toFixed(6)}</span>
                    </p>
                    <p className="text-gray-600">
                      <span className="font-bold">Distance:</span>{" "}
                      <span className="ml-2">{nearestBloodBank.distance.toFixed(2)} km</span>
                    </p>
                    <p className="text-gray-600">
                      <span className="font-bold">Address:</span>{" "}
                      <span className="ml-2">{nearestBloodBank.address}</span>
                    </p>
                    <a 
                      href={`https://www.google.com/maps?q=${nearestBloodBank.lat},${nearestBloodBank.lng}&z=15`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-block mt-4 px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
                    >
                      View on Map
                    </a>
                  </div>
                </div>
              ) : bloodBanks.length > 0 ? (
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                  <p className="text-yellow-600 font-bold">Finding nearest blood bank...</p>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                  <p className="text-yellow-600 font-bold">Loading blood bank data...</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}