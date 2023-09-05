import { useWeb3React } from "@web3-react/core";
import cx from "classnames";

import { NavLink } from "react-router-dom";

import { getContract } from "config/contracts";
import * as Api from "domain/legacy";
import { useAllOrders, useAllOrdersStats, usePositionsForOrders } from "domain/legacy";
import {
  DECREASE,
  getExchangeRate,
  getExchangeRateDisplay,
  getOrderKey,
  INCREASE,
  shortenAddress,
  shouldInvertTriggerRatio,
  SWAP,
  USD_DECIMALS,
} from "lib/legacy";

import "./OrdersOverview.css";
import { t } from "@lingui/macro";
import { getTokenInfo } from "domain/tokens/utils";
import { useInfoTokens } from "domain/tokens";
import { formatAmount } from "lib/numbers";
import { useChainId } from "lib/chains";
import { formatDateTime } from "lib/dates";

export default function OrdersOverview() {
  const { chainId } = useChainId();
  const { library, account, active } = useWeb3React();

  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");

  const { infoTokens } = useInfoTokens(library, chainId, active, undefined, undefined);

  const orders = useAllOrders(chainId, library);
  const stats = useAllOrdersStats(chainId);
  const ORDER_TYPE_LABELS = {
    Increase: t`Increase`,
    Decrease: t`Decrease`,
    Swap: t`Swap`,
  };

  const positionsForOrders = usePositionsForOrders(
    chainId,
    library,
    orders.filter((order) => order.type === DECREASE)
  );

  let openTotal;
  let executedTotal;
  let cancelledTotal;

  if (stats) {
    openTotal = stats.openDecrease + stats.openIncrease + stats.openSwap;
    executedTotal = stats.executedDecrease + stats.executedIncrease + stats.executedSwap;
    cancelledTotal = stats.cancelledDecrease + stats.cancelledIncrease + stats.cancelledSwap;
  }

  const NEAR_TRESHOLD = 98;

  const executeOrder = (evt, order) => {
    evt.preventDefault();

    const params = [chainId, library, order.account, order.index, account];
    let method;
    if (order.type === "Swap") {
      method = "executeSwapOrder";
    } else if (order.type === "Increase") {
      method = "executeIncreaseOrder";
    } else {
      method = "executeDecreaseOrder";
    }
    return Api[method](...params);
  };

  return (
    <div className="Orders-overview">
      {stats && (
        <p className="Orders-overview-stats">
          <span>
            Total active: {openTotal}, executed: {executedTotal}, cancelled: {cancelledTotal}
          </span>
          <br />
          <span>
            Increase active: {stats.openIncrease}, executed: {stats.executedIncrease}, cancelled:{" "}
            {stats.cancelledIncrease}
          </span>
          <br />
          <span>
            Decrease active: {stats.openDecrease}, executed: {stats.executedDecrease}, cancelled:{" "}
            {stats.cancelledDecrease}
          </span>
          <br />
          <span>
            Swap active: {stats.openSwap}, executed: {stats.executedSwap}, cancelled: {stats.cancelledSwap}
          </span>
          <br />
        </p>
      )}
      <p>
        <span className="positive">
          <span>Price conditions are met</span>
        </span>
        <br />
        <span style={{ color: "orange" }}>
          <span>Close to execution price</span>
        </span>
        <br />
        <span className="negative">
          <span>Can't execute because of an error</span>
        </span>
      </p>
      <table className="Orders-overview-table">
        <thead>
          <tr>
            <th>
              <span>Type</span>
            </th>
            <th colSpan="2">
              <span>Order</span>
            </th>
            <th>
              <span>Price</span>
            </th>
            <th>
              <span>Mark Price</span>
            </th>
            <th>
              <span>Diff</span>
            </th>
            <th>
              <span>Account</span>
            </th>
            <th>
              <span>Created At</span>
            </th>
            <th>
              <span>Index</span>
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const { type } = order;
            const key = getOrderKey(order);
            if (type === SWAP) {
              const fromToken = getTokenInfo(infoTokens, order.path[0], true, nativeTokenAddress);
              const toTokenAddress = order.path[order.path.length - 1];
              const toToken = getTokenInfo(infoTokens, toTokenAddress, order.shoudUnwrap, nativeTokenAddress);

              let markExchangeRate;
              let prefix;
              let shouldExecute;
              let nearExecute;
              let diffPercent;
              let invalidToken = false;
              let error;
              if (fromToken && toToken) {
                const invert = shouldInvertTriggerRatio(fromToken, toToken);
                markExchangeRate = getExchangeRate(fromToken, toToken);
                prefix =
                  (order.triggerAboveThreshold && !invert) || (!order.triggerAboveThreshold && invert) ? "> " : "< ";
                shouldExecute = markExchangeRate && markExchangeRate.lt(order.triggerRatio);
                nearExecute = markExchangeRate && markExchangeRate.lt(order.triggerRatio.mul(100).div(NEAR_TRESHOLD));

                if (markExchangeRate) {
                  const diff = order.triggerRatio.gt(markExchangeRate)
                    ? order.triggerRatio.sub(markExchangeRate)
                    : markExchangeRate.sub(order.triggerRatio);
                  diffPercent = diff.mul(10000).div(markExchangeRate);
                }
              } else {
                invalidToken = true;
                error = t`Invalid token fromToken: "${order.path0}" toToken: "${toTokenAddress}"`;
              }

              return (
                <tr key={key}>
                  <td>{ORDER_TYPE_LABELS[order.type]}</td>
                  <td colSpan="2">
                    {!invalidToken && (
                      <>
                        {formatAmount(order.amountIn, fromToken.decimals, 4, true)} {fromToken.symbol}
                        &nbsp;for&nbsp;
                        {formatAmount(order.minOut, toToken.decimals, 4, true)} {toToken.symbol}
                      </>
                    )}
                  </td>
                  <td className={cx({ positive: shouldExecute, near: !shouldExecute && nearExecute })}>
                    {!invalidToken && prefix}
                    {getExchangeRateDisplay(order.triggerRatio, fromToken, toToken)}
                  </td>
                  <td className={cx({ positive: shouldExecute, near: !shouldExecute && nearExecute })}>
                    {getExchangeRateDisplay(markExchangeRate, fromToken, toToken)}
                  </td>
                  <td className={cx({ positive: shouldExecute, near: !shouldExecute && nearExecute })}>
                    {formatAmount(diffPercent, 2, 2)}%
                  </td>
                  <td>
                    <NavLink to={`/actions/${order.account}`}>{shortenAddress(order.account)}</NavLink>
                  </td>
                  <td>{formatDateTime(order.createdTimestamp)}</td>
                  <td>{order.index}</td>
                  <td className="negative">{error}</td>
                  <td>
                    <button className="Orders-overview-action" onClick={(evt) => executeOrder(evt, order)}>
                      Execute
                    </button>
                  </td>
                </tr>
              );
            } else {
              const indexToken = getTokenInfo(infoTokens, order.indexToken, true, nativeTokenAddress);
              const collateralToken = getTokenInfo(infoTokens, order.collateralToken, true, nativeTokenAddress);
              const purchaseToken = getTokenInfo(infoTokens, order.purchaseToken);

              let markPrice;
              let error;
              if (indexToken && collateralToken && (order.type === DECREASE || purchaseToken)) {
                markPrice = order.triggerAboveThreshold ? indexToken.minPrice : indexToken.maxPrice;
              } else {
                error = t`Invalid token indexToken: "${order.indexToken}" collateralToken: "${order.collateralToken}"`;
                if (order.type === "increase") {
                  error += ` purchaseToken: ${order.purchaseToken}`;
                }
              }

              let shouldExecute;
              let nearExecute;
              let diffPercent;
              if (markPrice) {
                shouldExecute = order.triggerAboveThreshold
                  ? markPrice.gt(order.triggerPrice)
                  : markPrice.lt(order.triggerPrice);

                nearExecute = order.triggerAboveThreshold
                  ? markPrice.gt(order.triggerPrice.mul(NEAR_TRESHOLD).div(100))
                  : markPrice.lt(order.triggerPrice.mul(100).div(NEAR_TRESHOLD));

                const diff = markPrice.gt(order.triggerPrice)
                  ? markPrice.sub(order.triggerPrice)
                  : order.triggerPrice.sub(markPrice);
                diffPercent = diff.mul(10000).div(markPrice);
              }

              if (!error && type === DECREASE) {
                if (positionsForOrders && key in positionsForOrders) {
                  const position = positionsForOrders[key];
                  if (!position) {
                    error = t`No position`;
                  } else if (order.sizeDelta.gt(position[0])) {
                    error = t`Order size exceeds position`;
                  } else if (order.sizeDelta.eq(0)) {
                    error = t`Order size is 0`;
                  }
                }
              }
              return (
                <tr key={key}>
                  <td>{ORDER_TYPE_LABELS[order.type]}</td>
                  <td>
                    {order.isLong ? t`Long` : t`Short`} {indexToken && indexToken.symbol}
                  </td>
                  <td>
                    {type === INCREASE ? "+" : "-"}${formatAmount(order.sizeDelta, USD_DECIMALS, 2, true)}
                  </td>
                  <td className={cx({ positive: shouldExecute, near: !shouldExecute && nearExecute })}>
                    {order.triggerAboveThreshold ? "> " : "< "}
                    {formatAmount(order.triggerPrice, USD_DECIMALS, 2, true)}
                  </td>
                  <td className={cx({ positive: shouldExecute, near: !shouldExecute && nearExecute })}>
                    ${formatAmount(markPrice, USD_DECIMALS, 2, true)}
                  </td>
                  <td className={cx({ positive: shouldExecute, near: !shouldExecute && nearExecute })}>
                    {formatAmount(diffPercent, 2, 2)}%
                  </td>
                  <td>
                    <NavLink to={`/actions/${order.account}`}>{shortenAddress(order.account, 12)}</NavLink>
                  </td>
                  <td>{formatDateTime(order.createdTimestamp)}</td>
                  <td>{order.index}</td>
                  <td className="negative">{error}</td>
                  <td>
                    <button className="Orders-overview-action" onClick={(evt) => executeOrder(evt, order)}>
                      <span>Execute</span>
                    </button>
                  </td>
                </tr>
              );
            }
          })}
        </tbody>
      </table>
    </div>
  );
}
