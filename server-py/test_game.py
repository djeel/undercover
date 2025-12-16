#!/usr/bin/env python3
"""Test script to simulate a full game loop and verify role security."""
import asyncio
import httpx

BASE_URL = "http://localhost:8000/api"


async def test_full_game():
    """Simulate a complete game to verify the backend."""
    async with httpx.AsyncClient() as client:
        print("=" * 60)
        print("UNDERCOVER BACKEND TEST SCRIPT")
        print("=" * 60)
        
        # 1. Get themes
        print("\n[1] Getting themes...")
        resp = await client.get(f"{BASE_URL}/words/themes")
        themes = resp.json()
        print(f"    Available themes: {[t['theme_id'] for t in themes['themes']]}")
        
        # 2. Create game
        print("\n[2] Creating game...")
        resp = await client.post(f"{BASE_URL}/game/create", json={"theme_id": "animals"})
        game_data = resp.json()
        game_id = game_data["game_id"]
        print(f"    Game ID: {game_id}")
        
        # 3. Add players
        print("\n[3] Adding players...")
        players = []
        for name in ["Alice", "Bob", "Charlie", "Diana", "Eve"]:
            resp = await client.post(
                f"{BASE_URL}/game/{game_id}/players",
                json={"name": name}
            )
            player = resp.json()
            players.append(player)
            print(f"    Added: {name} (ID: {player['player_id'][:8]}...)")
        
        # 4. Assign roles
        print("\n[4] Assigning roles...")
        resp = await client.post(
            f"{BASE_URL}/game/{game_id}/assign-roles",
            json={"undercover_count": 1, "mr_white_count": 1}
        )
        print(f"    Roles assigned: {resp.json()}")
        
        # 5. Get state for each player (verify role secrecy)
        print("\n[5] Checking role security...")
        for player in players:
            resp = await client.get(
                f"{BASE_URL}/game/{game_id}",
                headers={"X-Player-ID": player["player_id"]}
            )
            state = resp.json()
            
            # Find this player in the response
            me = next(p for p in state["players"] if p["id"] == player["player_id"])
            others = [p for p in state["players"] if p["id"] != player["player_id"]]
            
            print(f"\n    {player['name']}:")
            print(f"      My role: {me.get('role', 'HIDDEN')}")
            print(f"      My word: {me.get('word', 'HIDDEN')}")
            
            # Verify others' roles are hidden
            for other in others:
                if other.get("role") or other.get("word"):
                    print(f"      ⚠️  SECURITY BREACH: Can see {other['name']}'s role/word!")
                else:
                    print(f"      ✓ {other['name']}'s role/word hidden correctly")
        
        # 6. Test elimination
        print("\n[6] Testing elimination...")
        target = players[0]
        resp = await client.post(
            f"{BASE_URL}/game/{game_id}/eliminate",
            json={"target_player_id": target["player_id"]}
        )
        result = resp.json()
        print(f"    Eliminated: {target['name']}")
        print(f"    Game over: {result['game_over']}")
        if result.get("winner"):
            print(f"    Winner: {result['winner']}")
        
        print("\n" + "=" * 60)
        print("TEST COMPLETE")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_full_game())
