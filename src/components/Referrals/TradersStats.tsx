import ExternalLink from "components/ExternalLink/ExternalLink";
import Pagination from "components/Pagination/Pagination";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, getExplorerUrl } from "config/chains";
import { isDevelopment } from "config/env";
import { getNativeToken, getToken } from "config/tokens";
import { TotalReferralsStats, useTiers } from "domain/referrals";
import { BigNumber } from "ethers";
import { formatDate } from "lib/dates";
import { shortenAddress } from "lib/legacy";
import { formatTokenAmount } from "lib/numbers";
import { useRef, useState } from "react";
import { BiEditAlt } from "react-icons/bi";
import { IoWarningOutline } from "react-icons/io5";
import Card from "../Common/Card";
import Modal from "../Modal/Modal";
import Tooltip from "../Tooltip/Tooltip";
import EmptyMessage from "./EmptyMessage";
import { ReferralCodeForm } from "./JoinReferralCode";
import ReferralInfoCard from "./ReferralInfoCard";
import "./TradersStats.scss";
import { getSharePercentage, getTierIdDisplay, getUSDValue, tierDiscountInfo } from "./referralsHelper";
import usePagination from "./usePagination";
import { useWeb3React } from "@web3-react/core";

type Props = {
  referralsData?: TotalReferralsStats;
  traderTier?: BigNumber;
  chainId: number;
  userReferralCodeString?: string;
  setPendingTxns: (txns: string[]) => void;
  pendingTxns: string[];
  discountShare: BigNumber | undefined;
};

function TradersStats({
  referralsData,
  traderTier,
  chainId,
  userReferralCodeString,
  setPendingTxns,
  pendingTxns,
  discountShare,
}: Props) {
  const { library } = useWeb3React();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const editModalRef = useRef<HTMLDivElement>(null);

  const { chains, total } = referralsData || {};
  const {
    [chainId]: currentReferralsData,
    [ARBITRUM]: arbitrumData,
    [AVALANCHE]: avalancheData,
    [AVALANCHE_FUJI]: fujiData,
  } = chains || {};

  const { getCurrentData, currentPage, setCurrentPage, pageCount } = usePagination(
    currentReferralsData?.traderDistributions
  );

  const currentDiscountDistributions = getCurrentData();
  const { totalRebate } = useTiers(library, chainId, traderTier);
  const currentTierDiscount = getSharePercentage(traderTier, discountShare, totalRebate);

  const open = () => setIsEditModalOpen(true);
  const close = () => setIsEditModalOpen(false);
  return (
    <div className="rebate-container">
      <div className="referral-stats">
        <ReferralInfoCard label={`Active Referral Code`}>
          <div className="active-referral-code">
            <div className="edit">
              <span>{userReferralCodeString}</span>
              <BiEditAlt onClick={open} />
            </div>
            {traderTier && (
              <div className="tier">
                <Tooltip
                  handle={`Tier ${getTierIdDisplay(traderTier)} (${currentTierDiscount}% discount)`}
                  position="right-bottom"
                  className={discountShare?.gt(0) ? "tier-discount-warning" : ""}
                  renderContent={() => (
                    <p className="text-white">
                      <span>You will receive a {currentTierDiscount}% discount on opening and closing fees.</span>
                      <br />
                      <br />
                      <span>
                        For trades on V1, this discount will be airdropped to your account every Wednesday. On V2,
                        discounts are applied automatically and will reduce your fees when you make a trade.
                      </span>
                      {discountShare?.gt(0) && (
                        <>
                          <br />
                          <br />
                          <span>
                            The owner of this Referral Code has set a custom discount of {currentTierDiscount}% instead
                            of the standard {tierDiscountInfo[traderTier]}% for Tier {getTierIdDisplay(traderTier)}.
                          </span>
                        </>
                      )}
                    </p>
                  )}
                />
              </div>
            )}
          </div>
        </ReferralInfoCard>
        <ReferralInfoCard
          value={`$${getUSDValue(currentReferralsData?.traderReferralTotalStats?.volume)}`}
          label={`Trading Volume`}
          labelTooltipText={`Volume traded by this account with an active referral code.`}
          tooltipContent={
            <>
              <StatsTooltipRow
                label={`V1 Arbitrum`}
                value={getUSDValue(arbitrumData?.traderReferralTotalStats.v1Data.volume)}
              />
              <StatsTooltipRow
                label={`V1 Avalanche`}
                value={getUSDValue(avalancheData?.traderReferralTotalStats.v1Data.volume)}
              />
              {isDevelopment() && (
                <StatsTooltipRow
                  label={`V1 Avalanche Fuji`}
                  value={getUSDValue(fujiData?.traderReferralTotalStats.v1Data.volume)}
                />
              )}
              <StatsTooltipRow
                label={`V2 Arbitrum`}
                value={getUSDValue(arbitrumData?.traderReferralTotalStats.v2Data.volume)}
              />
              <StatsTooltipRow
                label={`V2 Avalanche`}
                value={getUSDValue(avalancheData?.traderReferralTotalStats.v2Data.volume)}
              />
              {isDevelopment() && (
                <StatsTooltipRow
                  label={`V2 Avalanche Fuji`}
                  value={getUSDValue(fujiData?.traderReferralTotalStats.v2Data.volume)}
                />
              )}
              <div className="Tooltip-divider" />
              <StatsTooltipRow label={`Total`} value={getUSDValue(total?.traderVolume)} />
            </>
          }
        />
        <ReferralInfoCard
          value={`$${getUSDValue(currentReferralsData?.traderReferralTotalStats?.discountUsd)}`}
          label={`Rebates`}
          labelTooltipText={`Rebates earned by this account as a trader.`}
          tooltipContent={
            <>
              <StatsTooltipRow
                label={`V1 Arbitrum`}
                value={getUSDValue(arbitrumData?.traderReferralTotalStats.v1Data.discountUsd)}
              />
              <StatsTooltipRow
                label={`V1 Avalanche`}
                value={getUSDValue(avalancheData?.traderReferralTotalStats.v1Data.discountUsd)}
              />
              {isDevelopment() && (
                <StatsTooltipRow
                  label={`V1 Avalanche Fuji`}
                  value={getUSDValue(avalancheData?.traderReferralTotalStats.v1Data.discountUsd)}
                />
              )}
              <StatsTooltipRow
                label={`V2 Arbitrum`}
                value={getUSDValue(arbitrumData?.traderReferralTotalStats.v2Data.discountUsd)}
              />
              <StatsTooltipRow
                label={`V2 Avalanche`}
                value={getUSDValue(avalancheData?.traderReferralTotalStats.v2Data.discountUsd)}
              />
              {isDevelopment() && (
                <StatsTooltipRow
                  label={`V2 Avalanche Fuji`}
                  value={getUSDValue(fujiData?.traderReferralTotalStats.v2Data.discountUsd)}
                />
              )}
              <div className="Tooltip-divider" />
              <StatsTooltipRow label={`Total`} value={getUSDValue(total?.discountUsd)} />
            </>
          }
        />
        <Modal
          className="Connect-wallet-modal"
          isVisible={isEditModalOpen}
          setIsVisible={close}
          label={`Edit Referral Code`}
          onAfterOpen={() => editModalRef.current?.focus()}
        >
          <div className="edit-referral-modal">
            <ReferralCodeForm
              userReferralCodeString={userReferralCodeString}
              setPendingTxns={setPendingTxns}
              pendingTxns={pendingTxns}
              type="edit"
              callAfterSuccess={() => setIsEditModalOpen(false)}
            />
          </div>
        </Modal>
      </div>
      {currentDiscountDistributions.length > 0 ? (
        <div className="reward-history">
          <Card
            title={`Rebates Distribution History`}
            tooltipText={`V1 rebates are airdropped weekly. V2 rebates are automatically applied as fee discounts on each trade and do not show on this table.`}
          >
            <div className="table-wrapper">
              <table className="referral-table">
                <thead>
                  <tr>
                    <th className="table-head" scope="col">
                      <span>Date</span>
                    </th>
                    <th className="table-head" scope="col">
                      <span>Type</span>
                    </th>
                    <th className="table-head" scope="col">
                      <span>Amount</span>
                    </th>
                    <th className="table-head" scope="col">
                      <span>Transaction</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentDiscountDistributions.map((rebate, index) => {
                    const amountsByTokens = rebate.tokens.reduce((acc, tokenAddress, i) => {
                      let token;
                      try {
                        token = getToken(chainId, tokenAddress);
                      } catch {
                        token = getNativeToken(chainId);
                      }
                      acc[token.address] = acc[token.address] || BigNumber.from(0);
                      acc[token.address] = acc[token.address].add(rebate.amounts[i]);
                      return acc;
                    }, {} as { [address: string]: BigNumber });
                    const tokensWithoutPrices: string[] = [];

                    const totalUsd = rebate.amountsInUsd.reduce((acc, amount, i) => {
                      if (amount.eq(0) && !rebate.amounts[i].eq(0)) {
                        tokensWithoutPrices.push(rebate.tokens[i]);
                      }

                      return acc.add(amount);
                    }, BigNumber.from(0));

                    const explorerURL = getExplorerUrl(chainId);
                    return (
                      <tr key={index}>
                        <td data-label="Date">{formatDate(rebate.timestamp)}</td>
                        <td data-label="Type">V1 Airdrop</td>
                        <td data-label="Amount">
                          <Tooltip
                            handle={
                              <div className="Rebate-amount-value">
                                {tokensWithoutPrices.length > 0 && (
                                  <>
                                    <IoWarningOutline color="#ffba0e" size={16} />
                                    &nbsp;
                                  </>
                                )}
                                ${getUSDValue(totalUsd)}
                              </div>
                            }
                            renderContent={() => (
                              <>
                                {tokensWithoutPrices.length > 0 && (
                                  <>
                                    <span>
                                      USD Value may not be accurate since the data does not contain prices for{" "}
                                      {tokensWithoutPrices
                                        .map((address) => getToken(chainId, address).symbol)
                                        .join(", ")}
                                    </span>
                                    <br />
                                    <br />
                                  </>
                                )}
                                {Object.keys(amountsByTokens).map((tokenAddress) => {
                                  const token = getToken(chainId, tokenAddress);

                                  return (
                                    <>
                                      <StatsTooltipRow
                                        key={tokenAddress}
                                        showDollar={false}
                                        label={token.symbol}
                                        value={formatTokenAmount(
                                          amountsByTokens[tokenAddress],
                                          token.decimals,
                                          undefined,
                                          { displayDecimals: 6 }
                                        )}
                                      />
                                    </>
                                  );
                                })}
                              </>
                            )}
                          />
                        </td>
                        <td data-label="Transaction">
                          <ExternalLink href={explorerURL + `tx/${rebate.transactionHash}`}>
                            {shortenAddress(rebate.transactionHash, 20)}
                          </ExternalLink>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <Pagination page={currentPage} pageCount={pageCount} onPageChange={(page) => setCurrentPage(page)} />
        </div>
      ) : (
        <EmptyMessage
          tooltipText={`V1 rebates are airdropped weekly. V2 rebates are automatically applied as fee discounts on each trade and do not show on this table.`}
          message={`No rebates distribution history yet.`}
        />
      )}
    </div>
  );
}

export default TradersStats;
