import { useEffect, useRef, useState } from "react";

import { useWeb3React } from "@web3-react/core";
import { setTraderReferralCodeByUser, validateReferralCodeExists } from "domain/referrals/hooks";
import { REFERRAL_CODE_REGEX } from "./referralsHelper";
import { useDebounce } from "lib/useDebounce";
import Button from "components/Button/Button";

function JoinReferralCode({ setPendingTxns, pendingTxns, active, connectWallet }) {
  return (
    <div className="referral-card section-center mt-medium">
      <h2 className="title">
        <span>Enter Referral Code</span>
      </h2>
      <p className="sub-title">
        <span>Please input a referral code to benefit from fee discounts.</span>
      </p>
      <div className="card-action">
        {active ? (
          <ReferralCodeForm setPendingTxns={setPendingTxns} pendingTxns={pendingTxns} />
        ) : (
          <Button variant="primary-action" className="w-full" type="submit" onClick={connectWallet}>
            <span>Connect Wallet</span>
          </Button>
        )}
      </div>
    </div>
  );
}

export function ReferralCodeForm({
  setPendingTxns,
  pendingTxns,
  callAfterSuccess,
  userReferralCodeString = "",
  type = "join",
}) {
  const { account, library, chainId } = useWeb3React();
  const [referralCode, setReferralCode] = useState("");
  const inputRef = useRef("");
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referralCodeExists, setReferralCodeExists] = useState(true);
  const debouncedReferralCode = useDebounce(referralCode, 300);

  function getPrimaryText() {
    const isEdit = type === "edit";
    if (isEdit && debouncedReferralCode === userReferralCodeString) {
      return `Same as current active code`;
    }
    if (isEdit && isSubmitting) {
      return `Updating...`;
    }

    if (isSubmitting) {
      return `Adding...`;
    }
    if (debouncedReferralCode === "") {
      return `Enter Referral Code`;
    }
    if (isValidating) {
      return `Checking code...`;
    }
    if (!referralCodeExists) {
      return `Referral Code does not exist`;
    }

    return isEdit ? `Update` : `Submit`;
  }
  function isPrimaryEnabled() {
    if (
      debouncedReferralCode === "" ||
      isSubmitting ||
      isValidating ||
      !referralCodeExists ||
      debouncedReferralCode === userReferralCodeString
    ) {
      return false;
    }
    return true;
  }

  async function handleSubmit(event) {
    const isEdit = type === "edit";
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const tx = await setTraderReferralCodeByUser(chainId, referralCode, library, {
        account,
        successMsg: isEdit ? `Referral code updated!` : `Referral code added!`,
        failMsg: isEdit ? `Referral code updated failed.` : `Adding referral code failed.`,
        setPendingTxns,
        pendingTxns,
      });
      if (callAfterSuccess) {
        callAfterSuccess();
      }
      const receipt = await tx.wait();
      if (receipt.status === 1) {
        setReferralCode("");
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    } finally {
      setIsSubmitting(false);
      setIsValidating(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function checkReferralCode() {
      if (debouncedReferralCode === "" || !REFERRAL_CODE_REGEX.test(debouncedReferralCode)) {
        setIsValidating(false);
        setReferralCodeExists(false);
        return;
      }

      setIsValidating(true);
      const codeExists = await validateReferralCodeExists(debouncedReferralCode, chainId);
      if (!cancelled) {
        setReferralCodeExists(codeExists);
        setIsValidating(false);
      }
    }
    checkReferralCode();
    return () => {
      cancelled = true;
    };
  }, [debouncedReferralCode, chainId]);

  useEffect(() => {
    inputRef.current.focus();
  }, []);

  return (
    <form onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        disabled={isSubmitting}
        type="text"
        placeholder="Enter referral code"
        className="text-input mb-sm"
        value={referralCode}
        onChange={({ target }) => {
          const { value } = target;
          setReferralCode(value);
        }}
      />
      <Button
        variant="primary-action"
        type="submit"
        className="App-cta Exchange-swap-button"
        disabled={!isPrimaryEnabled()}
      >
        {getPrimaryText()}
      </Button>
    </form>
  );
}
export default JoinReferralCode;
