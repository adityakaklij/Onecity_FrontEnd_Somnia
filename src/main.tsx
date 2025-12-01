import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { SuiClientProvider, WalletProvider } from '@onelabs/dapp-kit';
import { 
  createNetworkConfig,
  SuiClientProvider, 
  WalletProvider 
} from '@mysten/dapp-kit';
import RegisterEnokiWallets from './components/RegisterEnokiWallets';

// Import the dApp Kit CSS for proper component display
import '@mysten/dapp-kit/dist/index.css';

const queryClient = new QueryClient();

// Create network configuration using createNetworkConfig for Enoki compatibility
const { networkConfig } = createNetworkConfig({
  testnet: { url: "https://rpc-testnet.onelabs.cc:443" },
  // testnet: { url: getFullnodeUrl('testnet') }, // Alternative: use Sui's default testnet
  mainnet: { url: "https://rpc-mainnet.onelabs.cc:443" },
  // mainnet: { url: getFullnodeUrl('mainnet') }, // Alternative: use Sui's default mainnet
});

createRoot(document.getElementById("root")!).render(
<QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <RegisterEnokiWallets />
        <WalletProvider autoConnect={false}>
          <App />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
);
