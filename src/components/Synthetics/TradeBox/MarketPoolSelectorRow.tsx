import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { PoolSelector } from "components/MarketSelector/PoolSelector";
import Tooltip from "components/Tooltip/Tooltip";
import { Market, MarketInfo, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { AvailableMarketsOptions } from "domain/synthetics/trade/useAvailableMarketsOptions";
import { Token } from "domain/tokens";
import { BigNumber } from "ethers";
import { formatPercentage } from "lib/numbers";
import { useCallback, useMemo } from "react";

export type Props = {
  indexToken?: Token;
  selectedMarket?: MarketInfo;
  marketsOptions?: AvailableMarketsOptions;
  hasExistingPosition?: boolean;
  hasExistingOrder?: boolean;
  isOutPositionLiquidity?: boolean;
  currentPriceImpactBps?: BigNumber;
  onSelectMarketAddress: (marketAddress?: string) => void;
};

export function MarketPoolSelectorRow(p: Props) {
  const {
    selectedMarket,
    indexToken,
    marketsOptions,
    hasExistingOrder,
    hasExistingPosition,
    isOutPositionLiquidity,
    currentPriceImpactBps,
    onSelectMarketAddress,
  } = p;

  const {
    isNoSufficientLiquidityInAnyMarket,
    marketWithOrder,
    marketWithPosition,
    maxLiquidityMarket,
    availableMarkets,
    minPriceImpactMarket,
    minPriceImpactBps,
  } = marketsOptions || {};

  const indexName = indexToken ? getMarketIndexName({ indexToken, isSpotOnly: false }) : undefined;

  const isSelectedMarket = useCallback(
    (market: Market) => {
      return selectedMarket && market.marketTokenAddress === selectedMarket.marketTokenAddress;
    },
    [selectedMarket]
  );

  const message = useMemo(() => {
    if (isNoSufficientLiquidityInAnyMarket) {
      return (
        <div className="MarketSelector-tooltip-row">
          <span>Insufficient liquidity in any {indexToken?.symbol}/USD market pools for your order.</span>
          <br />
          <br />
          <span>V2 is newly live, and liquidity may be low initially.</span>
        </div>
      );
    }

    if (isOutPositionLiquidity && maxLiquidityMarket && !isSelectedMarket(maxLiquidityMarket)) {
      return (
        <div className="MarketSelector-tooltip-row">
          <span>
            Insufficient liquidity in {selectedMarket ? getMarketPoolName(selectedMarket) : "..."} market pool. <br />
            <div
              className="MarketSelector-tooltip-row-action clickable underline muted "
              onClick={() => onSelectMarketAddress(maxLiquidityMarket!.marketTokenAddress)}
            >
              Switch to {getMarketPoolName(maxLiquidityMarket)} market pool.
            </div>
          </span>
        </div>
      );
    }

    if (!hasExistingPosition && marketWithPosition && !isSelectedMarket(marketWithPosition)) {
      return (
        <div className="MarketSelector-tooltip-row">
          <span>
            You have an existing position in the {getMarketPoolName(marketWithPosition)} market pool.{" "}
            <div
              className="MarketSelector-tooltip-row-action clickable underline muted"
              onClick={() => {
                onSelectMarketAddress(marketWithPosition.marketTokenAddress);
              }}
            >
              Switch to {getMarketPoolName(marketWithPosition)} market pool.
            </div>{" "}
          </span>
        </div>
      );
    }

    if (!marketWithPosition && !hasExistingOrder && marketWithOrder && !isSelectedMarket(marketWithOrder)) {
      return (
        <div className="MarketSelector-tooltip-row">
          <span>
            You have an existing order in the {getMarketPoolName(marketWithOrder)} market pool.{" "}
            <div
              className="MarketSelector-tooltip-row-action clickable underline muted"
              onClick={() => {
                onSelectMarketAddress(marketWithOrder.marketTokenAddress);
              }}
            >
              Switch to {getMarketPoolName(marketWithOrder)} market pool.
            </div>{" "}
          </span>
        </div>
      );
    }

    if (
      !marketWithPosition &&
      !marketWithOrder &&
      minPriceImpactMarket &&
      minPriceImpactBps &&
      !isSelectedMarket(minPriceImpactMarket)
    ) {
      return (
        <div className="MarketSelector-tooltip-row">
          <span>
            You can get a {formatPercentage(currentPriceImpactBps?.sub(minPriceImpactBps))} better execution price in
            the {getMarketPoolName(minPriceImpactMarket)} market pool.
            <div
              className="MarketSelector-tooltip-row-action clickable underline muted"
              onClick={() => onSelectMarketAddress(minPriceImpactMarket.marketTokenAddress)}
            >
              Switch to {getMarketPoolName(minPriceImpactMarket)} market pool.
            </div>
          </span>
        </div>
      );
    }

    return null;
  }, [
    currentPriceImpactBps,
    hasExistingOrder,
    hasExistingPosition,
    indexToken?.symbol,
    isNoSufficientLiquidityInAnyMarket,
    isOutPositionLiquidity,
    isSelectedMarket,
    marketWithOrder,
    marketWithPosition,
    maxLiquidityMarket,
    minPriceImpactBps,
    minPriceImpactMarket,
    onSelectMarketAddress,
    selectedMarket,
  ]);

  return (
    <ExchangeInfoRow
      className="SwapBox-info-row"
      label={
        message ? (
          <Tooltip
            handle={`Pool`}
            position="left-bottom"
            className="MarketSelector-tooltip"
            renderContent={() => <div className="MarketSelector-tooltip-content">{message}</div>}
          />
        ) : (
          `Pool`
        )
      }
      value={
        <>
          <PoolSelector
            label={`Pool`}
            className="SwapBox-info-dropdown"
            selectedIndexName={indexName}
            selectedMarketAddress={selectedMarket?.marketTokenAddress}
            markets={availableMarkets || []}
            isSideMenu
            onSelectMarket={(marketInfo) => onSelectMarketAddress(marketInfo.marketTokenAddress)}
          />
        </>
      }
    />
  );
}
