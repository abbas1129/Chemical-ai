import React, { useState, useRef } from "react";
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
  const fileInputRef = useRef(null);

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedImage(file);
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
        // Remove data:image/jpeg;base64, prefix
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
      // Convert image to base64
      const base64Image = await convertToBase64(selectedImage);
      
      // Send to backend for analysis
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🔍 AI Product Health Analyzer
          </h1>
          <p className="text-lg text-gray-600">
            Upload a product backside image to analyze ingredients and health impact
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {!analysis ? (
            /* Upload Section */
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-6">
                  {imagePreview ? (
                    <div className="space-y-4">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="max-w-full h-64 object-contain mx-auto rounded-lg"
                      />
                      <p className="text-sm text-gray-600">
                        Product image ready for analysis
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-6xl">📸</div>
                      <p className="text-xl text-gray-600">
                        Select a product backside image
                      </p>
                      <p className="text-sm text-gray-500">
                        Supported formats: JPG, PNG, GIF
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {selectedImage ? 'Change Image' : 'Select Image'}
                    </button>
                    
                    {selectedImage && (
                      <button
                        onClick={analyzeProduct}
                        disabled={loading}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Analyzing...' : 'Analyze Product'}
                      </button>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg">
                    <p className="text-red-700">{error}</p>
                  </div>
                )}

                {loading && (
                  <div className="mt-4 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600 mt-2">Analyzing product ingredients...</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Results Section */
            <div className="space-y-6">
              {/* Health Score Card */}
              <div className={`bg-white rounded-lg shadow-lg p-6 border-2 ${getHealthScoreBg(analysis.health_score)}`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">Health Analysis</h2>
                  <button
                    onClick={resetAnalysis}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Analyze New Product
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className={`text-6xl font-bold ${getHealthScoreColor(analysis.health_score)}`}>
                        {analysis.health_score}
                      </div>
                      <div className="text-lg text-gray-600">Health Score</div>
                    </div>
                    
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${analysis.is_healthy ? 'text-green-600' : 'text-red-600'}`}>
                        {analysis.is_healthy ? '✅ Healthy' : '❌ Unhealthy'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {imagePreview && (
                      <img
                        src={imagePreview}
                        alt="Analyzed product"
                        className="w-full h-48 object-contain rounded-lg bg-gray-50"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Ingredients */}
              {analysis.ingredients && analysis.ingredients.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">📝 Ingredients Found</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.ingredients.map((ingredient, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {ingredient}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Harmful Ingredients */}
              {analysis.harmful_ingredients && analysis.harmful_ingredients.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-xl font-bold text-red-600 mb-4">⚠️ Harmful Ingredients</h3>
                  <div className="space-y-2">
                    {analysis.harmful_ingredients.map((ingredient, index) => (
                      <div
                        key={index}
                        className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg"
                      >
                        <span className="text-red-600 text-lg mr-3">⚠️</span>
                        <span className="text-red-800 font-medium">{ingredient}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nutritional Concerns */}
              {analysis.nutritional_concerns && analysis.nutritional_concerns.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-xl font-bold text-orange-600 mb-4">🍎 Nutritional Concerns</h3>
                  <div className="space-y-2">
                    {analysis.nutritional_concerns.map((concern, index) => (
                      <div
                        key={index}
                        className="flex items-center p-3 bg-orange-50 border border-orange-200 rounded-lg"
                      >
                        <span className="text-orange-600 text-lg mr-3">🍎</span>
                        <span className="text-orange-800 font-medium capitalize">{concern}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analysis Details */}
              {analysis.analysis_text && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">📊 Detailed Analysis</h3>
                  <div className="prose max-w-none">
                    <p className="text-gray-700 leading-relaxed">{analysis.analysis_text}</p>
                  </div>
                </div>
              )}

              {/* Pricing Banner */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-2">💎 Unlock Premium Features</h3>
                  <p className="text-lg mb-4">Get unlimited analyses and detailed nutritional reports</p>
                  <div className="flex justify-center space-x-4">
                    <div className="bg-white bg-opacity-20 rounded-lg p-4">
                      <div className="text-2xl font-bold">$9</div>
                      <div className="text-sm">per month</div>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-lg p-4">
                      <div className="text-2xl font-bold">$90</div>
                      <div className="text-sm">per year</div>
                      <div className="text-xs text-green-200">Save $18</div>
                    </div>
                  </div>
                  <button className="mt-4 px-8 py-3 bg-white text-purple-600 rounded-lg font-bold hover:bg-gray-100 transition-colors">
                    Upgrade Now
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;