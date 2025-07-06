from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
import asyncio
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class ProductAnalysis(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    image_base64: str
    ingredients: List[str] = []
    harmful_ingredients: List[str] = []
    nutritional_concerns: List[str] = []
    health_score: int = Field(ge=0, le=100)  # 0-100 scale
    is_healthy: bool
    analysis_text: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ProductAnalysisCreate(BaseModel):
    image_base64: str

class ProductAnalysisResponse(BaseModel):
    id: str
    ingredients: List[str]
    harmful_ingredients: List[str]
    nutritional_concerns: List[str]
    health_score: int
    is_healthy: bool
    analysis_text: str
    timestamp: datetime

# Health assessment criteria
HARMFUL_INGREDIENTS = {
    "artificial preservatives": ["sodium benzoate", "potassium sorbate", "bha", "bht", "tbhq"],
    "trans fats": ["partially hydrogenated", "hydrogenated oil", "trans fat"],
    "high sodium": ["sodium", "salt", "monosodium glutamate", "msg"],
    "artificial colors": ["red 40", "yellow 5", "blue 1", "red 3", "yellow 6", "blue 2"],
    "artificial sweeteners": ["aspartame", "sucralose", "saccharin", "acesulfame potassium"],
    "e-numbers": ["e102", "e110", "e122", "e124", "e129", "e132", "e133", "e151", "e155"],
    "nitrates": ["sodium nitrate", "sodium nitrite", "potassium nitrate", "potassium nitrite"],
    "high fructose corn syrup": ["high fructose corn syrup", "hfcs", "corn syrup"]
}

NUTRITIONAL_CONCERNS = {
    "high sugar": ["sugar", "glucose", "fructose", "corn syrup", "dextrose", "sucrose"],
    "high calories": ["calories", "kcal", "energy"],
    "high saturated fat": ["saturated fat", "palm oil", "coconut oil"],
    "processed ingredients": ["modified", "concentrate", "isolate", "extract"]
}

async def analyze_product_with_gemini(image_base64: str) -> Dict[str, Any]:
    """Analyze product image using Google Gemini"""
    try:
        # Initialize Gemini chat
        chat = LlmChat(
            api_key=os.environ.get('GEMINI_API_KEY'),
            session_id=f"product-analysis-{uuid.uuid4()}",
            system_message="You are an expert nutritionist and ingredient analyst. Analyze product images to extract ingredient lists and provide health assessments. Return your response in JSON format with the following structure: {\"ingredients\": [\"ingredient1\", \"ingredient2\"], \"nutritional_info\": {\"calories\": \"value\", \"sugar\": \"value\", \"sodium\": \"value\"}, \"analysis\": \"detailed health analysis text\"}"
        ).with_model("gemini", "gemini-2.0-flash")

        # Create image content
        image_content = ImageContent(image_base64=image_base64)

        # Create analysis prompt
        user_message = UserMessage(
            text="Analyze this product backside image and provide: 1) Complete ingredient list, 2) Nutritional information (calories, sugar, sodium, fat content), 3) Health assessment focusing on harmful ingredients like artificial preservatives, trans fats, high sodium, artificial colors, E-numbers, and nutritional concerns. Please be thorough and accurate. Return the response in JSON format.",
            file_contents=[image_content]
        )

        # Get analysis from Gemini
        response = await chat.send_message(user_message)
        
        # Try to parse JSON response
        try:
            analysis_data = json.loads(response)
        except json.JSONDecodeError:
            # If not JSON, create structured response from text
            analysis_data = {
                "ingredients": [],
                "nutritional_info": {},
                "analysis": response
            }

        return analysis_data

    except Exception as e:
        logger.error(f"Error analyzing product with Gemini: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze product: {str(e)}")

def assess_product_health(ingredients: List[str], nutritional_info: Dict, analysis_text: str) -> Dict[str, Any]:
    """Assess product health based on ingredients and nutritional information"""
    harmful_found = []
    nutritional_concerns = []
    health_score = 100
    
    # Convert ingredients to lowercase for comparison
    ingredients_lower = [ing.lower() for ing in ingredients]
    analysis_lower = analysis_text.lower()
    
    # Check for harmful ingredients
    for category, items in HARMFUL_INGREDIENTS.items():
        for item in items:
            if any(item in ing for ing in ingredients_lower) or item in analysis_lower:
                harmful_found.append(item)
                health_score -= 10
    
    # Check for nutritional concerns
    for category, items in NUTRITIONAL_CONCERNS.items():
        for item in items:
            if any(item in ing for ing in ingredients_lower) or item in analysis_lower:
                nutritional_concerns.append(category)
                health_score -= 5
    
    # Ensure health score doesn't go below 0
    health_score = max(0, health_score)
    
    # Product is healthy if score is above 70
    is_healthy = health_score >= 70
    
    return {
        "harmful_ingredients": list(set(harmful_found)),
        "nutritional_concerns": list(set(nutritional_concerns)),
        "health_score": health_score,
        "is_healthy": is_healthy
    }

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "AI Product Health Analyzer API"}

@api_router.post("/analyze-product", response_model=ProductAnalysisResponse)
async def analyze_product(product_data: ProductAnalysisCreate):
    """Analyze product image to determine health status"""
    try:
        # Analyze product with Gemini
        analysis_data = await analyze_product_with_gemini(product_data.image_base64)
        
        # Extract ingredients and analysis
        ingredients = analysis_data.get("ingredients", [])
        nutritional_info = analysis_data.get("nutritional_info", {})
        analysis_text = analysis_data.get("analysis", "")
        
        # Assess product health
        health_assessment = assess_product_health(ingredients, nutritional_info, analysis_text)
        
        # Create product analysis object
        product_analysis = ProductAnalysis(
            image_base64=product_data.image_base64,
            ingredients=ingredients,
            harmful_ingredients=health_assessment["harmful_ingredients"],
            nutritional_concerns=health_assessment["nutritional_concerns"],
            health_score=health_assessment["health_score"],
            is_healthy=health_assessment["is_healthy"],
            analysis_text=analysis_text
        )
        
        # Save to database
        await db.product_analyses.insert_one(product_analysis.dict())
        
        # Return response
        return ProductAnalysisResponse(
            id=product_analysis.id,
            ingredients=product_analysis.ingredients,
            harmful_ingredients=product_analysis.harmful_ingredients,
            nutritional_concerns=product_analysis.nutritional_concerns,
            health_score=product_analysis.health_score,
            is_healthy=product_analysis.is_healthy,
            analysis_text=product_analysis.analysis_text,
            timestamp=product_analysis.timestamp
        )
        
    except Exception as e:
        logger.error(f"Error analyzing product: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze product: {str(e)}")

@api_router.get("/analysis-history", response_model=List[ProductAnalysisResponse])
async def get_analysis_history():
    """Get analysis history"""
    try:
        analyses = await db.product_analyses.find().sort("timestamp", -1).limit(50).to_list(50)
        return [ProductAnalysisResponse(**analysis) for analysis in analyses]
    except Exception as e:
        logger.error(f"Error getting analysis history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get analysis history: {str(e)}")

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()