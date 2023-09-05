import Davatar from "@davatar/react";
import { Menu } from "@headlessui/react";

import { ETH_MAINNET } from "config/chains";
import copy from "img/ic_copy_16.svg";
import externalLink from "img/ic_new_link_16.svg";
import disconnect from "img/ic_sign_out_16.svg";
import { helperToast } from "lib/helperToast";
import { shortenAddress } from "lib/legacy";
import { useJsonRpcProvider } from "lib/rpc";
import { FaChevronDown } from "react-icons/fa";
import { createBreakpoint, useCopyToClipboard } from "react-use";
import "./AddressDropdown.scss";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { useAccount, useConnectors } from "@starknet-react/core";

type Props = {
  address: string;
  closeSettings: () => void;
};

function AddressDropdown({ address, closeSettings }: Props) {
  const useBreakpoint = createBreakpoint({ L: 600, M: 550, S: 400 });
  const breakpoint = useBreakpoint();
  const [, copyToClipboard] = useCopyToClipboard();
  // TODO @YohanTz: Replace with useStarkName when working
  // const { ensName } = useENS(account);
  const { provider: ethereumProvider } = useJsonRpcProvider(ETH_MAINNET);

  const accountUrl = address;

  const { disconnect } = useConnectors();

  const onDisconnect = () => {
    closeSettings();
    disconnect();
  };

  return (
    <Menu>
      <Menu.Button as="div">
        <button className="App-cta small transparent address-btn">
          <div className="user-avatar">
            {/* TODO @YohanTz: Remove possibility to be undefined from parent components */}
            {ethereumProvider && <Davatar size={20} address={address || ""} provider={ethereumProvider} />}
          </div>
          <span className="user-address">{shortenAddress(address, breakpoint === "S" ? 9 : 13)}</span>
          <FaChevronDown />
        </button>
      </Menu.Button>
      <div>
        <Menu.Items as="div" className="menu-items">
          <Menu.Item>
            <div
              className="menu-item"
              onClick={() => {
                copyToClipboard(address);
                helperToast.success(`Address copied to your clipboard`);
              }}
            >
              <img src={copy} alt="Copy user address" />
              <p>
                <span>Copy Address</span>
              </p>
            </div>
          </Menu.Item>
          <Menu.Item>
            <ExternalLink href={accountUrl} className="menu-item">
              <img src={externalLink} alt="Open address in explorer" />
              <p>
                <span>View in Explorer</span>
              </p>
            </ExternalLink>
          </Menu.Item>
          <Menu.Item>
            <div className="menu-item" onClick={onDisconnect}>
              <img src={disconnect} alt="Disconnect the wallet" />
              <p>
                <span>Disconnect</span>
              </p>
            </div>
          </Menu.Item>
        </Menu.Items>
      </div>
    </Menu>
  );
}

export default AddressDropdown;
