import React, { useState } from "react";

import Modal from "../Modal/Modal";
import Checkbox from "../Checkbox/Checkbox";

import "./OrdersToa.css";
import Button from "components/Button/Button";

export default function OrdersToa(props) {
  const { setIsVisible, isPluginApproving, approveOrderBook } = props;

  const [isChecked, setIsChecked] = useState(false);

  const onConfirmationClick = () => {
    approveOrderBook().then(() => {
      setIsVisible(false);
    });
  };

  const getPrimaryText = () => {
    if (isPluginApproving) {
      return `Enabling Orders...`;
    }
    if (!isChecked) {
      return `Accept terms to enable orders`;
    }
    return `Enable Orders`;
  };

  const isPrimaryEnabled = () => {
    if (isPluginApproving) {
      return false;
    }
    return isChecked;
  };

  return (
    <Modal
      setIsVisible={setIsVisible}
      isVisible={true}
      label={`Enable Orders`}
      className="Orders-toa Modal-scrollable"
      zIndex="1002"
    >
      <span>
        Note that orders are not guaranteed to be executed.
        <br />
        <br />
        This can occur in a few situations including but not exclusive to:
      </span>
      <br />
      <ul>
        <span>
          <li>Insufficient liquidity to execute the order</li>
          <li>The mark price which is an aggregate of exchange prices did not reach the specified price</li>
          <li>The specified price was reached but not long enough for it to be executed</li>
          <li>No keeper picked up the order for execution</li>
        </span>
      </ul>
      <div>
        <span>
          Additionally, trigger orders are market orders and are not guaranteed to settle at the trigger price.
        </span>
      </div>
      <br />
      <div className="Orders-toa-accept-rules">
        <Checkbox isChecked={isChecked} setIsChecked={setIsChecked}>
          <span className="muted">
            <span>
              Accept that orders are not guaranteed to execute and trigger orders may not settle at the trigger price
            </span>
          </span>
        </Checkbox>
      </div>
      <Button
        variant="primary-action"
        disabled={!isPrimaryEnabled()}
        className="w-full mt-md"
        onClick={onConfirmationClick}
      >
        {getPrimaryText()}
      </Button>
    </Modal>
  );
}
