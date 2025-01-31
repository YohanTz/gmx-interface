import { ethers } from "ethers";
import Token from "abis/Token.json";
import { getExplorerUrl } from "config/chains";
import { helperToast } from "lib/helperToast";
import { InfoTokens, TokenInfo } from "./types";
import { Web3Provider } from "@ethersproject/providers";
import ExternalLink from "components/ExternalLink/ExternalLink";

type Params = {
  setIsApproving: (val: boolean) => void;
  library: Web3Provider;
  tokenAddress: string;
  spender: string;
  chainId: number;
  onApproveSubmitted: () => void;
  getTokenInfo?: (infoTokens: InfoTokens, tokenAddress: string) => TokenInfo;
  infoTokens: InfoTokens;
  pendingTxns: any[];
  setPendingTxns: (txns: any[]) => void;
  includeMessage?: boolean;
};

export function approveTokens({
  setIsApproving,
  library,
  tokenAddress,
  spender,
  chainId,
  onApproveSubmitted,
  getTokenInfo,
  infoTokens,
  pendingTxns,
  setPendingTxns,
  includeMessage,
}: Params) {
  setIsApproving(true);
  const contract = new ethers.Contract(tokenAddress, Token.abi, library.getSigner());
  contract
    .approve(spender, ethers.constants.MaxUint256)
    .then(async (res) => {
      const txUrl = getExplorerUrl(chainId) + "tx/" + res.hash;
      helperToast.success(
        <div>
          <span>
            Approval submitted! <ExternalLink href={txUrl}>View status.</ExternalLink>
          </span>
          <br />
        </div>
      );
      if (onApproveSubmitted) {
        onApproveSubmitted();
      }
      if (getTokenInfo && infoTokens && pendingTxns && setPendingTxns) {
        const token = getTokenInfo(infoTokens, tokenAddress);
        const pendingTxn = {
          hash: res.hash,
          message: includeMessage ? `${token.symbol} Approved!` : false,
        };
        setPendingTxns([...pendingTxns, pendingTxn]);
      }
    })
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(e);
      let failMsg;
      if (
        ["not enough funds for gas", "failed to execute call with revert code InsufficientGasFunds"].includes(
          e.data?.message
        )
      ) {
        failMsg = (
          <div>
            <span>
              There is not enough ETH in your account on Arbitrum to send this transaction.
              <br />
              <br />
              <ExternalLink href="https://arbitrum.io/bridge-tutorial/">Bridge ETH to Arbitrum</ExternalLink>
            </span>
          </div>
        );
      } else if (e.message?.includes("User denied transaction signature")) {
        failMsg = `Approval was cancelled`;
      } else {
        failMsg = `Approval failed`;
      }
      helperToast.error(failMsg);
    })
    .finally(() => {
      setIsApproving(false);
    });
}
