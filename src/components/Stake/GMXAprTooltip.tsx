import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { BigNumber } from "ethers";
import { formatKeyAmount } from "lib/numbers";

type Props = {
  processedData: {
    gmxAprForEsGmx: BigNumber;
    gmxAprForNativeToken: BigNumber;
    gmxAprForNativeTokenWithBoost: BigNumber;
    gmxBoostAprForNativeToken?: BigNumber;
  };
  nativeTokenSymbol: string;
};

function renderEscrowedGMXApr(processedData) {
  if (!processedData?.gmxAprForEsGmx?.gt(0)) return;
  return (
    <StatsTooltipRow
      label={`Escrowed GMX APR`}
      showDollar={false}
      value={`${formatKeyAmount(processedData, "gmxAprForEsGmx", 2, 2, true)}%`}
    />
  );
}

export default function GMXAprTooltip({ processedData, nativeTokenSymbol }: Props) {
  return (
    <>
      {(!processedData.gmxBoostAprForNativeToken || processedData.gmxBoostAprForNativeToken.eq(0)) && (
        <StatsTooltipRow
          label={`${nativeTokenSymbol} APR`}
          showDollar={false}
          value={`${formatKeyAmount(processedData, "gmxAprForNativeToken", 2, 2, true)}%`}
        />
      )}
      {processedData?.gmxBoostAprForNativeToken?.gt(0) ? (
        <div>
          <StatsTooltipRow
            label={`${nativeTokenSymbol} Base APR`}
            showDollar={false}
            value={`${formatKeyAmount(processedData, "gmxAprForNativeToken", 2, 2, true)}%`}
          />
          <StatsTooltipRow
            label={`${nativeTokenSymbol} Boosted APR`}
            showDollar={false}
            value={`${formatKeyAmount(processedData, "gmxBoostAprForNativeToken", 2, 2, true)}%`}
          />
          <div className="Tooltip-divider" />
          <StatsTooltipRow
            label={`${nativeTokenSymbol} Total APR`}
            showDollar={false}
            value={`${formatKeyAmount(processedData, "gmxAprForNativeTokenWithBoost", 2, 2, true)}%`}
          />
          <br />
          {renderEscrowedGMXApr(processedData)}
          <br />
          <span>The Boosted APR is from your staked Multiplier Points.</span>
        </div>
      ) : (
        renderEscrowedGMXApr(processedData)
      )}
      <div>
        <br />
        <span>APRs are updated weekly on Wednesday and will depend on the fees collected for the week.</span>
      </div>
    </>
  );
}
