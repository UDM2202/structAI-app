from fastapi import APIRouter, HTTPException
import json
import os

router = APIRouter()

@router.get("/{region}")
async def get_rates(region: str):
    """
    Get material rates for a specific region.
    """
    rates_path = os.path.join(os.path.dirname(__file__), '..', 'engine', 'rates_db.json')
    
    try:
        with open(rates_path, 'r') as f:
            rates_db = json.load(f)
        
        if region in rates_db:
            return {"region": region, "rates": rates_db[region]}
        else:
            return {"region": region, "rates": rates_db.get("UK", {}), "note": "Region not found, using UK defaults"}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Rates database not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def list_regions():
    """
    List available regions.
    """
    rates_path = os.path.join(os.path.dirname(__file__), '..', 'engine', 'rates_db.json')
    
    try:
        with open(rates_path, 'r') as f:
            rates_db = json.load(f)
        return {"regions": list(rates_db.keys())}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))