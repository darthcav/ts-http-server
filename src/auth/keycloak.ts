import { createRemoteJWKSet, jwtVerify } from "jose"
import type { KeycloakAuthConfig, TokenVerifier } from "../types.ts"

/**
 * Creates a JWT token verifier backed by a Keycloak realm's JWKS endpoint.
 *
 * The JWKS keys are fetched lazily on the first verification request and
 * cached; key rotation is handled automatically by `jose`.
 *
 * The verifier extracts the bearer token from the `Authorization` header,
 * verifies the JWT signature against the realm's public keys, and validates
 * the issuer claim. Any verification failure returns `false` without throwing.
 *
 * @param config - Keycloak realm and client configuration.
 * @returns An async {@link TokenVerifier} that returns `true` if the bearer
 * JWT is valid, `false` otherwise.
 */
export function createKeycloakVerifier(
    config: KeycloakAuthConfig,
): TokenVerifier {
    const baseUrl = config.url.replace(/\/$/, "")
    const jwksUri = new URL(
        `/realms/${config.realm}/protocol/openid-connect/certs`,
        baseUrl,
    )
    const JWKS = createRemoteJWKSet(jwksUri)
    const issuer = `${baseUrl}/realms/${config.realm}`

    return async function verifyToken(
        authorizationHeader: string | undefined,
    ): Promise<boolean> {
        if (!authorizationHeader?.startsWith("Bearer ")) {
            return false
        }
        const token = authorizationHeader.slice(7)
        try {
            await jwtVerify(token, JWKS, { issuer })
            return true
        } catch {
            return false
        }
    }
}
