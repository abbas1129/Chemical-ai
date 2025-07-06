import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [imageSource, setImageSource] = useState(''); // 'camera' or 'gallery'
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      setCameraStream(stream);
      setShowCamera(true);
      setError(null);
      
      // Set video stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions or use file upload.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0);
      
      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
          setSelectedImage(file);
          setImageSource('camera');
          setError(null);
          
          // Create preview
          const reader = new FileReader();
          reader.onload = (e) => {
            setImagePreview(e.target.result);
          };
          reader.readAsDataURL(file);
          
          // Stop camera
          stopCamera();
        }
      }, 'image/jpeg', 0.8);
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedImage(file);
        setImageSource('gallery');
        setError(null);
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        setError('Please select a valid image file');
      }
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const analyzeProduct = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const base64Image = await convertToBase64(selectedImage);
      
      const response = await axios.post(`${API}/analyze-product`, {
        image_base64: base64Image
      });
      
      setAnalysis(response.data);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.response?.data?.detail || 'Failed to analyze product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetAnalysis = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setAnalysis(null);
    setError(null);
    setImageSource('');
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthScoreBg = (score) => {
    if (score >= 80) return 'bg-green-100 border-green-300';
    if (score >= 60) return 'bg-yellow-100 border-yellow-300';
    if (score >= 40) return 'bg-orange-100 border-orange-300';
    return 'bg-red-100 border-red-300';
  };

  const getHealthScoreGradient = (score) => {
    if (score >= 80) return 'from-green-500 to-green-600';
    if (score >= 60) return 'from-yellow-500 to-yellow-600';
    if (score >= 40) return 'from-orange-500 to-orange-600';
    return 'from-red-500 to-red-600';
  };

  // Camera View
  if (showCamera) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="flex-1 relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Camera Controls */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center space-x-6 px-4">
            <button
              onClick={stopCamera}
              className="bg-gray-600 bg-opacity-80 text-white p-4 rounded-full hover:bg-opacity-100 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <button
              onClick={capturePhoto}
              className="bg-white p-6 rounded-full shadow-lg hover:scale-105 transition-all"
            >
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-gray-600 bg-opacity-80 text-white p-4 rounded-full hover:bg-opacity-100 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        
        <input
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          ref={fileInputRef}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center items-center mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            AI Health Analyzer
          </h1>
          <p className="text-lg text-gray-600 px-4">
            Scan products to check their health impact
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {!analysis ? (
            /* Upload Section */
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-6">
              <div className="text-center">
                {imagePreview ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="max-w-full h-64 md:h-80 object-contain mx-auto rounded-lg"
                      />
                      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-sm">
                        {imageSource === 'camera' ? '📸 Camera' : '📁 Gallery'}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Product image ready for analysis
                    </p>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-6">
                    <div className="space-y-4">
                      <div className="text-6xl">🔍</div>
                      <p className="text-xl text-gray-600">
                        Capture or select a product image
                      </p>
                      <p className="text-sm text-gray-500">
                        Take a photo of the product label or ingredients list
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={startCamera}
                    className="btn-camera flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Take Photo</span>
                  </button>
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-gallery flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Choose from Gallery</span>
                  </button>
                </div>

                {selectedImage && (
                  <button
                    onClick={analyzeProduct}
                    disabled={loading}
                    className="btn-analyze w-full md:w-auto"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Analyzing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Analyze Product</span>
                      </div>
                    )}
                  </button>
                )}

                {error && (
                  <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg">
                    <p className="text-red-700">{error}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Results Section */
            <div className="space-y-6">
              {/* Health Score Card */}
              <div className={`bg-white rounded-2xl shadow-xl p-6 border-2 ${getHealthScoreBg(analysis.health_score)}`}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Health Analysis</h2>
                  <button
                    onClick={resetAnalysis}
                    className="btn-secondary"
                  >
                    New Scan
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="relative w-32 h-32 mx-auto mb-4">
                      <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${getHealthScoreGradient(analysis.health_score)} p-1`}>
                        <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                          <div className={`text-4xl font-bold ${getHealthScoreColor(analysis.health_score)}`}>
                            {analysis.health_score}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`text-2xl font-bold mb-2 ${analysis.is_healthy ? 'text-green-600' : 'text-red-600'}`}>
                      {analysis.is_healthy ? '✅ Healthy' : '❌ Unhealthy'}
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      Health Score: {analysis.health_score}/100
                    </div>
                  </div>

                  <div className="space-y-4">
                    {imagePreview && (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Analyzed product"
                          className="w-full h-48 object-contain rounded-lg bg-gray-50"
                        />
                        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs">
                          {imageSource === 'camera' ? '📸' : '📁'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Product Details */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Ingredients */}
                {analysis.ingredients && analysis.ingredients.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <span className="text-2xl mr-2">🧪</span>
                      Ingredients Found
                    </h3>
                    <div className="space-y-2">
                      {analysis.ingredients.map((ingredient, index) => (
                        <div
                          key={index}
                          className="flex items-center p-3 bg-blue-50 rounded-lg"
                        >
                          <span className="text-blue-600 text-sm mr-3">•</span>
                          <span className="text-gray-800 capitalize">{ingredient}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nutritional Concerns */}
                {analysis.nutritional_concerns && analysis.nutritional_concerns.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h3 className="text-xl font-bold text-orange-600 mb-4 flex items-center">
                      <span className="text-2xl mr-2">⚠️</span>
                      Nutritional Concerns
                    </h3>
                    <div className="space-y-2">
                      {analysis.nutritional_concerns.map((concern, index) => (
                        <div
                          key={index}
                          className="flex items-center p-3 bg-orange-50 border border-orange-200 rounded-lg"
                        >
                          <span className="text-orange-600 text-lg mr-3">⚠️</span>
                          <span className="text-orange-800 font-medium capitalize">{concern}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Harmful Ingredients */}
              {analysis.harmful_ingredients && analysis.harmful_ingredients.length > 0 && (
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h3 className="text-xl font-bold text-red-600 mb-4 flex items-center">
                    <span className="text-2xl mr-2">🚨</span>
                    Harmful Ingredients Detected
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {analysis.harmful_ingredients.map((ingredient, index) => (
                      <div
                        key={index}
                        className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg"
                      >
                        <span className="text-red-600 text-xl mr-3">🚨</span>
                        <div>
                          <span className="text-red-800 font-medium capitalize">{ingredient}</span>
                          <p className="text-xs text-red-600 mt-1">
                            May cause health concerns
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analysis Details */}
              {analysis.analysis_text && (
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <span className="text-2xl mr-2">📊</span>
                    Detailed Analysis
                  </h3>
                  <div className="prose max-w-none">
                    <p className="text-gray-700 leading-relaxed">{analysis.analysis_text}</p>
                  </div>
                </div>
              )}

              {/* Enhanced Pricing */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-2">💎 Unlock Premium Features</h3>
                  <p className="text-lg mb-6">Get unlimited scans and detailed health reports</p>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white bg-opacity-20 rounded-xl p-6 backdrop-blur-sm">
                      <div className="text-3xl font-bold mb-1">$9</div>
                      <div className="text-sm opacity-90">Monthly</div>
                      <div className="text-xs mt-2 opacity-75">✓ Unlimited scans</div>
                      <div className="text-xs opacity-75">✓ Detailed reports</div>
                    </div>
                    
                    <div className="bg-white bg-opacity-20 rounded-xl p-6 backdrop-blur-sm relative">
                      <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        Save $18
                      </div>
                      <div className="text-3xl font-bold mb-1">$90</div>
                      <div className="text-sm opacity-90">Yearly</div>
                      <div className="text-xs mt-2 opacity-75">✓ Everything in monthly</div>
                      <div className="text-xs opacity-75">✓ Priority support</div>
                    </div>
                  </div>
                  
                  <button className="btn-premium">
                    <span className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      <span>Upgrade Now</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <input
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          ref={fileInputRef}
          className="hidden"
        />
      </div>
    </div>
  );
}

export default App;