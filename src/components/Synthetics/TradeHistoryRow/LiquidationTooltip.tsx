import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { convertToUsd } from "domain/synthetics/tokens";
import { PositionTradeAction } from "domain/synthetics/tradeHistory";
import { BigNumber } from "ethers";
import { PRECISION } from "lib/legacy";
import { formatTokenAmountWithUsd, formatUsd } from "lib/numbers";

type Props = {
  tradeAction: PositionTradeAction;
  minCollateralUsd: BigNumber;
};

export function LiquidationTooltip(p: Props) {
  const { tradeAction, minCollateralUsd } = p;

  const maxLeverage = PRECISION.div(tradeAction.marketInfo.minCollateralFactor);

  const {
    initialCollateralToken,
    initialCollateralDeltaAmount,
    collateralTokenPriceMin,
    borrowingFeeAmount,
    fundingFeeAmount,
    positionFeeAmount,
    priceImpactDiffUsd,
    pnlUsd,
  } = tradeAction;

  const initialCollateralUsd = convertToUsd(
    initialCollateralDeltaAmount,
    initialCollateralToken?.decimals,
    collateralTokenPriceMin
  );

  const positionFeeUsd = convertToUsd(positionFeeAmount, initialCollateralToken?.decimals, collateralTokenPriceMin);
  const borrowingFeeUsd = convertToUsd(borrowingFeeAmount, initialCollateralToken?.decimals, collateralTokenPriceMin);
  const fundingFeeUsd = convertToUsd(fundingFeeAmount, initialCollateralToken?.decimals, collateralTokenPriceMin);

  const maxLeverageText = Number(maxLeverage).toFixed(1) + "x";

  return (
    <Tooltip
      position="left-top"
      handle={`Liquidated`}
      renderContent={() => (
        <>
          <span>This position was liquidated as the max leverage of {maxLeverageText} was exceeded.</span>
          <br />
          <br />
          <StatsTooltipRow
            label={`Initial collateral`}
            showDollar={false}
            value={formatTokenAmountWithUsd(
              initialCollateralDeltaAmount,
              initialCollateralUsd,
              initialCollateralToken?.symbol,
              initialCollateralToken?.decimals
            )}
          />
          <StatsTooltipRow label={`Min required collateral`} showDollar={false} value={formatUsd(minCollateralUsd)} />
          <StatsTooltipRow label={`Borrow Fee`} showDollar={false} value={formatUsd(borrowingFeeUsd)} />
          <StatsTooltipRow label={`Funding Fee`} showDollar={false} value={formatUsd(fundingFeeUsd)} />
          <StatsTooltipRow label={`Position Fee`} showDollar={false} value={formatUsd(positionFeeUsd)} />
          <StatsTooltipRow label={`Price Impact`} showDollar={false} value={formatUsd(priceImpactDiffUsd)} />
          <StatsTooltipRow label={`PnL`} showDollar={false} value={formatUsd(pnlUsd)} />
        </>
      )}
    />
  );
}
