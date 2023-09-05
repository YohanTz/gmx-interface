import { useWeb3React } from "@web3-react/core";
import connectWalletImg from "img/ic_wallet_24.svg";
import { useCallback, useEffect } from "react";
import AddressDropdown from "../AddressDropdown/AddressDropdown";
import ConnectWalletButton from "../Common/ConnectWalletButton";

import cx from "classnames";
import { ARBITRUM, ARBITRUM_GOERLI, AVALANCHE, AVALANCHE_FUJI, getChainName } from "config/chains";
import { isDevelopment } from "config/env";
import { getIcon } from "config/icons";
import { useChainId } from "lib/chains";
import { getAccountUrl, isHomeSite } from "lib/legacy";
import NetworkDropdown from "../NetworkDropdown/NetworkDropdown";
import "./Header.css";
import { HeaderLink } from "./HeaderLink";
import { useAccount } from "@starknet-react/core";

type Props = {
  openSettings: () => void;
  small?: boolean;
  setWalletModalVisible: (visible: boolean) => void;
  closeSettings: () => void;
  redirectPopupTimestamp: number;
  showRedirectModal: (to: string) => void;
  tradePageVersion: number;
};

const NETWORK_OPTIONS = [
  {
    label: getChainName(ARBITRUM),
    value: ARBITRUM,
    icon: getIcon(ARBITRUM, "network"),
    color: "#264f79",
  },
  {
    label: getChainName(AVALANCHE),
    value: AVALANCHE,
    icon: getIcon(AVALANCHE, "network"),
    color: "#E841424D",
  },
];

if (isDevelopment()) {
  NETWORK_OPTIONS.push({
    label: getChainName(ARBITRUM_GOERLI),
    value: ARBITRUM_GOERLI,
    icon: getIcon(ARBITRUM_GOERLI, "network"),
    color: "#264f79",
  });
  NETWORK_OPTIONS.push({
    label: getChainName(AVALANCHE_FUJI),
    value: AVALANCHE_FUJI,
    icon: getIcon(AVALANCHE_FUJI, "network"),
    color: "#E841424D",
  });
}

export function AppHeaderUser({
  openSettings,
  small,
  setWalletModalVisible,
  closeSettings,
  redirectPopupTimestamp,
  showRedirectModal,
  tradePageVersion,
}: Props) {
  const { chainId } = useChainId();
  const { address } = useAccount();

  const tradeLink = tradePageVersion === 1 ? "/trade" : "/v2";

  useEffect(() => {
    if (address !== undefined) {
      setWalletModalVisible(false);
    }
  }, [address, setWalletModalVisible]);

  // const onNetworkSelect = useCallback(
  //   (option) => {
  //     if (option.value === chainId) {
  //       return;
  //     }
  //     return switchNetwork(option.value, active);
  //   },
  //   [chainId, active]
  // );

  const selectorLabel = getChainName(chainId);

  if (address === undefined) {
    return (
      <div className="App-header-user">
        <div className={cx("App-header-trade-link", { "homepage-header": false })}>
          <HeaderLink
            className="default-btn"
            to={tradeLink!}
            redirectPopupTimestamp={redirectPopupTimestamp}
            showRedirectModal={showRedirectModal}
          >
            {isHomeSite() ? <span>Launch App</span> : <span>Trade</span>}
          </HeaderLink>
        </div>

        <ConnectWalletButton onClick={() => setWalletModalVisible(true)} imgSrc={connectWalletImg}>
          {small ? <span>Connect</span> : <span>Connect Wallet</span>}
        </ConnectWalletButton>
        <NetworkDropdown
          small={small}
          networkOptions={NETWORK_OPTIONS}
          selectorLabel={selectorLabel}
          onNetworkSelect={() => {}}
          openSettings={openSettings}
        />
      </div>
    );
  }

  return (
    <div className="App-header-user">
      <div className={cx("App-header-trade-link")}>
        <HeaderLink
          className="default-btn"
          to={tradeLink!}
          redirectPopupTimestamp={redirectPopupTimestamp}
          showRedirectModal={showRedirectModal}
        >
          {isHomeSite() ? <span>Launch App</span> : <span>Trade</span>}
        </HeaderLink>
      </div>

      <div className="App-header-user-address">
        <AddressDropdown address={address} closeSettings={closeSettings} />
      </div>
      <NetworkDropdown
        small={small}
        networkOptions={NETWORK_OPTIONS}
        selectorLabel={selectorLabel}
        onNetworkSelect={() => {}}
        openSettings={openSettings}
      />
    </div>
  );
}
