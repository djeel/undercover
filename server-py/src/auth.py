"""Authentication dependency validating Supabase JWTs against cached JWKS."""
from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from typing import Any
from uuid import UUID

import jwt
from fastapi import Header, HTTPException, Request

from .config import Settings


@dataclass(frozen=True, slots=True)
class AuthenticatedUser:
    id: UUID
    is_anonymous: bool = False


class JWKSVerifier:
    """Caches public signing keys for one Supabase issuer."""

    def __init__(self, configuration: Settings, http_client: Any) -> None:
        self._configuration = configuration
        self._http_client = http_client
        self._keys: dict[str, Any] = {}
        self._lock = asyncio.Lock()

    @property
    def enabled(self) -> bool:
        return bool(self._configuration.supabase_url)

    @property
    def issuer(self) -> str:
        return f"{self._configuration.supabase_url.rstrip('/')}/auth/v1"

    @property
    def jwks_url(self) -> str:
        return f"{self.issuer}/.well-known/jwks.json"

    async def verify(self, token: str) -> AuthenticatedUser:
        try:
            header = jwt.get_unverified_header(token)
            algorithm = header["alg"]
            key_id = header["kid"]
            if algorithm not in {"RS256", "RS384", "RS512", "ES256", "ES384", "ES512", "EdDSA"}:
                raise ValueError("Unsupported signing algorithm")
            signing_key = await self._key(str(key_id), algorithm)
            claims = jwt.decode(
                token,
                signing_key,
                algorithms=[algorithm],
                audience=self._configuration.supabase_jwt_audience,
                issuer=self.issuer,
                options={"require": ["exp", "sub", "iss", "aud"]},
            )
            return AuthenticatedUser(UUID(str(claims["sub"])), bool(claims.get("is_anonymous", False)))
        except (ValueError, KeyError, TypeError, jwt.PyJWTError):
            raise authentication_required() from None

    async def _key(self, key_id: str, algorithm: str) -> Any:
        if key := self._keys.get(key_id):
            return key
        async with self._lock:
            if key := self._keys.get(key_id):
                return key
            response = await self._http_client.get(self.jwks_url)
            response.raise_for_status()
            payload = response.json()
            algorithms = jwt.algorithms.get_default_algorithms()
            keys: dict[str, Any] = {}
            for jwk in payload["keys"]:
                key_algorithm = jwk.get("alg") or algorithm
                if jwk.get("kid") and key_algorithm in algorithms:
                    keys[str(jwk["kid"])] = algorithms[key_algorithm].from_jwk(json.dumps(jwk))
            if not keys or key_id not in keys:
                raise ValueError("Unknown signing key")
            self._keys = keys
            return keys[key_id]


def authentication_required() -> HTTPException:
    return HTTPException(status_code=401, detail="Authentication required")


async def current_user(
    request: Request,
    authorization: str | None = Header(default=None),
) -> AuthenticatedUser:
    if not authorization:
        raise authentication_required()
    scheme, _, token = authorization.partition(" ")
    if scheme != "Bearer" or not token or token.strip() != token or " " in token:
        raise authentication_required()
    verifier: JWKSVerifier | None = getattr(request.app.state, "auth_verifier", None)
    if verifier is None or not verifier.enabled:
        raise authentication_required()
    return await verifier.verify(token)
