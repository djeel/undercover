"""Word and theme management service."""
import random
from typing import List, Optional

from ..data.seed_words import get_all_localized_pairs
from ..models.schemas import ThemeResponse, ThemeListResponse
from ..models.game import ThemeDocument, WordPairData, WordPairDocument


class WordService:
    """Service for managing word pairs and themes."""
    
    @staticmethod
    def get_themes() -> ThemeListResponse:
        """Get all available themes."""
        # For now we only have a general list, so return empty or a "General" theme
        return ThemeListResponse(
            themes=[
                ThemeResponse(theme_id="general", name="General")
            ]
        )
    
    @staticmethod
    def generate_word_pair(theme_id: Optional[str] = None, language: str = 'en') -> WordPairDocument:
        """Generate a random word pair from a theme.
        
        Args:
            theme_id: Specific theme to use (ignored for now as we have one big list).
            language: Language code ('en', 'fr'). Default 'en'.
            
        Returns:
            WordPairDocument ready for game use in the requested language.
        """
        all_pairs = get_all_localized_pairs()
        
        # Pick random pair
        pair_data = random.choice(all_pairs)
        
        # Select language
        lang = language.lower()
        if lang.startswith('fr'):
            words = pair_data.fr
        else:
            words = pair_data.en
            
        return WordPairDocument(
            pair_id=pair_data.id,
            theme_id="general",
            civilian_word=words[0],
            undercover_word=words[1],
        )
