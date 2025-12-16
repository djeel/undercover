"""Word-related API routes."""
from fastapi import APIRouter, HTTPException

from ..models.schemas import (
    ThemeListResponse,
    GenerateWordRequest,
    WordPairResponse,
)
from ..services.word_service import WordService


router = APIRouter(prefix="/words", tags=["words"])


@router.get("/themes", response_model=ThemeListResponse)
async def get_themes():
    """Get all available word themes.
    
    Returns list of theme IDs and names for UI selection.
    """
    return WordService.get_themes()


@router.post("/generate", response_model=WordPairResponse)
async def generate_word_pair(request: GenerateWordRequest):
    """Generate a random word pair from a theme.
    
    This is primarily for preview/testing. In normal game flow,
    word pairs are generated during game creation.
    
    NOTE: Returns pair_id and theme_id only, NOT the actual words.
    """
    try:
        word_pair = WordService.generate_word_pair(request.theme_id)
        return WordPairResponse(
            pair_id=word_pair.pair_id,
            theme_id=word_pair.theme_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
