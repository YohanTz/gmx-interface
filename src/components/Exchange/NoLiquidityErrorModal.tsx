import { ethers } from "ethers";
import Modal from "../Modal/Modal";
import { get1InchSwapUrl } from "config/links";
import { Token, TokenInfo } from "domain/tokens";
import { getNativeToken } from "config/tokens";

import ExternalLink from "components/ExternalLink/ExternalLink";

const { AddressZero } = ethers.constants;

type Props = {
  chainId: number;
  modalError: string;
  isShort: boolean;
  isLong: boolean;
  fromToken: Token;
  toToken: Token;
  shortCollateralToken: TokenInfo;
  setModalError: () => void;
};

export default function NoLiquidityErrorModal({
  chainId,
  fromToken,
  toToken,
  shortCollateralToken,
  isLong,
  isShort,
  modalError,
  setModalError,
}: Props) {
  const nativeToken = getNativeToken(chainId);
  const inputCurrency = fromToken.address === AddressZero ? nativeToken.symbol : fromToken.address;
  let outputCurrency;
  if (isLong) {
    outputCurrency = toToken.address === AddressZero ? nativeToken.symbol : toToken.address;
  } else {
    outputCurrency = shortCollateralToken.address;
  }
  const swapTokenSymbol = isLong ? toToken.symbol : shortCollateralToken.symbol;
  const oneInchSwapUrl = get1InchSwapUrl(chainId, inputCurrency, outputCurrency);
  const label =
    modalError === "BUFFER" ? `${shortCollateralToken.symbol} Required` : `${fromToken.symbol} Pool Capacity Reached`;

  return (
    <Modal isVisible={Boolean(modalError)} setIsVisible={setModalError} label={label} className="Error-modal font-base">
      <div>
        <span>
          You need to select {swapTokenSymbol} as the "Pay" token to use it for collateral to initiate this trade.
        </span>
      </div>
      <br />
      <div>
        <span>
          As there is not enough liquidity in GLP to swap {fromToken.symbol} to {swapTokenSymbol}, you can use the
          option below to do so:
        </span>
      </div>
      <br />

      <ExternalLink href={oneInchSwapUrl}>
        <span>Buy {swapTokenSymbol} on 1inch</span>
      </ExternalLink>

      {isShort && (
        <div>
          <br />
          <span>Alternatively, you can select a different "Collateral In" token.</span>
          <br />
        </div>
      )}
    </Modal>
  );
}
