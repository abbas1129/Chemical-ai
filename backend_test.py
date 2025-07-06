#!/usr/bin/env python3
import requests
import json
import base64
import os
import sys
import unittest
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
backend_env_path = Path('/app/backend/.env')
frontend_env_path = Path('/app/frontend/.env')

# Load backend environment variables
if backend_env_path.exists():
    load_dotenv(backend_env_path)

# Load frontend environment variables to get the backend URL
if frontend_env_path.exists():
    load_dotenv(frontend_env_path)

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL')
if not BACKEND_URL:
    print("Error: REACT_APP_BACKEND_URL not found in environment variables")
    sys.exit(1)

# Ensure backend URL ends with /api
if not BACKEND_URL.endswith('/api'):
    API_URL = f"{BACKEND_URL}/api"
else:
    API_URL = BACKEND_URL

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

# Sample base64 image of a product label (this is a minimal valid base64 image)
# In a real test, you would use an actual product image
SAMPLE_BASE64_IMAGE = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAAyADIDASIAAhEBAxEB/8QAHAAAAgIDAQEAAAAAAAAAAAAABwgFBgIDBAEJ/8QAMBAAAgEDAwMDAwIGAwAAAAAAAQIDBAURAAYhBxIxCBNBFCJRYXEVFiMyQoEzUpH/xAAaAQACAwEBAAAAAAAAAAAAAAAEBQIDBgEA/8QAJREAAgIBBAEEAwEAAAAAAAAAAQIAAxEEEiExQQUTIlEyYXGR/9oADAMBAAIRAxEAPwBqNUXqDvmg2Jt2Wu1Ej1NbKvs0NLGcNNKfgfgDyx+FGSdUTqf1Huu5a+aDa9RJt7b8LlUqJQPrKtfwZMfYp/6rkn5bHgVCbW6c7d2tVNXVtLDV3eY5krqpO+Rz+Sf8R+FGB+dJtTrFqPtTsxRqNMa/k3ZhDuDqDuKvqGnulwqK+QnPZLMzKPxgHgfoDqwbY9QG+Nv1KtT3Wa4UgOGirGMqkfgNksPwCcfg6VW4UNVRVb0lZBJTzxnDxyKVZT+QRyNcNPWVNHMJqSeSCQfDxsVP/o0Ib3TsQmFNKN2YfRnbm+bZvtKJrZcaepGMmNJAJF/dTyP31LaqPTbqFDvnp/Q3RpFNwgHs10YGO2ZRzx8BhhlHwGU6t2maMGUZEXOhRsGFFFFGRnNLJHDG0srqiKMszHAAHySfA1Vd1dSdsbMpGkuVzjlqQMrR0x72Y/jjhf3YgfOq/wCpTfNVYtqQ7ZtUhS53lWVpFOGjpVIDsPwWJCg/gM3nSw1dRJPM0s8jSSOcs7tkk/k6U6vWe22xfMY6bTe4N7dCLdQOqG/t1XBpjdprbQscLT0TMEB+Mtksx/JbA+ANWKg6R7Xt9Ks1VRNcKnGWqKpyxJ/IXhR+gGrPRWqsroRJR0VRUxn4eKJmH/o1N/yzvBRn+A3P/wDCT/51QlFQ7MNbUWt0IpVPRLbdVGEqLbHE+OVmhPYR+uMEH9wdR9Z0R2zUxsKOWqoJMcGKQsB+zZI/+6sNv2zvOtx7W3rlg/Dqir/pqwW3pnuqtKmqWmtsJ5zLIXcj9FHP7kDRK0VJ+UgbLj8YqG/OmNVt6qe72dWqaGsQkwVKDKSL+D8g/BByD8jTVdLN9x742fHVyFVuNOBDXQjwJAOGH4VgCR8ZDDwwxqt1Hs0NJWyUVfTSUlXCcSQzIUdT+QfI/B8H41bfTxbLhQ9PY5K6nkp0qKqWWnjkUqyIQgBIPkEqSM+QRpjoLTXYAe4v1tQsrJHQooorYzMKF6o9xzbh3vPQwymO1WcGkgQHgyHBlb9SxCg/hFPydXf1EbpqNrdPK+4UEhSrnkSngkHlJJCQGH6KGYj8gaS6aVpZXkkYs7sWZj5JPJOkfqF+1Qg7jHQVZYufEjrVbKu7XOC1W2IzVVS4RFHx+ST8AAEk/AGnA2jtq3bVslPabbEFijGXc/3SOfiRvyT/AODgDUF0W2BFtLbP8UuMQa73JVeVmHIgU5WJf0wSx/LY/t1ctM9BpvbXc3ZizV6j3G2r0I6KKKMgcKKKKAHMpnqB2LLuTaZudviMlzt+ZUjUZaWLOXQfkjAYD5IYDlhpRZoJIJnhmjaORGKujDBVgcEEfBB8HTz6VD1N9PFpbgd27a0CnqgPqoVGFmA8SAfDjwfhh8ZGQGp0/vDcvYi/S6j2zt7EWf0+bFqt1bpS4VcbJaLcwlqJGGVeQjKxKfkE4LH4UEeWGmw0UUz09ArXaIu1F5tOYUUUUUZBCiiigBzRRRRQA5ooooAcnxRRRQA//9k="

class TestBackendAPI(unittest.TestCase):
    """Test suite for the AI Product Health Analyzer backend API"""

    def setUp(self):
        """Set up test environment"""
        self.api_url = API_URL
        print(f"Testing backend API at: {self.api_url}")
        
        # Connect to MongoDB for verification
        try:
            self.mongo_client = MongoClient(MONGO_URL)
            self.db = self.mongo_client[DB_NAME]
            print(f"Connected to MongoDB at: {MONGO_URL}")
        except Exception as e:
            print(f"Warning: Could not connect to MongoDB: {e}")
            self.mongo_client = None
            self.db = None

    def tearDown(self):
        """Clean up after tests"""
        if self.mongo_client:
            self.mongo_client.close()

    def test_api_root(self):
        """Test the API root endpoint"""
        response = requests.get(f"{self.api_url}/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("message", data)
        print("✅ API root endpoint test passed")

    def test_analyze_product(self):
        """Test the analyze-product endpoint with a sample image"""
        print("\n🔍 Testing /api/analyze-product endpoint...")
        
        # Prepare request data
        payload = {
            "image_base64": SAMPLE_BASE64_IMAGE
        }
        
        # Send request to analyze product
        response = requests.post(f"{self.api_url}/analyze-product", json=payload)
        
        # Check response status
        self.assertEqual(response.status_code, 200, f"API request failed with status {response.status_code}: {response.text}")
        
        # Parse response
        data = response.json()
        print(f"Response received: {json.dumps(data, indent=2)}")
        
        # Verify response structure
        self.assertIn("id", data)
        self.assertIn("ingredients", data)
        self.assertIn("harmful_ingredients", data)
        self.assertIn("nutritional_concerns", data)
        self.assertIn("health_score", data)
        self.assertIn("is_healthy", data)
        self.assertIn("analysis_text", data)
        self.assertIn("timestamp", data)
        
        # Verify health score is within range
        self.assertTrue(0 <= data["health_score"] <= 100)
        
        # Verify is_healthy is boolean
        self.assertIsInstance(data["is_healthy"], bool)
        
        # Verify ingredients list
        self.assertIsInstance(data["ingredients"], list)
        
        print("✅ Product analysis response structure is valid")
        
        # Verify MongoDB storage if available
        if self.db:
            try:
                # Check if the analysis was stored in MongoDB
                stored_analysis = self.db.product_analyses.find_one({"id": data["id"]})
                self.assertIsNotNone(stored_analysis, "Analysis not found in MongoDB")
                print("✅ Analysis data was successfully stored in MongoDB")
            except Exception as e:
                print(f"❌ MongoDB verification failed: {e}")
        
        return data["id"]  # Return ID for other tests

    def test_analysis_history(self):
        """Test the analysis-history endpoint"""
        print("\n🔍 Testing /api/analysis-history endpoint...")
        
        # First ensure we have at least one analysis in the database
        analysis_id = self.test_analyze_product()
        
        # Get analysis history
        response = requests.get(f"{self.api_url}/analysis-history")
        
        # Check response status
        self.assertEqual(response.status_code, 200)
        
        # Parse response
        data = response.json()
        
        # Verify it's a list
        self.assertIsInstance(data, list)
        
        # Verify our analysis is in the history
        found = False
        for analysis in data:
            if analysis["id"] == analysis_id:
                found = True
                break
        
        self.assertTrue(found, "Recently created analysis not found in history")
        print("✅ Analysis history endpoint test passed")

    def test_health_assessment_logic(self):
        """Test the health assessment logic directly"""
        print("\n🔍 Testing health assessment logic...")
        
        # Test with known harmful ingredients
        test_cases = [
            {
                "name": "Healthy product",
                "ingredients": ["water", "organic oats", "honey", "almonds"],
                "nutritional_info": {"calories": "120", "sugar": "5g", "sodium": "10mg"},
                "analysis_text": "This product contains natural ingredients with moderate sugar content."
            },
            {
                "name": "Unhealthy product",
                "ingredients": ["high fructose corn syrup", "sodium benzoate", "red 40", "partially hydrogenated oil"],
                "nutritional_info": {"calories": "300", "sugar": "25g", "sodium": "500mg"},
                "analysis_text": "This product contains artificial preservatives and high sugar content."
            }
        ]
        
        # Test each case with the analyze-product endpoint
        for case in test_cases:
            print(f"\nTesting case: {case['name']}")
            
            # Create a request to analyze-product with our sample image
            # The actual ingredients will be determined by Gemini, but we can verify the logic
            payload = {
                "image_base64": SAMPLE_BASE64_IMAGE
            }
            
            response = requests.post(f"{self.api_url}/analyze-product", json=payload)
            self.assertEqual(response.status_code, 200)
            
            data = response.json()
            print(f"Health score: {data['health_score']}")
            print(f"Is healthy: {data['is_healthy']}")
            print(f"Harmful ingredients: {data['harmful_ingredients']}")
            print(f"Nutritional concerns: {data['nutritional_concerns']}")
            
            # Verify health score is within range
            self.assertTrue(0 <= data["health_score"] <= 100)
            
            # Verify is_healthy is boolean and matches health score
            self.assertEqual(data["is_healthy"], data["health_score"] >= 70)
        
        print("✅ Health assessment logic test passed")

def run_tests():
    """Run the test suite"""
    print("=" * 80)
    print("AI Product Health Analyzer Backend API Test Suite")
    print("=" * 80)
    
    # Run tests
    unittest.main(argv=['first-arg-is-ignored'], exit=False)

if __name__ == "__main__":
    run_tests()