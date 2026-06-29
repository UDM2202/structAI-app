from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import slab, rates
from routers import beam 
from routers import continuous_beam
import uvicorn
from routers import continuous_slab


app = FastAPI(
    title="StructAI Design Engine",
    description="AI-driven structural design optimization for reinforced concrete slabs",
    version="1.0.0"
)

# CORS - Allow React frontend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "https://struct-ai-app.vercel.app/"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(slab.router, prefix="/api/slab", tags=["Slab Design"])
app.include_router(rates.router, prefix="/api/rates", tags=["Material Rates"])
app.include_router(beam.router, prefix="/api/beam")
app.include_router(continuous_beam.router, prefix="/api/continuous-beam")
app.include_router(continuous_slab.router, prefix="/api/continuous-slab")

@app.get("/")
async def root():
    return {
        "status": "running",
        "app": "StructAI Design Engine",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)