import { useCallback } from "react";
import { Link } from "react-router-dom";

import { isHomeSite } from "lib/legacy";

import { useWeb3React } from "@web3-react/core";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { ARBITRUM, AVALANCHE } from "config/chains";
import { getIcon } from "config/icons";
import { useChainId } from "lib/chains";
import { switchNetwork } from "lib/wallets";
import APRLabel from "../APRLabel/APRLabel";
import { HeaderLink } from "../Header/HeaderLink";

const glpIcon = getIcon("common", "glp");
const gmxIcon = getIcon("common", "gmx");
const gmIcon = getIcon("common", "gm");

export default function TokenCard({ showRedirectModal, redirectPopupTimestamp }) {
  const isHome = isHomeSite();
  const { chainId } = useChainId();
  const { active } = useWeb3React();

  const changeNetwork = useCallback(
    (network) => {
      if (network === chainId) {
        return;
      }
      if (!active) {
        setTimeout(() => {
          return switchNetwork(network, active);
        }, 500);
      } else {
        return switchNetwork(network, active);
      }
    },
    [chainId, active]
  );

  const BuyLink = ({ className, to, children, network }) => {
    if (isHome && showRedirectModal) {
      return (
        <HeaderLink
          to={to}
          className={className}
          redirectPopupTimestamp={redirectPopupTimestamp}
          showRedirectModal={showRedirectModal}
        >
          {children}
        </HeaderLink>
      );
    }

    return (
      <Link to={to} className={className} onClick={() => changeNetwork(network)}>
        {children}
      </Link>
    );
  };

  return (
    <div className="Home-token-card-options">
      <div className="Home-token-card-option">
        <div className="Home-token-card-option-icon">
          <img src={gmxIcon} width="40" alt="GMX Icons" /> GMX
        </div>
        <div className="Home-token-card-option-info">
          <div className="Home-token-card-option-title">
            <span>GMX is the utility and governance token. Accrues 30% of the platform's generated fees.</span>
          </div>
          <div className="Home-token-card-option-apr">
            <span>Arbitrum APR:</span> <APRLabel chainId={ARBITRUM} label="gmxAprTotal" />, <span>Avalanche APR:</span>{" "}
            <APRLabel chainId={AVALANCHE} label="gmxAprTotal" key="AVALANCHE" />
          </div>
          <div className="Home-token-card-option-action">
            <div className="buy">
              <BuyLink to="/buy_gmx" className="default-btn" network={ARBITRUM}>
                <span>Buy on Arbitrum</span>
              </BuyLink>
              <BuyLink to="/buy_gmx" className="default-btn" network={AVALANCHE}>
                <span>Buy on Avalanche</span>
              </BuyLink>
            </div>
            <ExternalLink href="https://docs.gmx.io/docs/category/tokenomics" className="default-btn read-more">
              <span>Read more</span>
            </ExternalLink>
          </div>
        </div>
      </div>
      <div className="Home-token-card-option">
        <div className="Home-token-card-option-icon">
          <img src={glpIcon} width="40" alt="GLP Icon" /> GLP
        </div>
        <div className="Home-token-card-option-info">
          <div className="Home-token-card-option-title">
            <span>
              GLP is the liquidity provider token for GMX V1 markets. Accrues 70% of the V1 markets generated fees.
            </span>
          </div>
          <div className="Home-token-card-option-apr">
            <span>Arbitrum APR:</span> <APRLabel chainId={ARBITRUM} label="glpAprTotal" key="ARBITRUM" />,{" "}
            <span>Avalanche APR:</span> <APRLabel chainId={AVALANCHE} label="glpAprTotal" key="AVALANCHE" />
          </div>
          <div className="Home-token-card-option-action">
            <div className="buy">
              <BuyLink to="/buy_glp" className="default-btn" network={ARBITRUM}>
                <span>Buy on Arbitrum</span>
              </BuyLink>
              <BuyLink to="/buy_glp" className="default-btn" network={AVALANCHE}>
                <span>Buy on Avalanche</span>
              </BuyLink>
            </div>
            <a
              href="https://docs.gmx.io/docs/providing-liquidity/v1"
              target="_blank"
              rel="noreferrer"
              className="default-btn read-more"
            >
              <span>Read more</span>
            </a>
          </div>
        </div>
      </div>

      <div className="Home-token-card-option">
        <div className="Home-token-card-option-icon">
          <img src={gmIcon} alt="gmxBigIcon" /> GM
        </div>
        <div className="Home-token-card-option-info">
          <div className="Home-token-card-option-title">
            <span>
              GM is the liquidity provider token for GMX V2 markets. Accrues 63% of the V2 markets generated fees.
            </span>
          </div>

          <div className="Home-token-card-option-action Token-card-buy">
            <div className="buy">
              <BuyLink to="/pools" className="default-btn" network={ARBITRUM}>
                <span>Buy on Arbitrum</span>
              </BuyLink>

              <BuyLink to="/pools" className="default-btn" network={AVALANCHE}>
                <span>Buy on Avalanche</span>
              </BuyLink>
            </div>
            <a
              href="https://docs.gmx.io/docs/providing-liquidity/v2"
              target="_blank"
              rel="noreferrer"
              className="default-btn read-more"
            >
              <span>Read more</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
