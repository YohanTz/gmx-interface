import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { Link } from "react-router-dom";
import Tooltip from "components/Tooltip/Tooltip";

import {
  USD_DECIMALS,
  LIQUIDATION_FEE,
  TRADES_PAGE_SIZE,
  deserialize,
  getExchangeRateDisplay,
  INCREASE,
} from "lib/legacy";
import { MAX_LEVERAGE, BASIS_POINTS_DIVISOR } from "config/factors";
import { useTrades, useLiquidationsData } from "domain/legacy";
import { getContract } from "config/contracts";

import "./TradeHistory.css";
import { getExplorerUrl } from "config/chains";
import { bigNumberify, formatAmount } from "lib/numbers";
import { formatDateTime } from "lib/dates";
import StatsTooltipRow from "../StatsTooltip/StatsTooltipRow";

import ExternalLink from "components/ExternalLink/ExternalLink";
import Button from "components/Button/Button";
import { getPriceDecimals } from "config/tokens";

const { AddressZero } = ethers.constants;

function getPositionDisplay(increase, indexToken, isLong, sizeDelta) {
  const symbol = indexToken ? (indexToken.isWrapped ? indexToken.baseSymbol : indexToken.symbol) : "";
  const positionTypeText = increase ? `Increase` : `Decrease`;
  const longOrShortText = isLong ? `Long` : `Short`;
  return (
    <>
      {positionTypeText} {symbol} {longOrShortText} {increase ? "+" : "-"}
      {formatAmount(sizeDelta, USD_DECIMALS, 2, true)} USD
    </>
  );
}

function getOrderActionTitle(action) {
  let actionDisplay;

  if (action.startsWith("Create")) {
    actionDisplay = `Create`;
  } else if (action.startsWith("Cancel")) {
    actionDisplay = `Cancel`;
  } else {
    actionDisplay = `Update`;
  }

  return `${actionDisplay} Order`;
}

function renderLiquidationTooltip(liquidationData, label) {
  const minCollateral = liquidationData.size.mul(BASIS_POINTS_DIVISOR).div(MAX_LEVERAGE);
  const text =
    liquidationData.type === "full"
      ? `This position was liquidated as the max leverage of 100x was exceeded.`
      : `Max leverage of 100x was exceeded, the remaining collateral after deducting losses and fees have been sent back to your account:`;
  return (
    <Tooltip
      position="left-top"
      handle={label}
      renderContent={() => (
        <>
          {text}
          <br />
          <br />
          <StatsTooltipRow
            label={`Initial collateral`}
            showDollar
            value={formatAmount(liquidationData.collateral, USD_DECIMALS, 2, true)}
          />
          <StatsTooltipRow
            label={`Min required collateral`}
            showDollar
            value={formatAmount(minCollateral, USD_DECIMALS, 2, true)}
          />
          <StatsTooltipRow
            label={`Borrow Fee`}
            showDollar
            value={formatAmount(liquidationData.borrowFee, USD_DECIMALS, 2, true)}
          />
          <StatsTooltipRow
            label={`PnL`}
            showDollar={false}
            value={`-$${formatAmount(liquidationData.loss, USD_DECIMALS, 2, true)}`}
          />
          {liquidationData.type === "full" && (
            <StatsTooltipRow label={`Liquidation Fee`} showDollar value={formatAmount(LIQUIDATION_FEE, 30, 2, true)} />
          )}
        </>
      )}
    />
  );
}

function getLiquidationData(liquidationsDataMap, key, timestamp) {
  return liquidationsDataMap && liquidationsDataMap[`${key}:${timestamp}`];
}

export default function TradeHistory(props) {
  const { account, infoTokens, getTokenInfo, chainId, nativeTokenAddress, shouldShowPaginationButtons } = props;
  const [pageIds, setPageIds] = useState({});
  const [pageIndex, setPageIndex] = useState(0);

  const getAfterId = () => {
    return pageIds[pageIndex];
  };

  const { trades, updateTrades } = useTrades(chainId, account, props.forSingleAccount, getAfterId());

  const liquidationsData = useLiquidationsData(chainId, account);
  const liquidationsDataMap = useMemo(() => {
    if (!liquidationsData) {
      return null;
    }
    return liquidationsData.reduce((memo, item) => {
      const liquidationKey = `${item.key}:${item.timestamp}`;
      memo[liquidationKey] = item;
      return memo;
    }, {});
  }, [liquidationsData]);

  useEffect(() => {
    const interval = setInterval(() => {
      updateTrades(undefined, true);
    }, 10 * 1000);
    return () => clearInterval(interval);
  }, [updateTrades]);

  const loadNextPage = () => {
    if (!trades || trades.length === 0) {
      return;
    }

    const lastTrade = trades[trades.length - 1];
    pageIds[pageIndex + 1] = lastTrade.id;
    setPageIds(pageIds);
    setPageIndex(pageIndex + 1);
  };

  const loadPrevPage = () => {
    setPageIndex(pageIndex - 1);
  };

  const getMsg = useCallback(
    (trade) => {
      const tradeData = trade.data;
      const params = JSON.parse(tradeData.params);
      const longOrShortText = params?.isLong ? `Long` : `Short`;
      const defaultMsg = "";

      if (tradeData.action === "BuyUSDG") {
        const token = getTokenInfo(infoTokens, params.token, true, nativeTokenAddress);
        if (!token) {
          return defaultMsg;
        }
        return (
          <span>
            Swap {formatAmount(params.tokenAmount, token.decimals, 4, true)} {token.symbol} for
            {formatAmount(params.usdgAmount, 18, 4, true)} USDG
          </span>
        );
      }

      if (tradeData.action === "SellUSDG") {
        const token = getTokenInfo(infoTokens, params.token, true, nativeTokenAddress);
        if (!token) {
          return defaultMsg;
        }
        return (
          <span>
            Swap {formatAmount(params.usdgAmount, 18, 4, true)} USDG for
            {formatAmount(params.tokenAmount, token.decimals, 4, true)} {token.symbol}
          </span>
        );
      }

      if (tradeData.action === "Swap") {
        const tokenIn = getTokenInfo(infoTokens, params.tokenIn, true, nativeTokenAddress);
        const tokenOut = getTokenInfo(infoTokens, params.tokenOut, true, nativeTokenAddress);
        if (!tokenIn || !tokenOut) {
          return defaultMsg;
        }
        return (
          <span>
            Swap {formatAmount(params.amountIn, tokenIn.decimals, 4, true)} {tokenIn.symbol} for{" "}
            {formatAmount(params.amountOut, tokenOut.decimals, 4, true)} {tokenOut.symbol}
          </span>
        );
      }

      if (tradeData.action === "CreateIncreasePosition") {
        const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress);
        const indexTokenPriceDecimal = getPriceDecimals(chainId, indexToken.symbol);
        if (!indexToken) {
          return defaultMsg;
        }

        if (bigNumberify(params.sizeDelta).eq(0)) {
          return (
            <span>
              Request deposit into {indexToken.symbol} {longOrShortText}
            </span>
          );
        }

        return `Request increase ${indexToken.symbol} ${longOrShortText}, +${formatAmount(
          params.sizeDelta,
          USD_DECIMALS,
          2,
          true
        )} USD, Acceptable Price: ${params.isLong ? "<" : ">"} ${formatAmount(
          params.acceptablePrice,
          USD_DECIMALS,
          indexTokenPriceDecimal,
          true
        )} USD`;
      }

      if (tradeData.action === "CreateDecreasePosition") {
        const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress);
        const indexTokenPriceDecimal = getPriceDecimals(chainId, indexToken.symbol);
        if (!indexToken) {
          return defaultMsg;
        }

        if (bigNumberify(params.sizeDelta).eq(0)) {
          return (
            <span>
              Request withdrawal from {indexToken.symbol} {longOrShortText}
            </span>
          );
        }

        return `Request decrease ${indexToken.symbol} ${longOrShortText}, -${formatAmount(
          params.sizeDelta,
          USD_DECIMALS,
          2,
          true
        )} USD, Acceptable Price: ${params.isLong ? ">" : "<"} ${formatAmount(
          params.acceptablePrice,
          USD_DECIMALS,
          indexTokenPriceDecimal,
          true
        )} USD`;
      }

      if (tradeData.action === "CancelIncreasePosition") {
        const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress);
        const indexTokenPriceDecimal = getPriceDecimals(chainId, indexToken.symbol);
        if (!indexToken) {
          return defaultMsg;
        }

        if (bigNumberify(params.sizeDelta).eq(0)) {
          return (
            <span>
              Could not execute deposit into {indexToken.symbol} {longOrShortText}
            </span>
          );
        }

        return (
          <>
            <span>
              Could not increase {indexToken.symbol} {longOrShortText}, +
              {formatAmount(params.sizeDelta, USD_DECIMALS, 2, true)} USD, Acceptable Price:&nbsp;
              {params.isLong ? "<" : ">"}&nbsp; USD
            </span>
            <Tooltip
              position="center-top"
              handle={`${formatAmount(params.acceptablePrice, USD_DECIMALS, indexTokenPriceDecimal, true)} USD`}
              renderContent={() => (
                <span>Try increasing the "Allowed Slippage", under the Settings menu on the top right.</span>
              )}
            />
          </>
        );
      }

      if (tradeData.action === "CancelDecreasePosition") {
        const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress);
        const indexTokenPriceDecimal = getPriceDecimals(chainId, indexToken.symbol);
        if (!indexToken) {
          return defaultMsg;
        }

        if (bigNumberify(params.sizeDelta).eq(0)) {
          return (
            <span>
              Could not execute withdrawal from {indexToken.symbol} {longOrShortText}
            </span>
          );
        }

        return (
          <>
            <span>
              Could not decrease {indexToken.symbol} {longOrShortText}, +
              {formatAmount(params.sizeDelta, USD_DECIMALS, 2, true)} USD, Acceptable Price:&nbsp;
              {params.isLong ? ">" : "<"}&nbsp;
            </span>
            USD
            <Tooltip
              position="right-top"
              handle={`${formatAmount(params.acceptablePrice, USD_DECIMALS, indexTokenPriceDecimal, true)} USD`}
              renderContent={() => (
                <span>Try increasing the "Allowed Slippage", under the Settings menu on the top right</span>
              )}
            />
          </>
        );
      }

      if (tradeData.action === "IncreasePosition-Long" || tradeData.action === "IncreasePosition-Short") {
        if (params.flags?.isOrderExecution) {
          return;
        }

        const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress);
        const indexTokenPriceDecimal = getPriceDecimals(chainId, indexToken.symbol);
        if (!indexToken) {
          return defaultMsg;
        }
        if (bigNumberify(params.sizeDelta).eq(0)) {
          return (
            <span>
              Deposit {formatAmount(params.collateralDelta, USD_DECIMALS, 2, true)} USD into {indexToken.symbol}{" "}
              {longOrShortText}
            </span>
          );
        }
        return `Increase ${indexToken.symbol} ${longOrShortText}, +${formatAmount(
          params.sizeDelta,
          USD_DECIMALS,
          2,
          true
        )} USD, ${indexToken.symbol} Price: ${formatAmount(
          params.price,
          USD_DECIMALS,
          indexTokenPriceDecimal,
          true
        )} USD`;
      }

      if (tradeData.action === "DecreasePosition-Long" || tradeData.action === "DecreasePosition-Short") {
        if (params.flags?.isOrderExecution) {
          return;
        }

        const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress);
        const indexTokenPriceDecimal = getPriceDecimals(chainId, indexToken.symbol);
        if (!indexToken) {
          return defaultMsg;
        }
        if (bigNumberify(params.sizeDelta).eq(0)) {
          return (
            <span>
              Withdraw {formatAmount(params.collateralDelta, USD_DECIMALS, 2, true)} USD from {indexToken.symbol}
              {longOrShortText}{" "}
            </span>
          );
        }
        const isLiquidation = params.flags?.isLiquidation;
        const liquidationData = getLiquidationData(liquidationsDataMap, params.key, tradeData.timestamp);

        if (isLiquidation && liquidationData) {
          return (
            <>
              {renderLiquidationTooltip(liquidationData, `Partial Liquidation`)}&nbsp;
              {indexToken.symbol} {longOrShortText}, -{formatAmount(params.sizeDelta, USD_DECIMALS, 2, true)} USD,{" "}
              {indexToken.symbol}&nbsp; Price: ${formatAmount(params.price, USD_DECIMALS, indexTokenPriceDecimal, true)}{" "}
              USD
            </>
          );
        }
        const actionDisplay = isLiquidation ? `Partially Liquidated` : `Decreased`;
        return `${actionDisplay} ${indexToken.symbol} ${longOrShortText},
        -${formatAmount(params.sizeDelta, USD_DECIMALS, 2, true)} USD,
        ${indexToken.symbol} Price: ${formatAmount(params.price, USD_DECIMALS, indexTokenPriceDecimal, true)} USD
      `;
      }

      if (tradeData.action === "LiquidatePosition-Long" || tradeData.action === "LiquidatePosition-Short") {
        const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress);
        const indexTokenPriceDecimal = getPriceDecimals(chainId, indexToken.symbol);
        if (!indexToken) {
          return defaultMsg;
        }
        const liquidationData = getLiquidationData(liquidationsDataMap, params.key, tradeData.timestamp);
        if (liquidationData) {
          return (
            <span>
              {renderLiquidationTooltip(liquidationData, `Liquidated`)}&nbsp; {indexToken.symbol} {longOrShortText}, -
              {formatAmount(params.size, USD_DECIMALS, 2, true)} USD,&nbsp;
              {indexToken.symbol} Price: ${formatAmount(params.markPrice, USD_DECIMALS, indexTokenPriceDecimal, true)}{" "}
              USD
            </span>
          );
        }
        return `
        Liquidated ${indexToken.symbol} ${longOrShortText},
        -${formatAmount(params.size, USD_DECIMALS, 2, true)} USD,
        ${indexToken.symbol} Price: ${formatAmount(params.markPrice, USD_DECIMALS, indexTokenPriceDecimal, true)} USD
      `;
      }

      if (["ExecuteIncreaseOrder", "ExecuteDecreaseOrder"].includes(tradeData.action)) {
        const order = deserialize(params.order);
        const indexToken = getTokenInfo(infoTokens, order.indexToken, true, nativeTokenAddress);
        if (!indexToken) {
          return defaultMsg;
        }
        const longShortDisplay = order.isLong ? `Long` : `Short`;
        const orderTypeText = order.type === INCREASE ? `Increase` : `Decrease`;
        const executionPriceDisplay = formatAmount(order.executionPrice, USD_DECIMALS, 2, true);
        const sizeDeltaDisplay = `${order.type === "Increase" ? "+" : "-"}${formatAmount(
          order.sizeDelta,
          USD_DECIMALS,
          2,
          true
        )}`;
        return (
          <span>
            Execute Order: {orderTypeText} {indexToken.symbol} {longShortDisplay} {sizeDeltaDisplay} USD, Price:{" "}
            {executionPriceDisplay} USD
          </span>
        );
      }

      if (
        [
          "CreateIncreaseOrder",
          "CancelIncreaseOrder",
          "UpdateIncreaseOrder",
          "CreateDecreaseOrder",
          "CancelDecreaseOrder",
          "UpdateDecreaseOrder",
        ].includes(tradeData.action)
      ) {
        const order = deserialize(params.order);
        const indexToken = getTokenInfo(infoTokens, order.indexToken);
        const indexTokenPriceDecimal = getPriceDecimals(chainId, indexToken.symbol);
        if (!indexToken) {
          return defaultMsg;
        }
        const increase = tradeData.action.includes("Increase");
        const priceDisplay = `${order.triggerAboveThreshold ? ">" : "<"} ${formatAmount(
          order.triggerPrice,
          USD_DECIMALS,
          indexTokenPriceDecimal,
          true
        )} USD`;
        return (
          <span>
            {getOrderActionTitle(tradeData.action)}:{" "}
            {getPositionDisplay(increase, indexToken, order.isLong, order.sizeDelta)}, Price: {priceDisplay}
          </span>
        );
      }

      if (tradeData.action === "ExecuteSwapOrder") {
        const order = deserialize(params.order);
        const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
        const fromToken = getTokenInfo(infoTokens, order.path[0] === nativeTokenAddress ? AddressZero : order.path[0]);
        const toToken = getTokenInfo(infoTokens, order.shouldUnwrap ? AddressZero : order.path[order.path.length - 1]);
        if (!fromToken || !toToken) {
          return defaultMsg;
        }
        const fromAmountDisplay = formatAmount(order.amountIn, fromToken.decimals, fromToken.isStable ? 2 : 4, true);
        const toAmountDisplay = formatAmount(order.amountOut, toToken.decimals, toToken.isStable ? 2 : 4, true);
        return (
          <span>
            Execute Order: Swap {fromAmountDisplay} {fromToken.symbol} for {toAmountDisplay} {toToken.symbol}
          </span>
        );
      }

      if (["CreateSwapOrder", "UpdateSwapOrder", "CancelSwapOrder"].includes(tradeData.action)) {
        const order = deserialize(params.order);
        const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
        const fromToken = getTokenInfo(infoTokens, order.path[0] === nativeTokenAddress ? AddressZero : order.path[0]);
        const toToken = getTokenInfo(infoTokens, order.shouldUnwrap ? AddressZero : order.path[order.path.length - 1]);
        if (!fromToken || !toToken) {
          return defaultMsg;
        }
        const amountInDisplay = fromToken
          ? formatAmount(order.amountIn, fromToken.decimals, fromToken.isStable ? 2 : 4, true)
          : "";
        const minOutDisplay = toToken
          ? formatAmount(order.minOut, toToken.decimals, toToken.isStable ? 2 : 4, true)
          : "";

        return (
          <span>
            {getOrderActionTitle(tradeData.action)}: Swap {amountInDisplay}
            {fromToken?.symbol || ""} for
            {minOutDisplay} {toToken?.symbol || ""}, Price:
            {getExchangeRateDisplay(order.triggerRatio, fromToken, toToken)} USD
          </span>
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getTokenInfo, infoTokens, nativeTokenAddress, chainId, liquidationsDataMap]
  );

  const tradesWithMessages = useMemo(() => {
    if (!trades) {
      return [];
    }

    return trades
      .map((trade) => ({
        msg: getMsg(trade),
        ...trade,
      }))
      .filter((trade) => trade.msg);
  }, [trades, getMsg]);

  return (
    <div className="TradeHistory">
      {tradesWithMessages.length === 0 && (
        <div className="TradeHistory-row App-box">
          <span>No trades yet</span>
        </div>
      )}
      {tradesWithMessages.length > 0 &&
        tradesWithMessages.map((trade, index) => {
          const tradeData = trade.data;
          const txUrl = getExplorerUrl(chainId) + "tx/" + tradeData.txhash;

          let msg = getMsg(trade);

          if (!msg) {
            return null;
          }

          return (
            <div className="TradeHistory-row App-box App-box-border" key={index}>
              <div>
                <div className="muted TradeHistory-time">
                  {formatDateTime(tradeData.timestamp)}
                  {(!account || account.length === 0) && (
                    <span>
                      {" "}
                      (<Link to={`/actions/${tradeData.account}`}>{tradeData.account}</Link>)
                    </span>
                  )}
                </div>
                <ExternalLink className="plain TradeHistory-item-link" href={txUrl}>
                  {msg}
                </ExternalLink>
              </div>
            </div>
          );
        })}
      {shouldShowPaginationButtons && (
        <div className="gap-right">
          {pageIndex > 0 && (
            <Button variant="secondary" onClick={loadPrevPage}>
              <span>Prev</span>
            </Button>
          )}
          {trades && trades.length >= TRADES_PAGE_SIZE && (
            <Button variant="secondary" onClick={loadNextPage}>
              <span>Next</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
