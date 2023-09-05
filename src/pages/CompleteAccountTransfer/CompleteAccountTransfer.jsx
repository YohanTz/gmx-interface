import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ethers } from "ethers";
import { useWeb3React } from "@web3-react/core";
import { useCopyToClipboard } from "react-use";

import { getContract } from "config/contracts";

import Modal from "components/Modal/Modal";
import Footer from "components/Footer/Footer";

import RewardRouter from "abis/RewardRouter.json";

import "./CompleteAccountTransfer.css";

import { callContract } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { useChainId } from "lib/chains";
import Button from "components/Button/Button";

export default function CompleteAccountTransfer(props) {
  const [, copyToClipboard] = useCopyToClipboard();
  const { sender, receiver } = useParams();
  const isSenderAndReceiverValid = ethers.utils.isAddress(sender) && ethers.utils.isAddress(receiver);
  const { setPendingTxns } = props;
  const { library, account } = useWeb3React();
  const [isTransferSubmittedModalVisible, setIsTransferSubmittedModalVisible] = useState(false);

  const { chainId } = useChainId();

  const [isConfirming, setIsConfirming] = useState(false);
  const isCorrectAccount = (account || "").toString().toLowerCase() === (receiver || "").toString().toLowerCase();

  const rewardRouterAddress = getContract(chainId, "RewardRouter");

  const getError = () => {
    if (!account) {
      return `Wallet is not connected`;
    }
    if (!isCorrectAccount) {
      return `Incorrect Account`;
    }
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isConfirming) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    return `Complete Transfer`;
  };

  const onClickPrimary = () => {
    setIsConfirming(true);

    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());

    callContract(chainId, contract, "acceptTransfer", [sender], {
      sentMsg: `Transfer submitted!`,
      failMsg: `Transfer failed.`,
      setPendingTxns,
    })
      .then(async (res) => {
        setIsTransferSubmittedModalVisible(true);
      })
      .finally(() => {
        setIsConfirming(false);
      });
  };

  if (!isSenderAndReceiverValid) {
    return (
      <div className="CompleteAccountTransfer Page page-layout">
        <div className="Page-title-section">
          <div className="Page-title">
            <span>Complete Account Transfer</span>
          </div>
          <div className="Page-description">
            <span>Invalid Transfer Addresses: Please check the url.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="CompleteAccountTransfer Page page-layout">
      <Modal
        isVisible={isTransferSubmittedModalVisible}
        setIsVisible={setIsTransferSubmittedModalVisible}
        label="Transfer Completed"
      >
        <span>Your transfer has been completed.</span>
        <br />
        <br />
        <Link className="App-cta" to="/earn">
          <span>Continue</span>
        </Link>
      </Modal>
      <div className="Page-title-section">
        <div className="Page-title">
          <span>Complete Account Transfer</span>
        </div>
        {!isCorrectAccount && (
          <div className="Page-description">
            <span>To complete the transfer, you must switch your connected account to {receiver}.</span>
            <br />
            <br />
            <span>
              You will need to be on this page to accept the transfer,{" "}
              <span
                onClick={() => {
                  copyToClipboard(window.location.href);
                  helperToast.success("Link copied to your clipboard");
                }}
              >
                click here
              </span>{" "}
              to copy the link to this page if needed.
            </span>
            <br />
            <br />
          </div>
        )}
        {isCorrectAccount && (
          <div className="Page-description">
            <span>You have a pending transfer from {sender}.</span>
            <br />
          </div>
        )}
      </div>
      {isCorrectAccount && (
        <div className="Page-content">
          <div className="input-form">
            <div className="input-row">
              <Button
                variant="primary-action"
                className="w-full"
                disabled={!isPrimaryEnabled()}
                onClick={onClickPrimary}
              >
                {getPrimaryText()}
              </Button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
