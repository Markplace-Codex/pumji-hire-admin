import { EnvironmentProviders, makeEnvironmentProviders } from "@angular/core";
import { Configuration, ConfigurationParameters } from './configuration';
import { logAuthDebug, normalizeTokenValue, readStoredAuthToken } from '../auth-token';
import { BASE_PATH } from './variables';

function toBearerAuthorizationHeader(token: string | null | undefined): string | undefined {
    const normalizedToken = normalizeTokenValue(token);
    if (!normalizedToken) {
        return undefined;
    }

    const strippedToken = normalizedToken.replace(/^bearer\s+/i, '').trim();
    return strippedToken ? `Bearer ${strippedToken}` : undefined;
}

// Returns the service class providers, to be used in the [ApplicationConfig](https://angular.dev/api/core/ApplicationConfig).
export function provideApi(configOrBasePath: string | ConfigurationParameters): EnvironmentProviders {
    const config = typeof configOrBasePath === "string"
        ? { basePath: configOrBasePath }
        : { ...configOrBasePath };

    const existingBearerCredential = config.credentials?.['Bearer'];

    const bearerCredential = () => {
        const existingToken = typeof existingBearerCredential === 'function'
            ? existingBearerCredential()
            : existingBearerCredential;
        const storedToken = readStoredAuthToken();
        const tokenSource = existingToken ?? storedToken;
        const authorizationHeader = toBearerAuthorizationHeader(tokenSource);

        logAuthDebug('Token used for Authorization header:', tokenSource);
        logAuthDebug('Authorization header passed to API client:', authorizationHeader);

        return authorizationHeader;
    };

    return makeEnvironmentProviders([
        { provide: BASE_PATH, useValue: config.basePath ?? '' },
        {
            provide: Configuration,
            useValue: new Configuration({
                ...config,
                credentials: {
                    ...config.credentials,
                    Bearer: bearerCredential
                }
            }),
        },
    ]);
}
