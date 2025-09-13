from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import json
import os

app = FastAPI(title="The Prospector API", description="Wild West themed search API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for claims (replace with database later)
claims_storage = []

class Claim(BaseModel):
    id: str
    title: str
    description: str
    source: str
    link: str
    query: str
    timestamp: str

class SearchResult(BaseModel):
    title: str
    description: str
    link: str
    source: str

# Dummy data for testing
DUMMY_GAMER_RESULTS = [
    {
        "title": "Hidden Indie Gem: Crystal Caves",
        "description": "A mesmerizing puzzle-platformer with hand-drawn art. Explore underground caverns filled with mystical crystals.",
        "link": "https://itch.io/crystal-caves",
        "source": "Itch.io"
    },
    {
        "title": "Rare Steam Key: Retro Racing Championship",
        "description": "Limited edition racing game with only 1000 copies released. Features classic 80s synthwave soundtrack.",
        "link": "https://steamcommunity.com/retro-racing",
        "source": "Steam Community"
    },
    {
        "title": "Speedrun Community: Pixel Quest Masters",
        "description": "Active speedrunning community for the cult classic Pixel Quest. Weekly tournaments and strategy guides.",
        "link": "https://reddit.com/r/pixelquest",
        "source": "Reddit"
    },
    {
        "title": "Beta Access: Neon Knights VR",
        "description": "Exclusive beta testing opportunity for upcoming cyberpunk VR adventure. Apply before slots fill up!",
        "link": "https://discord.gg/neonknights",
        "source": "Discord"
    }
]

DUMMY_HOBBYIST_RESULTS = [
    {
        "title": "Artisan Leather Working Kit",
        "description": "Complete starter set with premium tools and exotic leather samples. Perfect for crafting wallets and belts.",
        "link": "https://etsy.com/leather-kit",
        "source": "Etsy"
    },
    {
        "title": "Woodworking Workshop: Japanese Joinery",
        "description": "Learn traditional Japanese woodworking techniques. Master craftsman teaches 300-year-old methods.",
        "link": "https://eventbrite.com/japanese-joinery",
        "source": "Eventbrite"
    },
    {
        "title": "Rare Succulent Seeds Collection",
        "description": "Exotic succulent varieties from South Africa. Includes growing guide and soil mix recommendations.",
        "link": "https://rareplants.shop/succulents",
        "source": "Specialty Shop"
    },
    {
        "title": "Blacksmithing Tutorial Series",
        "description": "Complete video course on traditional blacksmithing. From basic tools to advanced decorative techniques.",
        "link": "https://youtube.com/blacksmith-master",
        "source": "YouTube"
    }
]

@app.get("/")
async def root():
    return {"message": "Welcome to The Prospector API! ⛏️ Ready to strike gold?"}

@app.get("/search/gamers", response_model=List[SearchResult])
async def search_gamers(query: str):
    """
    Search for gaming-related treasures
    
    TODO: Integrate real scrapers for:
    - Itch.io API for indie games
    - Steam Community API for rare items
    - Reddit API for gaming communities
    - Discord webhooks for beta access
    """
    if not query:
        raise HTTPException(status_code=400, detail="Query parameter is required")
    
    # Filter dummy results based on query (simple keyword matching)
    filtered_results = [
        result for result in DUMMY_GAMER_RESULTS 
        if query.lower() in result["title"].lower() or query.lower() in result["description"].lower()
    ]
    
    # If no matches, return all results for demo purposes
    if not filtered_results:
        filtered_results = DUMMY_GAMER_RESULTS
    
    return filtered_results

@app.get("/search/hobbyists", response_model=List[SearchResult])
async def search_hobbyists(query: str):
    """
    Search for hobbyist-related treasures
    
    TODO: Integrate real scrapers for:
    - Etsy API for unique supplies
    - Eventbrite API for workshops
    - YouTube API for tutorials
    - Pinterest API for DIY projects
    """
    if not query:
        raise HTTPException(status_code=400, detail="Query parameter is required")
    
    # Filter dummy results based on query
    filtered_results = [
        result for result in DUMMY_HOBBYIST_RESULTS 
        if query.lower() in result["title"].lower() or query.lower() in result["description"].lower()
    ]
    
    # If no matches, return all results for demo purposes
    if not filtered_results:
        filtered_results = DUMMY_HOBBYIST_RESULTS
    
    return filtered_results

@app.get("/claims", response_model=List[Claim])
async def get_claims():
    """Get all saved claims"""
    return claims_storage

@app.post("/claims", response_model=Claim)
async def create_claim(claim: Claim):
    """Save a new claim"""
    # TODO: Replace with database storage (SQLite, PostgreSQL, etc.)
    claims_storage.append(claim.dict())
    return claim

@app.delete("/claims/{claim_id}")
async def delete_claim(claim_id: str):
    """Delete a claim by ID"""
    global claims_storage
    claims_storage = [claim for claim in claims_storage if claim["id"] != claim_id]
    return {"message": f"Claim {claim_id} deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
