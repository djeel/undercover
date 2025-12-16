"""Seed data for word pairs organized by theme.

Language-agnostic: Keys can be used for localization.
"""
from typing import Dict, List
from ..models.game import ThemeDocument, WordPairData

# ============================================================================
# Word Pairs by Theme
# ============================================================================

THEMES: Dict[str, ThemeDocument] = {
    "beverages": ThemeDocument(
        theme_id="beverages",
        name="beverages",  # Localization key
        pairs=[
            WordPairData(pair_id="bev_1", civilian="beer", undercover="wine"),
            WordPairData(pair_id="bev_2", civilian="coffee", undercover="tea"),
            WordPairData(pair_id="bev_3", civilian="cola", undercover="pepsi"),
            WordPairData(pair_id="bev_4", civilian="juice", undercover="smoothie"),
            WordPairData(pair_id="bev_5", civilian="water", undercover="sparkling_water"),
        ]
    ),
    "animals": ThemeDocument(
        theme_id="animals",
        name="animals",
        pairs=[
            WordPairData(pair_id="ani_1", civilian="cat", undercover="dog"),
            WordPairData(pair_id="ani_2", civilian="lion", undercover="tiger"),
            WordPairData(pair_id="ani_3", civilian="rabbit", undercover="hamster"),
            WordPairData(pair_id="ani_4", civilian="eagle", undercover="hawk"),
            WordPairData(pair_id="ani_5", civilian="dolphin", undercover="whale"),
        ]
    ),
    "tech": ThemeDocument(
        theme_id="tech",
        name="tech",
        pairs=[
            WordPairData(pair_id="tech_1", civilian="iphone", undercover="android"),
            WordPairData(pair_id="tech_2", civilian="facebook", undercover="twitter"),
            WordPairData(pair_id="tech_3", civilian="laptop", undercover="tablet"),
            WordPairData(pair_id="tech_4", civilian="netflix", undercover="youtube"),
            WordPairData(pair_id="tech_5", civilian="google", undercover="bing"),
        ]
    ),
    "nature": ThemeDocument(
        theme_id="nature",
        name="nature",
        pairs=[
            WordPairData(pair_id="nat_1", civilian="sun", undercover="moon"),
            WordPairData(pair_id="nat_2", civilian="ocean", undercover="lake"),
            WordPairData(pair_id="nat_3", civilian="mountain", undercover="hill"),
            WordPairData(pair_id="nat_4", civilian="forest", undercover="jungle"),
            WordPairData(pair_id="nat_5", civilian="river", undercover="stream"),
        ]
    ),
    "music": ThemeDocument(
        theme_id="music",
        name="music",
        pairs=[
            WordPairData(pair_id="mus_1", civilian="guitar", undercover="violin"),
            WordPairData(pair_id="mus_2", civilian="piano", undercover="keyboard"),
            WordPairData(pair_id="mus_3", civilian="drums", undercover="percussion"),
            WordPairData(pair_id="mus_4", civilian="rock", undercover="metal"),
            WordPairData(pair_id="mus_5", civilian="jazz", undercover="blues"),
        ]
    ),
    "sports": ThemeDocument(
        theme_id="sports",
        name="sports",
        pairs=[
            WordPairData(pair_id="spo_1", civilian="soccer", undercover="basketball"),
            WordPairData(pair_id="spo_2", civilian="tennis", undercover="badminton"),
            WordPairData(pair_id="spo_3", civilian="swimming", undercover="diving"),
            WordPairData(pair_id="spo_4", civilian="running", undercover="jogging"),
            WordPairData(pair_id="spo_5", civilian="skiing", undercover="snowboarding"),
        ]
    ),
    "food": ThemeDocument(
        theme_id="food",
        name="food",
        pairs=[
            WordPairData(pair_id="food_1", civilian="pizza", undercover="pasta"),
            WordPairData(pair_id="food_2", civilian="burger", undercover="sandwich"),
            WordPairData(pair_id="food_3", civilian="sushi", undercover="sashimi"),
            WordPairData(pair_id="food_4", civilian="ice_cream", undercover="frozen_yogurt"),
            WordPairData(pair_id="food_5", civilian="cake", undercover="pie"),
        ]
    ),
}


def get_all_themes() -> List[ThemeDocument]:
    """Get all available themes."""
    return list(THEMES.values())


def get_theme(theme_id: str) -> ThemeDocument | None:
    """Get a specific theme by ID."""
    return THEMES.get(theme_id)


def get_random_theme() -> ThemeDocument:
    """Get a random theme."""
    import random
    return random.choice(list(THEMES.values()))
