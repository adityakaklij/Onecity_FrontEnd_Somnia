import { useEffect } from 'react';
import { useSuiClientContext } from '@mysten/dapp-kit';
import { isEnokiNetwork, registerEnokiWallets } from '@mysten/enoki';

/**
 * RegisterEnokiWallets Component
 * 
 * This component registers Enoki wallets for zkLogin authentication.
 * It should be rendered within SuiClientProvider but before WalletProvider.
 * 
 * The component automatically re-registers wallets when the network changes.
 */
function RegisterEnokiWallets() {
	const { client, network } = useSuiClientContext();

	useEffect(() => {
		// Only register Enoki wallets if the network is supported by Enoki
		if (!isEnokiNetwork(network)) {
			return;
		}

		// Get Enoki API key from environment variables
		const enokiApiKey = import.meta.env.VITE_ENOKI_PUBLIC_API_KEY;
		
		if (!enokiApiKey) {
			console.warn(
				'Enoki API key not found. Please set VITE_ENOKI_PUBLIC_API_KEY in your .env file. ' +
				'Enoki wallets will not be available until this is configured.'
			);
			return;
		}

		// Get OAuth provider client IDs from environment variables
		const providers: {
			google?: { clientId: string };
			facebook?: { clientId: string };
			twitch?: { clientId: string };
		} = {};

		// Google OAuth
		const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
		if (googleClientId) {
			providers.google = { clientId: googleClientId };
		}

		// Facebook OAuth
		const facebookClientId = import.meta.env.VITE_FACEBOOK_CLIENT_ID;
		if (facebookClientId) {
			providers.facebook = { clientId: facebookClientId };
		}

		// Twitch OAuth
		const twitchClientId = import.meta.env.VITE_TWITCH_CLIENT_ID;
		if (twitchClientId) {
			providers.twitch = { clientId: twitchClientId };
		}

		// Only register if at least one provider is configured
		if (Object.keys(providers).length === 0) {
			console.warn(
				'No OAuth providers configured. Please set at least one of the following in your .env file: ' +
				'VITE_GOOGLE_CLIENT_ID, VITE_FACEBOOK_CLIENT_ID, or VITE_TWITCH_CLIENT_ID. ' +
				'Enoki wallets will not be available until at least one provider is configured.'
			);
			return;
		}

		// Register Enoki wallets
		const { unregister } = registerEnokiWallets({
			apiKey: enokiApiKey,
			providers,
			client,
			network,
		});

		// Cleanup function to unregister wallets when component unmounts or network changes
		return unregister;
	}, [client, network]);

	return null;
}

export default RegisterEnokiWallets;

