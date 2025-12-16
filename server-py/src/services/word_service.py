"""Word and theme management service."""
import random
from typing import List, Optional

from ..data.seed_words import get_all_themes, get_theme, get_random_theme
from ..models.schemas import ThemeResponse, ThemeListResponse
from ..models.game import ThemeDocument, WordPairData, WordPairDocument


class WordService:
    """Service for managing word pairs and themes."""
    
    @staticmethod
    def get_themes() -> ThemeListResponse:
        """Get all available themes."""
        themes = get_all_themes()
        return ThemeListResponse(
            themes=[
                ThemeResponse(theme_id=t.theme_id, name=t.name)
                for t in themes
            ]
        )
    
    @staticmethod
    def generate_word_pair(theme_id: Optional[str] = None) -> WordPairDocument:
        """Generate a random word pair from a theme.
        
        Args:
            theme_id: Specific theme to use, or None for random.
            
        Returns:
            WordPairDocument ready for game use.
            
        Raises:
            ValueError: If theme_id is invalid.
        """
        # Get theme
        if theme_id:
            theme = get_theme(theme_id)
            if not theme:
                raise ValueError(f"Unknown theme: {theme_id}")
        else:
            theme = get_random_theme()
        
        # Pick random pair from theme
        pair: WordPairData = random.choice(theme.pairs)
        
        return WordPairDocument(
            pair_id=pair.pair_id,
            theme_id=theme.theme_id,
            civilian_word=pair.civilian,
            undercover_word=pair.undercover,
        )
