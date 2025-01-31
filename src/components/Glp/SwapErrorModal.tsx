import { useEffect, useState } from "react";
import { BigNumber } from "ethers";
import { ethers } from "ethers";
import Modal from "../Modal/Modal";
import { get1InchSwapUrl } from "config/links";
import { getLowestFeeTokenForBuyGlp, InfoTokens, Token } from "domain/tokens";
import { getNativeToken } from "config/tokens";

import ExternalLink from "components/ExternalLink/ExternalLink";

const { AddressZero } = ethers.constants;

type Props = {
  swapToken: Token;
  isVisible: boolean;
  setIsVisible: () => void;
  chainId: number;
  glpAmount: BigNumber;
  usdgSupply: BigNumber;
  totalTokenWeights: BigNumber;
  glpPrice: BigNumber;
  swapUsdMin: BigNumber;
  infoTokens: InfoTokens;
};

export default function SwapErrorModal({
  swapToken,
  isVisible,
  setIsVisible,
  chainId,
  glpAmount,
  usdgSupply,
  totalTokenWeights,
  glpPrice,
  infoTokens,
  swapUsdMin,
}: Props) {
  const [lowestFeeToken, setLowestFeeToken] = useState<
    { token: Token; fees: number; amountLeftToDeposit: BigNumber } | undefined
  >();
  useEffect(() => {
    const lowestFeeTokenInfo = getLowestFeeTokenForBuyGlp(
      chainId,
      glpAmount,
      glpPrice,
      usdgSupply,
      totalTokenWeights,
      infoTokens,
      swapToken.address,
      swapUsdMin
    );
    setLowestFeeToken(lowestFeeTokenInfo);
  }, [chainId, glpAmount, glpPrice, usdgSupply, totalTokenWeights, infoTokens, swapUsdMin, swapToken.address]);

  const label = `${swapToken?.symbol} Capacity Reached`;

  if (lowestFeeToken && swapUsdMin && swapUsdMin.gt(lowestFeeToken.amountLeftToDeposit)) {
    return (
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={label} className="Error-modal">
        <p>
          <span>
            There is not enough liquidity in a single token for your size. Please check the Save on Fees section and
            consider splitting your order into several different ones
          </span>
        </p>
        <p>
          <ExternalLink href={get1InchSwapUrl(chainId)}>
            <span>Swap on 1inch</span>
          </ExternalLink>
        </p>
      </Modal>
    );
  }

  const nativeToken = getNativeToken(chainId);
  const inputCurrency = swapToken.address === AddressZero ? nativeToken.symbol : swapToken.address;
  const outputCurrency =
    lowestFeeToken?.token.address === AddressZero ? nativeToken.symbol : lowestFeeToken?.token.address;
  const oneInchUrl = get1InchSwapUrl(chainId, inputCurrency, outputCurrency);

  return (
    <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={label} className="Error-modal">
      <span>
        <p>The pool's capacity has been reached for {swapToken.symbol}. Please use another token to buy GLP.</p>
        <p>Check the "Save on Fees" section for tokens with the lowest fees.</p>
      </span>
      <p>
        <ExternalLink href={oneInchUrl}>
          <span>
            Swap {swapToken.symbol} to {lowestFeeToken?.token.symbol} on 1inch
          </span>
        </ExternalLink>
      </p>
    </Modal>
  );
}
