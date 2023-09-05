import { useAccount, useConnectors } from "@starknet-react/core";
import Modal from "components/Modal/Modal";

import metamaskImg from "img/metamask.png";
import { useEffect } from "react";

// type Props = {
//   walletModalVisible: boolean;
//   setWalletModalVisible: (visible: boolean) => void;
// };

export function ConnectWalletModal({ walletModalVisible, setWalletModalVisible } /*: Props */) {
  const { address } = useAccount();
  const { connect, connectors } = useConnectors();

  //   const userOnMobileDevice = "navigator" in window && isMobileDevice(window.navigator);

  //   useEffect(() => {
  //     if (address !== undefined) {
  //       setWalletModalVisible(false);
  //     }
  //   }, [address, setWalletModalVisible]);

  return (
    <Modal
      className="Connect-wallet-modal"
      isVisible={walletModalVisible}
      setIsVisible={setWalletModalVisible}
      label="Connect Wallet"
    >
      {connectors.map((connector) => {
        return (
          <button className="Wallet-btn Connect-btn" onClick={() => connect(connector)} key={connector.id}>
            <img src={metamaskImg} alt={connector.id} />
            <div>
              <span>{connector.id}</span>
            </div>
          </button>
        );
      })}
    </Modal>
  );
}
