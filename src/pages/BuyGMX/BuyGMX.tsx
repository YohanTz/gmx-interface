import React, { useCallback } from "react";
import Footer from "components/Footer/Footer";
import "./BuyGMX.css";
import { useWeb3React } from "@web3-react/core";

import Button from "components/Button/Button";
import { ARBITRUM, AVALANCHE, getChainName, getConstant } from "config/chains";
import { switchNetwork } from "lib/wallets";
import { useChainId } from "lib/chains";
import Card from "components/Common/Card";
import { importImage } from "lib/legacy";
import ExternalLink from "components/ExternalLink/ExternalLink";

import bondProtocolIcon from "img/ic_bondprotocol_arbitrum.svg";
import uniswapArbitrumIcon from "img/ic_uni_arbitrum.svg";
import traderjoeIcon from "img/ic_traderjoe_avax.png";
import {
  BUY_NATIVE_TOKENS,
  CENTRALISED_EXCHANGES,
  DECENTRALISED_AGGRIGATORS,
  EXTERNAL_LINKS,
  FIAT_GATEWAYS,
  GMX_FROM_ANY_NETWORKS,
  TRANSFER_EXCHANGES,
} from "./constants";
import { getIcons } from "config/icons";

export default function BuyGMX() {
  const { chainId } = useChainId();
  const isArbitrum = chainId === ARBITRUM;
  const icons = getIcons(chainId);
  const chainName = getChainName(chainId);
  const { active } = useWeb3React();
  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");
  const externalLinks = EXTERNAL_LINKS[chainId];

  const onNetworkSelect = useCallback(
    (value) => {
      if (value === chainId) {
        return;
      }
      return switchNetwork(value, active);
    },
    [chainId, active]
  );

  return (
    <div className="BuyGMXGLP default-container page-layout">
      <div className="BuyGMXGLP-container">
        <div className="section-title-block">
          <div className="section-title-content">
            <div className="Page-title">
              <span>Buy GMX on {chainName}</span>
              <img className="ml-xs Page-title-icon" src={icons.network} alt={chainName} />
            </div>
            <div className="Page-description">
              <span>Choose to buy from decentralized or centralized exchanges.</span>
              <br />
              <span>
                To purchase GMX on the {isArbitrum ? "Avalanche" : "Arbitrum"} blockchain, please{" "}
                <span onClick={() => onNetworkSelect(isArbitrum ? AVALANCHE : ARBITRUM)}>change your network</span>.
              </span>
            </div>
          </div>
        </div>
        <div className="cards-row">
          <DecentralisedExchanges chainId={chainId} externalLinks={externalLinks} />
          <CentralisedExchanges chainId={chainId} />
        </div>

        {isArbitrum ? (
          <div className="section-title-block mt-top">
            <div className="section-title-content">
              <div className="Page-title">
                <span>Buy or Transfer ETH to Arbitrum</span>
                <img className="ml-xs Page-title-icon" src={icons.network} alt={chainName} />
              </div>
              <div className="Page-description">
                <span>Buy ETH directly on Arbitrum or transfer it there.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="section-title-block mt-top">
            <div className="section-title-content">
              <div className="Page-title">
                <span>Buy or Transfer AVAX to Avalanche</span>
                <img className="ml-xs Page-title-icon" src={icons.network} alt={chainName} />
              </div>
              <div className="Page-description">
                <span>Buy AVAX directly to Avalanche or transfer it there.</span>
              </div>
            </div>
          </div>
        )}

        <div className="cards-row">
          <Card title={`Buy ${nativeTokenSymbol}`}>
            <div className="App-card-content">
              <div className="BuyGMXGLP-description">
                {isArbitrum ? (
                  <span>
                    You can buy ETH directly on{" "}
                    <ExternalLink href={externalLinks.networkWebsite}>Arbitrum</ExternalLink> using these options:
                  </span>
                ) : (
                  <span>
                    You can buy AVAX directly on{" "}
                    <ExternalLink href={externalLinks.networkWebsite}>Avalanche</ExternalLink> using these options:
                  </span>
                )}
              </div>
              <div className="buttons-group">
                {BUY_NATIVE_TOKENS.filter((e) => chainId in e.links).map((exchange) => {
                  const icon = importImage(exchange.icon) || "";
                  const link = exchange.links[chainId];
                  return (
                    <Button
                      variant="secondary"
                      textAlign="left"
                      key={exchange.name}
                      to={link}
                      imgInfo={{ src: icon, alt: exchange.name }}
                      newTab
                    >
                      {exchange.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          </Card>
          <Card title={`Transfer ${nativeTokenSymbol}`}>
            <div className="App-card-content">
              {isArbitrum ? (
                <div className="BuyGMXGLP-description">
                  <span>You can transfer ETH from other networks to Arbitrum using any of the below options:</span>
                </div>
              ) : (
                <div className="BuyGMXGLP-description">
                  <span>You can transfer AVAX from other networks to Avalanche using any of the below options:</span>
                </div>
              )}
              <div className="buttons-group">
                {TRANSFER_EXCHANGES.filter((e) => chainId in e.links).map((exchange) => {
                  const icon = importImage(exchange.icon) || "";
                  const link = exchange.links[chainId];
                  return (
                    <Button
                      variant="secondary"
                      textAlign="left"
                      key={exchange.name}
                      to={link}
                      imgInfo={{ src: icon, alt: exchange.name }}
                      newTab
                    >
                      {exchange.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function DecentralisedExchanges({ chainId, externalLinks }) {
  const isArbitrum = chainId === ARBITRUM;
  return (
    <Card title={`Buy GMX from decentralized exchanges`}>
      <div className="App-card-content">
        {isArbitrum ? (
          <div className="exchange-info-group">
            <div className="BuyGMXGLP-description">
              <span>Buy GMX from Uniswap (make sure to select Arbitrum):</span>
            </div>
            <div className="buttons-group col-1">
              <Button
                variant="secondary"
                textAlign="left"
                imgInfo={{ src: uniswapArbitrumIcon, alt: "Uniswap" }}
                to={externalLinks.buyGmx.uniswap}
                newTab
              >
                Uniswap
              </Button>
            </div>
          </div>
        ) : (
          <div className="exchange-info-group">
            <div className="BuyGMXGLP-description">
              <span>Buy GMX from Traderjoe:</span>
            </div>
            <div className="buttons-group col-1">
              <Button
                variant="secondary"
                textAlign="left"
                to={externalLinks.buyGmx.traderjoe}
                imgInfo={{ src: traderjoeIcon, alt: "Traderjoe" }}
                newTab
              >
                TraderJoe
              </Button>
            </div>
          </div>
        )}
        <div className="exchange-info-group">
          <div className="BuyGMXGLP-description">
            <span>Buy GMX using Decentralized Exchange Aggregators:</span>
          </div>
          <div className="buttons-group">
            {DECENTRALISED_AGGRIGATORS.filter((e) => chainId in e.links).map((exchange) => {
              const icon = importImage(exchange.icon) || "";
              const link = exchange.links[chainId];
              return (
                <Button
                  variant="secondary"
                  textAlign="left"
                  key={exchange.name}
                  to={link}
                  imgInfo={{ src: icon, alt: exchange.name }}
                  newTab
                >
                  {exchange.name}
                </Button>
              );
            })}
          </div>
        </div>
        <div className="exchange-info-group">
          <div className="BuyGMXGLP-description">
            <span>Buy GMX using any token from any network:</span>
          </div>
          <div className="buttons-group">
            {GMX_FROM_ANY_NETWORKS.filter((e) => chainId in e.links).map((exchange) => {
              const icon = importImage(exchange.icon) || "";
              const link = exchange.links[chainId];
              return (
                <Button
                  variant="secondary"
                  textAlign="left"
                  key={exchange.name}
                  to={link}
                  imgInfo={{ src: icon, alt: exchange.name }}
                  newTab
                >
                  {exchange.name}
                </Button>
              );
            })}
          </div>
        </div>
        {isArbitrum && (
          <div className="exchange-info-group">
            <div className="BuyGMXGLP-description">
              <span>GMX bonds can be bought on Bond Protocol with a discount and a small vesting period:</span>
            </div>
            <div className="buttons-group col-1">
              <Button
                variant="secondary"
                textAlign="left"
                to="https://app.bondprotocol.finance/#/tokens/42161/0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a"
                imgInfo={{ src: bondProtocolIcon, alt: "Bond Protocol" }}
                newTab
              >
                Bond Protocol
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function CentralisedExchanges({ chainId }) {
  return (
    <Card title={`Buy GMX from centralized services`}>
      <div className="App-card-content">
        <div className="exchange-info-group">
          <div className="BuyGMXGLP-description">
            <span>Buy GMX from centralized exchanges:</span>
          </div>
          <div className="buttons-group">
            {CENTRALISED_EXCHANGES.filter((e) => chainId in e.links).map((exchange) => {
              const icon = importImage(exchange.icon) || "";
              const link = exchange.links[chainId];
              return (
                <Button
                  variant="secondary"
                  textAlign="left"
                  key={exchange.name}
                  to={link}
                  imgInfo={{ src: icon, alt: exchange.name }}
                  newTab
                >
                  {exchange.name}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="exchange-info-group">
          <div className="BuyGMXGLP-description">
            <span>Buy GMX using FIAT gateways:</span>
          </div>
          <div className="buttons-group col-2">
            {FIAT_GATEWAYS.filter((e) => chainId in e.links).map((exchange) => {
              const icon = importImage(exchange.icon) || "";
              let link = exchange.links[chainId];

              return (
                <Button
                  variant="secondary"
                  textAlign="left"
                  key={exchange.name}
                  to={link}
                  imgInfo={{ src: icon, alt: exchange.name }}
                  newTab
                >
                  {exchange.name}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
