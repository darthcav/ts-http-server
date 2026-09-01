import type { KeycloakAuthConfig } from "./types.ts"

/**
 * Runtime configuration derived from the process environment by
 * {@link readConfig}.
 *
 * Optional fields are omitted entirely (rather than set to `undefined`) when
 * the corresponding environment variable is unset or disabled, so they can be
 * spread into option objects under `exactOptionalPropertyTypes`.
 */
export type AppConfig = {
    /**
     * Picomatch glob patterns for routes requiring bearer-token authentication,
     * from `API_AUTH_PATHS`. Omitted when unset or empty.
     */
    authPaths?: string[]
    /**
     * Keycloak connection config, from `KEYCLOAK_URL`, `KEYCLOAK_REALM`, and
     * `KEYCLOAK_CLIENT_ID`. Omitted unless all three are present.
     */
    keycloakAuth?: KeycloakAuthConfig
    /**
     * Protection-space label for the `WWW-Authenticate` challenge, from
     * `KEYCLOAK_REALM`. Set whenever that variable is present, independently of
     * whether {@link AppConfig.keycloakAuth} is complete. Omitted when unset.
     */
    authRealm?: string
    /**
     * Fastify `trustProxy` value, from `TRUST_PROXY`: `true` or a
     * comma-separated IP/CIDR allowlist. Omitted when proxy trust is disabled.
     */
    trustProxy?: boolean | string
    /**
     * Explicit Swagger UI (`/docs`) toggle, from `ENABLE_DOCS`. Omitted when
     * unset, leaving the decision to `defaultPlugins` (off in production).
     */
    docs?: boolean
    /** Bind address, from `HOST`. Defaults to `localhost`. */
    host: string
    /** Listen port, from `CONTAINER_EXPOSE_PORT`. Defaults to `8888`. */
    port: number
    /**
     * Human-readable warnings about rejected or ignored values, to be logged by
     * the caller. Empty when the environment is fully understood.
     */
    warnings: string[]
}

/**
 * Reads and validates the runtime environment variables used by the
 * application entrypoint.
 *
 * Pure and side-effect free: it neither reads `process.env` itself nor logs.
 * Invalid values are reported through {@link AppConfig.warnings} so the caller
 * decides how to surface them.
 *
 * @param env - Environment variables to read, typically `process.env`.
 * @returns The parsed configuration.
 */
export function readConfig(env: Record<string, string | undefined>): AppConfig {
    const warnings: string[] = []

    const authPaths = env["API_AUTH_PATHS"]
        ?.split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0)

    const keycloakUrl = env["KEYCLOAK_URL"]?.trim()
    const keycloakRealm = env["KEYCLOAK_REALM"]?.trim()
    const keycloakClientId = env["KEYCLOAK_CLIENT_ID"]?.trim()
    const keycloakAuth: KeycloakAuthConfig | undefined =
        keycloakUrl && keycloakRealm && keycloakClientId
            ? {
                  url: keycloakUrl,
                  realm: keycloakRealm,
                  clientId: keycloakClientId,
              }
            : undefined

    // TRUST_PROXY: `true`/`false` or a comma-separated IP/CIDR allowlist
    // (e.g. `127.0.0.1,10.0.0.0/8`). Defaults to disabled. Hop counts are
    // rejected: Fastify dropped `number` from its `trustProxy` option because a
    // hop count cannot validate the immediate peer.
    const trustProxyEnv = env["TRUST_PROXY"]?.trim()
    let trustProxy: boolean | string | undefined
    if (!trustProxyEnv || trustProxyEnv === "false") {
        trustProxy = undefined
    } else if (trustProxyEnv === "true") {
        trustProxy = true
    } else if (/^\d+$/.test(trustProxyEnv)) {
        warnings.push(
            `TRUST_PROXY hop counts are not supported; proxy trust stays disabled. Use an IP/CIDR allowlist instead. Received: ${trustProxyEnv}`,
        )
        trustProxy = undefined
    } else {
        trustProxy = trustProxyEnv
    }

    // ENABLE_DOCS: `true`/`false` to force Swagger UI (`/docs`) on or off.
    // When unset, defaultPlugins decides based on NODE_ENV (off in production).
    const enableDocsEnv = env["ENABLE_DOCS"]?.trim()
    const docs: boolean | undefined =
        enableDocsEnv === "true"
            ? true
            : enableDocsEnv === "false"
              ? false
              : undefined

    return {
        ...(authPaths?.length ? { authPaths } : {}),
        ...(keycloakAuth ? { keycloakAuth } : {}),
        ...(keycloakRealm ? { authRealm: keycloakRealm } : {}),
        ...(trustProxy !== undefined ? { trustProxy } : {}),
        ...(docs !== undefined ? { docs } : {}),
        host: env["HOST"] ?? "localhost",
        port: Number(env["CONTAINER_EXPOSE_PORT"]) || 8888,
        warnings,
    }
}
