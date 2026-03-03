import { EnvironmentProviders, makeEnvironmentProviders } from "@angular/core";
import { Configuration, ConfigurationParameters } from './configuration';
import { toBearerAuthorizationHeaderValue, readStoredAuthToken } from '../auth-token';
import { BASE_PATH } from './variables';

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

        return toBearerAuthorizationHeaderValue(existingToken ?? storedToken) ?? undefined;
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
