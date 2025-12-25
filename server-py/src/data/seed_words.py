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
            WordPairData(pair_id="bev_1", civilian="Beer", undercover="Wine"),
            WordPairData(pair_id="bev_2", civilian="Coffee", undercover="Tea"),
            WordPairData(pair_id="bev_3", civilian="Cola", undercover="Pepsi"),
            WordPairData(pair_id="bev_4", civilian="Juice", undercover="Smoothie"),
            WordPairData(pair_id="bev_5", civilian="Water", undercover="Sparkling Water"),
        ]
    ),
    "animals": ThemeDocument(
        theme_id="animals",
        name="animals",
        pairs=[
            WordPairData(pair_id="ani_1", civilian="Cat", undercover="Dog"),
            WordPairData(pair_id="ani_2", civilian="Lion", undercover="Tiger"),
            WordPairData(pair_id="ani_3", civilian="Rabbit", undercover="Hamster"),
            WordPairData(pair_id="ani_4", civilian="Eagle", undercover="Hawk"),
            WordPairData(pair_id="ani_5", civilian="Dolphin", undercover="Whale"),
        ]
    ),
    "tech": ThemeDocument(
        theme_id="tech",
        name="tech",
        pairs=[
            WordPairData(pair_id="tech_1", civilian="Iphone", undercover="Android"),
            WordPairData(pair_id="tech_2", civilian="Facebook", undercover="Twitter"),
            WordPairData(pair_id="tech_3", civilian="Laptop", undercover="Tablet"),
            WordPairData(pair_id="tech_4", civilian="Netflix", undercover="Youtube"),
            WordPairData(pair_id="tech_5", civilian="Google", undercover="Bing"),
        ]
    ),
    "nature": ThemeDocument(
        theme_id="nature",
        name="nature",
        pairs=[
            WordPairData(pair_id="nat_1", civilian="Sun", undercover="Moon"),
            WordPairData(pair_id="nat_2", civilian="Ocean", undercover="Lake"),
            WordPairData(pair_id="nat_3", civilian="Mountain", undercover="Hill"),
            WordPairData(pair_id="nat_4", civilian="Forest", undercover="Jungle"),
            WordPairData(pair_id="nat_5", civilian="River", undercover="Stream"),
        ]
    ),
    "music": ThemeDocument(
        theme_id="music",
        name="music",
        pairs=[
            WordPairData(pair_id="mus_1", civilian="Guitar", undercover="Violin"),
            WordPairData(pair_id="mus_2", civilian="Piano", undercover="Keyboard"),
            WordPairData(pair_id="mus_3", civilian="Drums", undercover="Percussion"),
            WordPairData(pair_id="mus_4", civilian="Rock", undercover="Metal"),
            WordPairData(pair_id="mus_5", civilian="Jazz", undercover="Blues"),
        ]
    ),
    "sports": ThemeDocument(
        theme_id="sports",
        name="sports",
        pairs=[
            WordPairData(pair_id="spo_1", civilian="Soccer", undercover="Basketball"),
            WordPairData(pair_id="spo_2", civilian="Tennis", undercover="Badminton"),
            WordPairData(pair_id="spo_3", civilian="Swimming", undercover="Diving"),
            WordPairData(pair_id="spo_4", civilian="Running", undercover="Jogging"),
            WordPairData(pair_id="spo_5", civilian="Skiing", undercover="Snowboarding"),
        ]
    ),
    "food": ThemeDocument(
        theme_id="food",
        name="food",
        pairs=[
            WordPairData(pair_id="food_1", civilian="Pizza", undercover="Pasta"),
            WordPairData(pair_id="food_2", civilian="Burger", undercover="Sandwich"),
            WordPairData(pair_id="food_3", civilian="Sushi", undercover="Sashimi"),
            WordPairData(pair_id="food_4", civilian="Ice Cream", undercover="Frozen Yogurt"),
            WordPairData(pair_id="food_5", civilian="Cake", undercover="Pie"),
        ]
    ),
    "movies": ThemeDocument(
        theme_id="movies",
        name="movies",
        pairs=[
            WordPairData(pair_id="mov_1", civilian="Harry Potter", undercover="Lord of the Rings"),
            WordPairData(pair_id="mov_2", civilian="Star Wars", undercover="Star Trek"),
            WordPairData(pair_id="mov_3", civilian="Batman", undercover="Superman"),
            WordPairData(pair_id="mov_4", civilian="Titanic", undercover="Avatar"),
            WordPairData(pair_id="mov_5", civilian="Matrix", undercover="Inception"),
        ]
    ),
    "superheroes": ThemeDocument(
        theme_id="superheroes",
        name="superheroes",
        pairs=[
            WordPairData(pair_id="sup_1", civilian="Spider-Man", undercover="Deadpool"),
            WordPairData(pair_id="sup_2", civilian="Thor", undercover="Loki"),
            WordPairData(pair_id="sup_3", civilian="Iron Man", undercover="Captain America"),
            WordPairData(pair_id="sup_4", civilian="Hulk", undercover="The Thing"),
            WordPairData(pair_id="sup_5", civilian="Wonder Woman", undercover="Captain Marvel"),
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
