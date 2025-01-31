import { useWeb3React } from "@web3-react/core";
import cx from "classnames";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import Modal from "components/Modal/Modal";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { getContract } from "config/contracts";
import { HIGH_SPREAD_THRESHOLD } from "config/factors";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useUserReferralCode } from "domain/referrals/hooks";
import {
  ExecutionFee,
  getBorrowingFactorPerPeriod,
  getFundingFactorPerPeriod,
  getIsHighPriceImpact,
} from "domain/synthetics/fees";
import { MarketInfo } from "domain/synthetics/markets";
import {
  OrderType,
  OrdersInfoData,
  PositionOrderInfo,
  createDecreaseOrderTxn,
  createIncreaseOrderTxn,
  createSwapOrderTxn,
  isLimitOrderType,
  isOrderForPosition,
  isTriggerDecreaseOrderType,
} from "domain/synthetics/orders";
import { cancelOrdersTxn } from "domain/synthetics/orders/cancelOrdersTxn";
import { createWrapOrUnwrapTxn } from "domain/synthetics/orders/createWrapOrUnwrapTxn";
import {
  PositionInfo,
  formatAcceptablePrice,
  formatLeverage,
  formatLiquidationPrice,
  getPositionKey,
} from "domain/synthetics/positions";
import {
  TokenData,
  TokensData,
  TokensRatio,
  convertToTokenAmount,
  formatTokensRatio,
  getNeedTokenApprove,
  useTokensAllowanceData,
} from "domain/synthetics/tokens";
import {
  DecreasePositionAmounts,
  IncreasePositionAmounts,
  NextPositionValues,
  SwapAmounts,
  TradeFees,
  TriggerThresholdType,
  applySlippageToMinOut,
} from "domain/synthetics/trade";
import { TradeFlags } from "domain/synthetics/trade/useTradeFlags";
import { getIsEquivalentTokens, getSpread } from "domain/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { CHART_PERIODS, USD_DECIMALS } from "lib/legacy";
import { BASIS_POINTS_DIVISOR, DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";

import {
  bigNumberify,
  formatAmount,
  formatDeltaUsd,
  formatPercentage,
  formatTokenAmount,
  formatTokenAmountWithUsd,
  formatUsd,
} from "lib/numbers";
import { usePrevious } from "lib/usePrevious";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";
import "./ConfirmationBox.scss";
import SlippageInput from "components/SlippageInput/SlippageInput";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { helperToast } from "lib/helperToast";
import { useKey } from "react-use";

export type Props = {
  isVisible: boolean;
  tradeFlags: TradeFlags;
  isWrapOrUnwrap: boolean;
  fromToken?: TokenData;
  toToken?: TokenData;
  markPrice?: BigNumber;
  markRatio?: TokensRatio;
  triggerPrice?: BigNumber;
  fixedTriggerThresholdType?: TriggerThresholdType;
  fixedTriggerOrderType?: OrderType.LimitDecrease | OrderType.StopLossDecrease;
  fixedTriggerAcceptablePrice?: BigNumber;
  triggerRatio?: TokensRatio;
  marketInfo?: MarketInfo;
  collateralToken?: TokenData;
  swapAmounts?: SwapAmounts;
  increaseAmounts?: IncreasePositionAmounts;
  decreaseAmounts?: DecreasePositionAmounts;
  nextPositionValues?: NextPositionValues;
  keepLeverage?: boolean;
  swapLiquidityUsd?: BigNumber;
  longLiquidityUsd?: BigNumber;
  shortLiquidityUsd?: BigNumber;
  fees?: TradeFees;
  executionFee?: ExecutionFee;
  error?: string;
  existingPosition?: PositionInfo;
  shouldDisableValidation: boolean;
  isHigherSlippageAllowed?: boolean;
  ordersData?: OrdersInfoData;
  tokensData?: TokensData;
  setIsHigherSlippageAllowed: (isHigherSlippageAllowed: boolean) => void;
  setKeepLeverage: (keepLeverage: boolean) => void;
  onClose: () => void;
  onSubmitted: () => void;
  setPendingTxns: (txns: any) => void;
  onConnectWallet: () => void;
};

export function ConfirmationBox(p: Props) {
  const {
    tradeFlags,
    isWrapOrUnwrap,
    fromToken,
    toToken,
    markPrice,
    markRatio,
    triggerPrice,
    fixedTriggerThresholdType,
    fixedTriggerOrderType,
    fixedTriggerAcceptablePrice,
    triggerRatio,
    marketInfo,
    collateralToken,
    swapAmounts,
    increaseAmounts,
    decreaseAmounts,
    nextPositionValues,
    swapLiquidityUsd,
    longLiquidityUsd,
    shortLiquidityUsd,
    keepLeverage,
    fees,
    executionFee,
    error,
    existingPosition,
    shouldDisableValidation,
    ordersData,
    tokensData,
    setKeepLeverage,
    onClose,
    onSubmitted,
    setPendingTxns,
    onConnectWallet,
  } = p;

  const { isLong, isShort, isPosition, isSwap, isMarket, isLimit, isTrigger, isIncrease } = tradeFlags;
  const { indexToken } = marketInfo || {};

  const { library, account } = useWeb3React();
  const { chainId } = useChainId();
  const { setPendingPosition, setPendingOrder } = useSyntheticsEvents();
  const { savedAllowedSlippage } = useSettings();

  const prevIsVisible = usePrevious(p.isVisible);

  const { referralCodeForTxn } = useUserReferralCode(library, chainId, account);

  const [isTriggerWarningAccepted, setIsTriggerWarningAccepted] = useState(false);
  const [isHighPriceImpactAccepted, setIsHighPriceImpactAccepted] = useState(false);
  const [isLimitOrdersVisible, setIsLimitOrdersVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allowedSlippage, setAllowedSlippage] = useState(savedAllowedSlippage);
  const submitButtonRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    setAllowedSlippage(savedAllowedSlippage);
  }, [savedAllowedSlippage]);

  const payAmount = useMemo(() => {
    if (isSwap && !isWrapOrUnwrap) {
      return swapAmounts?.amountIn;
    }
    if (isIncrease) {
      return increaseAmounts?.initialCollateralAmount;
    }
  }, [increaseAmounts?.initialCollateralAmount, isIncrease, isSwap, isWrapOrUnwrap, swapAmounts?.amountIn]);

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: getContract(chainId, "SyntheticsRouter"),
    tokenAddresses: fromToken ? [fromToken.address] : [],
    skip: !p.isVisible,
  });

  const needPayTokenApproval =
    !isWrapOrUnwrap &&
    tokensAllowanceData &&
    fromToken &&
    payAmount &&
    getNeedTokenApprove(tokensAllowanceData, fromToken.address, payAmount);

  const isHighPriceImpact = getIsHighPriceImpact(fees?.positionPriceImpact, fees?.swapPriceImpact);

  const positionKey = useMemo(() => {
    if (!account || !marketInfo || !collateralToken) {
      return undefined;
    }

    return getPositionKey(account, marketInfo.marketTokenAddress, collateralToken.address, isLong);
  }, [account, collateralToken, isLong, marketInfo]);

  const positionOrders = useMemo(() => {
    if (!positionKey || !ordersData) {
      return [];
    }

    return Object.values(ordersData).filter((order) => isOrderForPosition(order, positionKey)) as PositionOrderInfo[];
  }, [ordersData, positionKey]);

  const existingLimitOrders = useMemo(
    () => positionOrders.filter((order) => isLimitOrderType(order.orderType)),
    [positionOrders]
  );

  const existingTriggerOrders = useMemo(
    () => positionOrders.filter((order) => isTriggerDecreaseOrderType(order.orderType)),
    [positionOrders]
  );

  const decreaseOrdersThatWillBeExecuted = useMemo(() => {
    if (!existingPosition || !markPrice) {
      return [];
    }

    return existingTriggerOrders.filter((order) => {
      return order.triggerThresholdType === TriggerThresholdType.Above
        ? markPrice.gt(order.triggerPrice)
        : markPrice.lt(order.triggerPrice);
    });
  }, [existingPosition, existingTriggerOrders, markPrice]);

  const swapSpreadInfo = useMemo(() => {
    let spread = BigNumber.from(0);

    if (isSwap && fromToken && toToken) {
      const fromSpread = getSpread(fromToken.prices);
      const toSpread = getSpread(toToken.prices);

      spread = fromSpread.add(toSpread);
    } else if (isIncrease && fromToken && indexToken) {
      const fromSpread = getSpread(fromToken.prices);
      const toSpread = getSpread(indexToken.prices);

      spread = fromSpread.add(toSpread);

      if (isLong) {
        spread = fromSpread;
      }
    }

    const isHigh = spread.gt(HIGH_SPREAD_THRESHOLD);

    const showSpread = isMarket;

    return { spread, showSpread, isHigh };
  }, [isSwap, fromToken, toToken, isIncrease, indexToken, isMarket, isLong]);

  const collateralSpreadInfo = useMemo(() => {
    if (!indexToken || !collateralToken) {
      return undefined;
    }

    let totalSpread = getSpread(indexToken.prices);

    if (getIsEquivalentTokens(collateralToken, indexToken)) {
      return {
        spread: totalSpread,
        isHigh: totalSpread.gt(HIGH_SPREAD_THRESHOLD),
      };
    }

    totalSpread = totalSpread.add(getSpread(collateralToken!.prices!));

    return {
      spread: totalSpread,
      isHigh: totalSpread.gt(HIGH_SPREAD_THRESHOLD),
    };
  }, [collateralToken, indexToken]);

  const title = useMemo(() => {
    if (isMarket) {
      if (isSwap) {
        return `Confirm Swap`;
      }

      return isLong ? `Confirm Long` : `Confirm Short`;
    }

    if (isLimit) {
      return `Confirm Limit Order`;
    }

    return `Confirm Trigger Order`;
  }, [isLimit, isLong, isMarket, isSwap]);

  const submitButtonState = useMemo(() => {
    if (isSubmitting) {
      return {
        text: `Creating Order...`,
        disabled: true,
      };
    }

    if (error) {
      return {
        text: error,
        disabled: true,
      };
    }

    if (needPayTokenApproval) {
      return { text: `Pending ${fromToken?.symbol} approval`, disabled: true };
    }

    if (isHighPriceImpact && !isHighPriceImpactAccepted) {
      return { text: `Price Impact not yet acknowledged`, disabled: true };
    }

    if (isIncrease && decreaseOrdersThatWillBeExecuted.length > 0 && !isTriggerWarningAccepted) {
      return {
        text: `Accept confirmation of trigger orders`,
        disabled: true,
      };
    }

    let text = "";

    if (isMarket) {
      if (isSwap) {
        text = `Swap`;
      } else {
        text = isLong ? `Long` : `Short`;
      }
    } else if (isLimit) {
      text = `Confirm Limit Order`;
    } else {
      text = `Confirm Trigger Order`;
    }

    return {
      text,
      disabled: false,
    };
  }, [
    decreaseOrdersThatWillBeExecuted.length,
    error,
    fromToken?.symbol,
    isHighPriceImpact,
    isHighPriceImpactAccepted,
    isIncrease,
    isLimit,
    isLong,
    isMarket,
    isSubmitting,
    isSwap,
    isTriggerWarningAccepted,
    needPayTokenApproval,
  ]);

  useKey(
    "Enter",
    () => {
      if (p.isVisible && !submitButtonState.disabled) {
        submitButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        onSubmit();
      }
    },
    {},
    [p.isVisible, submitButtonState.disabled]
  );

  function onCancelOrderClick(key: string): void {
    cancelOrdersTxn(chainId, library, { orderKeys: [key], setPendingTxns: p.setPendingTxns });
  }

  function onSubmitWrapOrUnwrap() {
    if (!account || !swapAmounts || !fromToken) {
      return Promise.resolve();
    }

    return createWrapOrUnwrapTxn(chainId, library, {
      amount: swapAmounts.amountIn,
      isWrap: Boolean(fromToken.isNative),
      setPendingTxns,
    });
  }

  function onSubmitSwap() {
    if (
      !account ||
      !tokensData ||
      !swapAmounts?.swapPathStats ||
      !fromToken ||
      !toToken ||
      !executionFee ||
      typeof allowedSlippage !== "number"
    ) {
      helperToast.error(`Error submitting order`);
      return Promise.resolve();
    }

    return createSwapOrderTxn(chainId, library, {
      account,
      fromTokenAddress: fromToken.address,
      fromTokenAmount: swapAmounts.amountIn,
      swapPath: swapAmounts.swapPathStats?.swapPath,
      toTokenAddress: toToken.address,
      orderType: isLimit ? OrderType.LimitSwap : OrderType.MarketSwap,
      minOutputAmount: swapAmounts.minOutputAmount,
      referralCode: referralCodeForTxn,
      executionFee: executionFee.feeTokenAmount,
      allowedSlippage,
      tokensData,
      setPendingTxns,
      setPendingOrder,
    });
  }

  function onSubmitIncreaseOrder() {
    if (
      !tokensData ||
      !account ||
      !fromToken ||
      !collateralToken ||
      !increaseAmounts?.acceptablePrice ||
      !executionFee ||
      !marketInfo ||
      typeof allowedSlippage !== "number"
    ) {
      helperToast.error(`Error submitting order`);
      return Promise.resolve();
    }

    return createIncreaseOrderTxn(chainId, library, {
      account,
      marketAddress: marketInfo.marketTokenAddress,
      initialCollateralAddress: fromToken?.address,
      initialCollateralAmount: increaseAmounts.initialCollateralAmount,
      targetCollateralAddress: collateralToken.address,
      collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
      swapPath: increaseAmounts.swapPathStats?.swapPath || [],
      sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
      sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
      triggerPrice: isLimit ? triggerPrice : undefined,
      acceptablePrice: increaseAmounts.acceptablePrice,
      isLong,
      orderType: isLimit ? OrderType.LimitIncrease : OrderType.MarketIncrease,
      executionFee: executionFee.feeTokenAmount,
      allowedSlippage,
      referralCode: referralCodeForTxn,
      indexToken: marketInfo.indexToken,
      tokensData,
      skipSimulation: isLimit || shouldDisableValidation,
      setPendingTxns: p.setPendingTxns,
      setPendingOrder,
      setPendingPosition,
    });
  }

  function onSubmitDecreaseOrder() {
    if (
      !account ||
      !marketInfo ||
      !collateralToken ||
      fixedTriggerOrderType === undefined ||
      fixedTriggerThresholdType === undefined ||
      !fixedTriggerAcceptablePrice ||
      !decreaseAmounts?.triggerPrice ||
      !executionFee ||
      !tokensData ||
      typeof allowedSlippage !== "number"
    ) {
      helperToast.error(`Error submitting order`);
      return Promise.resolve();
    }

    return createDecreaseOrderTxn(chainId, library, {
      account,
      marketAddress: marketInfo.marketTokenAddress,
      swapPath: [],
      initialCollateralDeltaAmount: decreaseAmounts.collateralDeltaAmount,
      initialCollateralAddress: collateralToken.address,
      receiveTokenAddress: collateralToken.address,
      triggerPrice: decreaseAmounts.triggerPrice,
      acceptablePrice: fixedTriggerAcceptablePrice,
      sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
      sizeDeltaInTokens: decreaseAmounts.sizeDeltaInTokens,
      minOutputUsd: BigNumber.from(0),
      isLong,
      decreasePositionSwapType: decreaseAmounts.decreaseSwapType,
      orderType: fixedTriggerOrderType,
      executionFee: executionFee.feeTokenAmount,
      allowedSlippage,
      referralCode: referralCodeForTxn,
      // Skip simulation to avoid EmptyPosition error
      // skipSimulation: !existingPosition || shouldDisableValidation,
      skipSimulation: true,
      indexToken: marketInfo.indexToken,
      tokensData,
      setPendingTxns,
      setPendingOrder,
      setPendingPosition,
    });
  }

  function onSubmit() {
    setIsSubmitting(true);

    let txnPromise: Promise<any>;

    if (!account) {
      onConnectWallet();
      return;
    } else if (isWrapOrUnwrap) {
      txnPromise = onSubmitWrapOrUnwrap();
    } else if (isSwap) {
      txnPromise = onSubmitSwap();
    } else if (isIncrease) {
      txnPromise = onSubmitIncreaseOrder();
    } else {
      txnPromise = onSubmitDecreaseOrder();
    }

    txnPromise
      .then(() => {
        onSubmitted();
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  useEffect(
    function reset() {
      if (p.isVisible !== prevIsVisible) {
        setIsTriggerWarningAccepted(false);
        setIsHighPriceImpactAccepted(false);
      }
    },
    [p.isVisible, prevIsVisible]
  );

  function renderMain() {
    if (isSwap) {
      return (
        <div className="Confirmation-box-main">
          <div>
            <span>Pay</span>{" "}
            {formatTokenAmountWithUsd(
              swapAmounts?.amountIn,
              swapAmounts?.usdIn,
              fromToken?.symbol,
              fromToken?.decimals
            )}
          </div>
          <div className="Confirmation-box-main-icon"></div>
          <div>
            <span>Receive</span>{" "}
            {formatTokenAmountWithUsd(swapAmounts?.amountOut, swapAmounts?.usdOut, toToken?.symbol, toToken?.decimals)}
          </div>
        </div>
      );
    }

    if (isIncrease) {
      return (
        <div className="Confirmation-box-main">
          <span>
            <span>Pay</span>{" "}
            {formatTokenAmountWithUsd(
              increaseAmounts?.initialCollateralAmount,
              increaseAmounts?.initialCollateralUsd,
              fromToken?.symbol,
              fromToken?.decimals
            )}
          </span>
          <div className="Confirmation-box-main-icon"></div>
          <div>
            {isLong ? `Long` : `Short`}{" "}
            {formatTokenAmountWithUsd(
              increaseAmounts?.sizeDeltaInTokens,
              increaseAmounts?.sizeDeltaUsd,
              toToken?.symbol,
              toToken?.decimals
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={cx("Confirmation-box-main ConfirmationBox-main")}>
        <span>Decrease</span>&nbsp;{indexToken?.symbol} {isLong ? `Long` : `Short`}
      </div>
    );
  }

  function renderOrderItem(order: PositionOrderInfo) {
    return (
      <li key={order.key} className="font-sm">
        <p>
          {isLimitOrderType(order.orderType) ? `Increase` : `Decrease`} {order.indexToken?.symbol}{" "}
          {formatUsd(order.sizeDeltaUsd)} {order.isLong ? `Long` : `Short`} &nbsp;
          {order.triggerThresholdType}
          {formatUsd(order.triggerPrice, {
            displayDecimals: toToken?.priceDecimals,
          })}{" "}
        </p>
        <button type="button" onClick={() => onCancelOrderClick(order.key)}>
          <span>Cancel</span>
        </button>
      </li>
    );
  }

  const longShortText = isLong ? `Long` : `Short`;

  function renderDifferentTokensWarning() {
    if (!isPosition || !fromToken || !toToken) {
      return null;
    }
    const isCollateralTokenNonStable = !collateralToken?.isStable;
    const collateralTokenSymbol = collateralToken?.[collateralToken?.isWrapped ? "baseSymbol" : "symbol"];
    const indexTokenSymbol = indexToken?.[indexToken?.isWrapped ? "baseSymbol" : "symbol"];

    if (isCollateralTokenNonStable && collateralTokenSymbol !== indexTokenSymbol) {
      return (
        <div className="Confirmation-box-info">
          <span>
            You have selected {collateralTokenSymbol} as Collateral, the Liquidation Price will vary based on the price
            of {collateralTokenSymbol}.
          </span>
        </div>
      );
    }

    if (isLong && isCollateralTokenNonStable && collateralTokenSymbol === indexTokenSymbol) {
      return (
        <div className="Confirmation-box-info">
          <span>
            You have selected {collateralTokenSymbol} as collateral, the Liquidation Price is higher compared to using a
            stablecoin as collateral since the worth of the collateral will change with its price. If required, you can
            change the collateral type using the Collateral In option in the trade box.
          </span>
        </div>
      );
    }

    if (isShort && isCollateralTokenNonStable && collateralTokenSymbol === indexTokenSymbol) {
      return (
        <div className="Confirmation-box-info">
          <span>
            You have selected {collateralTokenSymbol} as collateral to short {indexTokenSymbol}.
          </span>
        </div>
      );
    }
  }

  function renderExistingLimitOrdersWarning() {
    if (!existingLimitOrders?.length || !toToken) {
      return;
    }

    if (existingLimitOrders.length === 1) {
      const order = existingLimitOrders[0];

      const sizeText = formatUsd(order.sizeDeltaUsd);

      return (
        <div className="Confirmation-box-info">
          <span>
            You have an active Limit Order to Increase {longShortText} {order.indexToken?.symbol} {sizeText} at price{" "}
            {formatUsd(order.triggerPrice, {
              displayDecimals: toToken.priceDecimals,
            })}
            .
          </span>
        </div>
      );
    } else {
      return (
        <div>
          <div className="Confirmation-box-info">
            <span>
              <span>
                You have multiple existing Increase {longShortText} {toToken.symbol} limit orders{" "}
              </span>
            </span>
            <span onClick={() => setIsLimitOrdersVisible((p) => !p)} className="view-orders">
              ({isLimitOrdersVisible ? `hide` : `view`})
            </span>
          </div>
          {isLimitOrdersVisible && <ul className="order-list">{existingLimitOrders.map(renderOrderItem)}</ul>}
        </div>
      );
    }
  }

  function renderExistingTriggerErrors() {
    if (!decreaseOrdersThatWillBeExecuted?.length) {
      return;
    }

    const existingTriggerOrderLength = decreaseOrdersThatWillBeExecuted.length;
    return (
      <>
        <div className="Confirmation-box-warning">
          <Plural
            value={existingTriggerOrderLength}
            one="You have an active trigger order that might execute immediately after you open this position. Please cancel the order or accept the confirmation to continue."
            other="You have # active trigger orders that might execute immediately after you open this position. Please cancel the orders or accept the confirmation to continue."
          />
        </div>
        <ul className="order-list">{decreaseOrdersThatWillBeExecuted.map(renderOrderItem)}</ul>
      </>
    );
  }

  function renderExistingTriggerWarning() {
    if (
      !existingTriggerOrders?.length ||
      decreaseOrdersThatWillBeExecuted.length > 0 ||
      renderExistingLimitOrdersWarning()
    ) {
      return;
    }

    const existingTriggerOrderLength = existingTriggerOrders.length;

    return (
      <div className="Confirmation-box-info">
        <Plural
          value={existingTriggerOrderLength}
          one="You have an active trigger order that could impact this position."
          other="You have # active trigger orders that could impact this position."
        />
      </div>
    );
  }

  function renderAvailableLiquidity() {
    const riskThresholdBps = 5000;
    let availableLiquidityUsd: BigNumber | undefined = undefined;
    let availableLiquidityAmount: BigNumber | undefined = undefined;
    let isLiquidityRisk = false;

    let tooltipContent = "";

    if (isSwap && swapAmounts) {
      availableLiquidityUsd = swapLiquidityUsd;

      availableLiquidityAmount = convertToTokenAmount(
        availableLiquidityUsd,
        toToken?.decimals,
        toToken?.prices.maxPrice
      );

      isLiquidityRisk = availableLiquidityUsd!.mul(riskThresholdBps).div(BASIS_POINTS_DIVISOR).lt(swapAmounts.usdOut);

      tooltipContent = isLiquidityRisk
        ? `There may not be sufficient liquidity to execute your order when the Min. Receive are met.`
        : `The order will only execute if the Min. Receive is met and there is sufficient liquidity.`;
    }

    if (isIncrease && increaseAmounts) {
      availableLiquidityUsd = isLong ? longLiquidityUsd : shortLiquidityUsd;

      isLiquidityRisk = availableLiquidityUsd!
        .mul(riskThresholdBps)
        .div(BASIS_POINTS_DIVISOR)
        .lt(increaseAmounts.sizeDeltaUsd);

      tooltipContent = isLiquidityRisk
        ? `There may not be sufficient liquidity to execute your order when the price conditions are met.`
        : `The order will only execute if the price conditions are met and there is sufficient liquidity.`;
    }

    return (
      <ExchangeInfoRow label={`Available Liquidity`}>
        <Tooltip
          position="right-bottom"
          handleClassName={isLiquidityRisk ? "negative" : ""}
          handle={
            isSwap
              ? formatTokenAmount(availableLiquidityAmount, toToken?.decimals, toToken?.symbol)
              : formatUsd(availableLiquidityUsd)
          }
          renderContent={() => tooltipContent}
        />
      </ExchangeInfoRow>
    );
  }

  function renderSwapSpreadWarining() {
    if (!isMarket) {
      return null;
    }

    if (swapSpreadInfo.spread && swapSpreadInfo.isHigh) {
      return (
        <div className="Confirmation-box-warning">
          <span>The spread is {`>`} 1%, please ensure the trade details are acceptable before comfirming</span>
        </div>
      );
    }
  }

  function renderLimitPriceWarning() {
    return (
      <div className="Confirmation-box-info">
        <span>Limit Order Price will vary based on Fees and Price Impact to guarantee the Min. Receive amount.</span>
      </div>
    );
  }

  const renderCollateralSpreadWarning = useCallback(() => {
    if (collateralSpreadInfo && collateralSpreadInfo.isHigh) {
      return (
        <div className="Confirmation-box-warning">
          <span>
            Transacting with a depegged stable coin is subject to spreads reflecting the worse of current market price
            or $1.00, with transactions involving multiple stablecoins may have multiple spreads.
          </span>
        </div>
      );
    }
  }, [collateralSpreadInfo]);

  function renderAllowedSlippage(defaultSlippage, setSlippage) {
    return (
      <ExchangeInfoRow
        label={
          <TooltipWithPortal
            handle={`Allowed Slippage`}
            position="left-top"
            renderContent={() => {
              return (
                <div className="text-white">
                  <span>
                    You can edit the default Allowed Slippage in the settings menu on the top right of the page.
                    <br />
                    <br />
                    Note that a low allowed slippage, e.g. less than{" "}
                    {formatPercentage(bigNumberify(DEFAULT_SLIPPAGE_AMOUNT), { signed: false })}, may result in failed
                    orders if prices are volatile.
                  </span>
                </div>
              );
            }}
          />
        }
      >
        <SlippageInput setAllowedSlippage={setSlippage} defaultSlippage={defaultSlippage} />
      </ExchangeInfoRow>
    );
  }

  function renderHighPriceImpactWarning() {
    return (
      <div className="PositionEditor-allow-higher-slippage">
        <Checkbox asRow isChecked={isHighPriceImpactAccepted} setIsChecked={setIsHighPriceImpactAccepted}>
          <span className="muted font-sm">
            <span>Acknowledge high Price Impact</span>
          </span>
        </Checkbox>
      </div>
    );
  }

  function renderIncreaseOrderSection() {
    if (!marketInfo || !fromToken || !collateralToken || !toToken) {
      return null;
    }

    const borrowingRate = getBorrowingFactorPerPeriod(marketInfo, isLong, CHART_PERIODS["1h"]).mul(100);
    const fundigRate = getFundingFactorPerPeriod(marketInfo, isLong, CHART_PERIODS["1h"]).mul(100);
    const isCollateralSwap = !getIsEquivalentTokens(fromToken, collateralToken);
    const existingPriceDecimals = p.existingPosition?.indexToken?.priceDecimals;
    const toTokenPriceDecimals = toToken?.priceDecimals;

    return (
      <>
        <div>
          {renderMain()}
          {renderCollateralSpreadWarning()}
          {renderExistingLimitOrdersWarning()}
          {renderExistingTriggerErrors()}
          {renderExistingTriggerWarning()}
          {renderDifferentTokensWarning()}

          {isLimit && renderAvailableLiquidity()}

          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={`Leverage`}
            value={
              <ValueTransition
                from={formatLeverage(existingPosition?.leverage)}
                to={formatLeverage(nextPositionValues?.nextLeverage) || "-"}
              />
            }
          />

          {isMarket && renderAllowedSlippage(savedAllowedSlippage, setAllowedSlippage)}

          {isMarket && collateralSpreadInfo?.spread && (
            <ExchangeInfoRow label={`Collateral Spread`} isWarning={swapSpreadInfo.isHigh} isTop={true}>
              {formatAmount(collateralSpreadInfo.spread.mul(100), USD_DECIMALS, 2, true)}%
            </ExchangeInfoRow>
          )}

          {isMarket && (
            <ExchangeInfoRow
              className="SwapBox-info-row"
              label={`Entry Price`}
              value={
                <ValueTransition
                  from={formatUsd(p.existingPosition?.entryPrice, {
                    displayDecimals: existingPriceDecimals,
                  })}
                  to={formatUsd(nextPositionValues?.nextEntryPrice, {
                    displayDecimals: toTokenPriceDecimals,
                  })}
                />
              }
            />
          )}

          {isLimit && (
            <ExchangeInfoRow
              isTop
              className="SwapBox-info-row"
              label={`Mark Price`}
              value={
                formatUsd(markPrice, {
                  displayDecimals: toTokenPriceDecimals,
                }) || "-"
              }
            />
          )}

          {isLimit && (
            <ExchangeInfoRow
              className="SwapBox-info-row"
              label={`Limit Price`}
              value={
                formatUsd(triggerPrice, {
                  displayDecimals: toTokenPriceDecimals,
                }) || "-"
              }
            />
          )}

          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={isMarket ? `Price Impact` : `Acceptable Price Impact`}
            value={
              <span className={cx({ positive: isMarket && increaseAmounts?.acceptablePriceDeltaBps?.gt(0) })}>
                {formatPercentage(increaseAmounts?.acceptablePriceDeltaBps, {
                  signed: true,
                }) || "-"}
              </span>
            }
          />

          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={`Acceptable Price`}
            value={
              formatAcceptablePrice(increaseAmounts?.acceptablePrice, {
                displayDecimals: toTokenPriceDecimals,
              }) || "-"
            }
          />

          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={`Liq. Price`}
            value={
              <ValueTransition
                from={
                  p.existingPosition
                    ? formatLiquidationPrice(p.existingPosition?.liquidationPrice, {
                        displayDecimals: existingPriceDecimals,
                      })
                    : undefined
                }
                to={
                  formatLiquidationPrice(nextPositionValues?.nextLiqPrice, {
                    displayDecimals: toTokenPriceDecimals,
                  }) || "-"
                }
              />
            }
          />

          <div className="Exchange-info-row top-line">
            <div>
              {isCollateralSwap ? (
                <Tooltip
                  handle={
                    <span className="Exchange-info-label">
                      <span>Collateral ({collateralToken?.symbol})</span>
                    </span>
                  }
                  position="left-top"
                  renderContent={() => {
                    return (
                      <div>
                        <span>
                          {fromToken?.symbol} will be swapped to {collateralToken?.symbol} on order execution.{" "}
                        </span>{" "}
                        {isLimit && (
                          <span>
                            Collateral value may differ due to different Price Impact at the time of execution.
                          </span>
                        )}
                      </div>
                    );
                  }}
                />
              ) : (
                <span className="Exchange-info-label">
                  <span>Collateral ({collateralToken?.symbol})</span>
                </span>
              )}
            </div>
            <div className="align-right">
              <Tooltip
                handle={formatUsd(increaseAmounts?.collateralDeltaUsd)}
                position="right-top"
                renderContent={() => {
                  return (
                    <>
                      <span>Your position's collateral after deducting fees.</span>
                      <br />
                      <br />
                      <StatsTooltipRow
                        label={`Pay Amount`}
                        value={formatUsd(increaseAmounts?.initialCollateralUsd) || "-"}
                        showDollar={false}
                      />
                      <StatsTooltipRow
                        label={`Fees`}
                        value={
                          fees?.payTotalFees?.deltaUsd && !fees.payTotalFees.deltaUsd.eq(0)
                            ? `${fees.payTotalFees.deltaUsd.gt(0) ? "+" : "-"}${formatUsd(
                                fees.payTotalFees.deltaUsd.abs()
                              )}`
                            : "0.00$"
                        }
                        showDollar={false}
                      />
                      <div className="Tooltip-divider" />
                      <StatsTooltipRow
                        label={`Collateral`}
                        value={formatUsd(increaseAmounts?.collateralDeltaUsd) || "-"}
                        showDollar={false}
                      />
                    </>
                  );
                }}
              />
            </div>
          </div>

          <TradeFeesRow
            {...fees}
            fundingFeeRateStr={
              fundigRate && `${fundigRate.gt(0) ? "+" : "-"}${formatAmount(fundigRate.abs(), 30, 4)}% / 1h`
            }
            borrowFeeRateStr={borrowingRate && `-${formatAmount(borrowingRate, 30, 4)}% / 1h`}
            executionFee={p.executionFee}
            feesType="increase"
            warning={p.executionFee?.warning}
          />

          {(decreaseOrdersThatWillBeExecuted?.length > 0 || isHighPriceImpact) && <div className="line-divider" />}

          {decreaseOrdersThatWillBeExecuted?.length > 0 && (
            <div className="PositionEditor-allow-higher-slippage">
              <Checkbox isChecked={isTriggerWarningAccepted} setIsChecked={setIsTriggerWarningAccepted}>
                <span className="text-warning font-sm">
                  <span>I am aware of the trigger orders</span>
                </span>
              </Checkbox>
            </div>
          )}

          {isHighPriceImpact && renderHighPriceImpactWarning()}
        </div>
      </>
    );
  }

  function renderSwapSection() {
    return (
      <>
        <div>
          {renderMain()}
          {renderSwapSpreadWarining()}
          {isLimit && renderLimitPriceWarning()}
          {swapSpreadInfo.showSpread && swapSpreadInfo.spread && (
            <ExchangeInfoRow label={`Spread`} isWarning={swapSpreadInfo.isHigh}>
              {formatAmount(swapSpreadInfo.spread.mul(100), USD_DECIMALS, 2, true)}%
            </ExchangeInfoRow>
          )}
          {isLimit && renderAvailableLiquidity()}
          {isMarket && renderAllowedSlippage(savedAllowedSlippage, setAllowedSlippage)}
          <ExchangeInfoRow label={`Mark Price`} isTop>
            {formatTokensRatio(fromToken, toToken, markRatio)}
          </ExchangeInfoRow>
          {isLimit && (
            <ExchangeInfoRow label={`Limit Price`}>
              <Tooltip
                position="right-bottom"
                handle={formatTokensRatio(fromToken, toToken, triggerRatio)}
                renderContent={() =>
                  `Limit Order Price to guarantee Min. Receive amount is updated in real time in the Orders tab after the order has been created.`
                }
              />
            </ExchangeInfoRow>
          )}

          <ExchangeInfoRow label={`${fromToken?.symbol} Price`}>
            {formatUsd(swapAmounts?.priceIn, {
              displayDecimals: fromToken?.priceDecimals,
            })}
          </ExchangeInfoRow>

          <ExchangeInfoRow label={`${toToken?.symbol} Price`}>
            {formatUsd(swapAmounts?.priceOut, {
              displayDecimals: toToken?.priceDecimals,
            })}
          </ExchangeInfoRow>

          {!p.isWrapOrUnwrap && (
            <TradeFeesRow
              {...fees}
              isTop
              executionFee={p.executionFee}
              feesType="swap"
              warning={p.executionFee?.warning}
            />
          )}

          <ExchangeInfoRow label={`Min. Receive`} isTop>
            {isMarket && swapAmounts?.minOutputAmount
              ? formatTokenAmount(
                  applySlippageToMinOut(allowedSlippage, swapAmounts.minOutputAmount),
                  toToken?.decimals,
                  toToken?.symbol
                )
              : formatTokenAmount(swapAmounts?.minOutputAmount, toToken?.decimals, toToken?.symbol)}
          </ExchangeInfoRow>

          {isHighPriceImpact && <div className="line-divider" />}

          {isHighPriceImpact && renderHighPriceImpactWarning()}
        </div>
      </>
    );
  }

  function renderTriggerDecreaseSection() {
    const existingPriceDecimals = p.existingPosition?.indexToken?.priceDecimals;
    const toTokenPriceDecimals = toToken?.priceDecimals;
    return (
      <>
        <div>
          {renderMain()}

          {isTrigger && existingPosition?.leverage && (
            <Checkbox asRow isChecked={keepLeverage} setIsChecked={setKeepLeverage}>
              <span className="muted font-sm">
                <span>Keep leverage at {formatLeverage(existingPosition.leverage)} </span>
              </span>
            </Checkbox>
          )}
          <ExchangeInfoRow
            label={`Trigger Price`}
            value={
              triggerPrice
                ? `${fixedTriggerThresholdType} ${formatUsd(triggerPrice, {
                    displayDecimals: toTokenPriceDecimals,
                  })}`
                : "..."
            }
          />

          <ExchangeInfoRow
            isTop
            label={`Mark Price`}
            value={
              p.markPrice
                ? formatUsd(p.markPrice, {
                    displayDecimals: toTokenPriceDecimals,
                  })
                : "..."
            }
          />

          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={`Acceptable Price Impact`}
            value={
              decreaseAmounts?.triggerOrderType === OrderType.StopLossDecrease
                ? "NA"
                : formatPercentage(decreaseAmounts?.acceptablePriceDeltaBps) || "-"
            }
          />

          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={`Acceptable Price`}
            value={
              formatAcceptablePrice(fixedTriggerAcceptablePrice, {
                displayDecimals: toTokenPriceDecimals,
              }) || "-"
            }
          />

          {p.existingPosition && (
            <ExchangeInfoRow
              label={`Liq. Price`}
              value={
                nextPositionValues?.nextSizeUsd?.gt(0) ? (
                  <ValueTransition
                    from={
                      formatUsd(existingPosition?.liquidationPrice, {
                        displayDecimals: existingPriceDecimals,
                      })!
                    }
                    to={formatUsd(nextPositionValues.nextLiqPrice, {
                      displayDecimals: existingPriceDecimals,
                    })}
                  />
                ) : (
                  "-"
                )
              }
            />
          )}

          <ExchangeInfoRow
            label={p.existingPosition?.sizeInUsd ? `Size` : `Decrease size`}
            isTop
            value={
              p.existingPosition?.sizeInUsd ? (
                <ValueTransition
                  from={formatUsd(p.existingPosition.sizeInUsd)!}
                  to={formatUsd(nextPositionValues?.nextSizeUsd)}
                />
              ) : decreaseAmounts?.sizeDeltaUsd ? (
                formatUsd(decreaseAmounts.sizeDeltaUsd)
              ) : (
                "-"
              )
            }
          />

          {p.existingPosition && (
            <ExchangeInfoRow
              label={`Collateral (${p.existingPosition?.collateralToken?.symbol})`}
              value={
                <ValueTransition
                  from={formatUsd(existingPosition?.remainingCollateralUsd)!}
                  to={formatUsd(nextPositionValues?.nextCollateralUsd)}
                />
              }
            />
          )}

          {!p.keepLeverage && p.existingPosition?.leverage && (
            <ExchangeInfoRow
              label={`Leverage`}
              value={
                nextPositionValues?.nextSizeUsd?.gt(0) ? (
                  <ValueTransition
                    from={formatLeverage(p.existingPosition?.leverage)}
                    to={formatLeverage(nextPositionValues.nextLeverage) || "-"}
                  />
                ) : (
                  "-"
                )
              }
            />
          )}
          {existingPosition && (
            <ExchangeInfoRow
              label={`PnL`}
              value={
                <ValueTransition
                  from={
                    <>
                      {formatDeltaUsd(decreaseAmounts?.estimatedPnl)} (
                      {formatPercentage(decreaseAmounts?.estimatedPnlPercentage, { signed: true })})
                    </>
                  }
                  to={
                    <>
                      {formatDeltaUsd(nextPositionValues?.nextPnl)} (
                      {formatPercentage(nextPositionValues?.nextPnlPercentage, { signed: true })})
                    </>
                  }
                />
              }
            />
          )}

          <TradeFeesRow {...fees} executionFee={p.executionFee} feesType="decrease" warning={p.executionFee?.warning} />

          {existingPosition && decreaseAmounts?.receiveUsd && (
            <ExchangeInfoRow
              label={`Receive`}
              value={formatTokenAmountWithUsd(
                decreaseAmounts.receiveTokenAmount,
                decreaseAmounts.receiveUsd,
                collateralToken?.symbol,
                collateralToken?.decimals
              )}
            />
          )}

          {isHighPriceImpact && <div className="line-divider" />}

          {isHighPriceImpact && renderHighPriceImpactWarning()}
        </div>
      </>
    );
  }

  return (
    <div className="Confirmation-box">
      <Modal isVisible={p.isVisible} setIsVisible={onClose} label={title} allowContentTouchMove>
        {isSwap && renderSwapSection()}
        {isIncrease && renderIncreaseOrderSection()}
        {isTrigger && renderTriggerDecreaseSection()}

        {needPayTokenApproval && fromToken && (
          <>
            {!isHighPriceImpact && <div className="line-divider" />}

            <ApproveTokenButton
              tokenAddress={fromToken.address}
              tokenSymbol={fromToken.symbol}
              spenderAddress={getContract(chainId, "SyntheticsRouter")}
            />
          </>
        )}

        <div className="Confirmation-box-row" ref={submitButtonRef}>
          <Button
            variant="primary-action"
            className="w-full"
            type="submit"
            onClick={onSubmit}
            disabled={submitButtonState.disabled && !shouldDisableValidation}
          >
            {submitButtonState.text}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
