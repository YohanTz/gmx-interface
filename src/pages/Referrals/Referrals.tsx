import { useWeb3React } from "@web3-react/core";
import Loader from "components/Common/Loader";
import SEO from "components/Common/SEO";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Footer from "components/Footer/Footer";
import AddAffiliateCode from "components/Referrals/AddAffiliateCode";
import AffiliatesStats from "components/Referrals/AffiliatesStats";
import JoinReferralCode from "components/Referrals/JoinReferralCode";
import TradersStats from "components/Referrals/TradersStats";
import { deserializeSampleStats, isRecentReferralCodeNotExpired } from "components/Referrals/referralsHelper";
import Tab from "components/Tab/Tab";
import { REFERRALS_SELECTED_TAB_KEY } from "config/localStorage";
import {
  ReferralCodeStats,
  registerReferralCode,
  useAffiliateTier,
  useCodeOwner,
  useReferralsData,
  useReferrerDiscountShare,
  useUserReferralCode,
} from "domain/referrals";
import { ethers } from "ethers";
import { useChainId } from "lib/chains";
import { getPageTitle, isHashZero } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useParams } from "react-router-dom";
import { useLocalStorage } from "react-use";
import "./Referrals.css";
import PageTitle from "components/PageTitle/PageTitle";

const TRADERS = "Traders";
const AFFILIATES = "Affiliates";
const TAB_OPTIONS = [TRADERS, AFFILIATES];

function Referrals({ connectWallet, setPendingTxns, pendingTxns }) {
  const { active, account: walletAccount, library } = useWeb3React();
  const { account: queryAccount } = useParams<{ account?: string }>();
  let account;
  if (queryAccount && ethers.utils.isAddress(queryAccount)) {
    account = ethers.utils.getAddress(queryAccount);
  } else {
    account = walletAccount;
  }
  const { chainId } = useChainId();
  const [activeTab, setActiveTab] = useLocalStorage(REFERRALS_SELECTED_TAB_KEY, TRADERS);
  const [recentlyAddedCodes, setRecentlyAddedCodes] = useLocalStorageSerializeKey<ReferralCodeStats[]>(
    [chainId, "REFERRAL", account],
    [],
    {
      raw: false,
      deserializer: deserializeSampleStats as any,
      serializer: (value) => JSON.stringify(value),
    }
  );
  const { data: referralsData, loading } = useReferralsData(account);
  const { userReferralCode, userReferralCodeString } = useUserReferralCode(library, chainId, account);
  const { codeOwner } = useCodeOwner(library, chainId, account, userReferralCode);
  const { affiliateTier: traderTier } = useAffiliateTier(library, chainId, codeOwner);
  const { discountShare } = useReferrerDiscountShare(library, chainId, codeOwner);

  function handleCreateReferralCode(referralCode) {
    return registerReferralCode(chainId, referralCode, library, {
      sentMsg: `Referral code submitted!`,
      failMsg: `Referral code creation failed.`,
      pendingTxns,
    });
  }

  function renderAffiliatesTab() {
    const currentReferralsData = referralsData?.chains?.[chainId];

    const isReferralCodeAvailable =
      currentReferralsData?.codes?.length || recentlyAddedCodes?.filter(isRecentReferralCodeNotExpired).length;

    if (loading) return <Loader />;
    if (account && isReferralCodeAvailable) {
      return (
        <AffiliatesStats
          referralsData={referralsData}
          handleCreateReferralCode={handleCreateReferralCode}
          setRecentlyAddedCodes={setRecentlyAddedCodes}
          recentlyAddedCodes={recentlyAddedCodes}
          chainId={chainId}
        />
      );
    } else {
      return (
        <AddAffiliateCode
          handleCreateReferralCode={handleCreateReferralCode}
          active={active}
          connectWallet={connectWallet}
          recentlyAddedCodes={recentlyAddedCodes}
          setRecentlyAddedCodes={setRecentlyAddedCodes}
        />
      );
    }
  }

  function renderTradersTab() {
    if (loading) return <Loader />;
    if (isHashZero(userReferralCode) || !account || !userReferralCode) {
      return (
        <JoinReferralCode
          connectWallet={connectWallet}
          active={active}
          setPendingTxns={setPendingTxns}
          pendingTxns={pendingTxns}
        />
      );
    }
    return (
      <TradersStats
        userReferralCodeString={userReferralCodeString}
        chainId={chainId}
        referralsData={referralsData}
        setPendingTxns={setPendingTxns}
        pendingTxns={pendingTxns}
        traderTier={traderTier}
        discountShare={discountShare}
      />
    );
  }
  const TAB_OPTION_LABELS = { [TRADERS]: `Traders`, [AFFILIATES]: `Affiliates` };

  return (
    <SEO title={getPageTitle(`Referrals`)}>
      <div className="default-container page-layout Referrals">
        <PageTitle
          isTop
          title={`Referrals`}
          subtitle={
            <span>
              Get fee discounts and earn rebates through the GMX referral program.
              <br />
              For more information, please read the{" "}
              <ExternalLink href="https://docs.gmx.io/docs/referrals">referral program details</ExternalLink>.
            </span>
          }
        />
        <div className="referral-tab-container">
          <Tab
            options={TAB_OPTIONS}
            optionLabels={TAB_OPTION_LABELS}
            option={activeTab}
            setOption={setActiveTab}
            onChange={setActiveTab}
          />
        </div>
        {activeTab === AFFILIATES ? renderAffiliatesTab() : renderTradersTab()}
      </div>
      <Footer />
    </SEO>
  );
}

export default Referrals;
