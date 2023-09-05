import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import { helperToast } from "lib/helperToast";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { useState } from "react";

type Props = {
  isVisible: boolean;
  onClose: () => void;
  savedAcceptablePriceImpactBps: number;
  saveAcceptablePriceImpactBps: (acceptablePriceImpactBps: number) => void;
};

export function AcceptbablePriceImpactEditor(p: Props) {
  const parsedSavedValue = (parseInt(p.savedAcceptablePriceImpactBps!.toString()) / BASIS_POINTS_DIVISOR) * 100;

  const [inputValue, setInputValue] = useState(parsedSavedValue.toString());

  function onSubmit() {
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed)) {
      helperToast.error(`Invalid acceptable Price Impact value`);
      return;
    }

    const bps = (parsed * BASIS_POINTS_DIVISOR) / 100;
    if (parseInt(bps.toString()) !== parseFloat(bps.toString())) {
      helperToast.error(`Max acceptable Price Impact precision is 0.01%`);
      return;
    }

    p.saveAcceptablePriceImpactBps(bps);
    p.onClose();
  }

  return (
    <Modal className="App-settings" isVisible={p.isVisible} setIsVisible={p.onClose} label={`Edit`}>
      <div className="App-settings-row">
        <div>
          <span>Acceptable Price Impact</span>
        </div>
        <div className="App-slippage-tolerance-input-container">
          <input
            type="number"
            className="App-slippage-tolerance-input"
            min="0"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <div className="App-slippage-tolerance-input-percent">%</div>
        </div>
      </div>

      <Button className="w-full" variant="primary-action" onClick={onSubmit}>{`Save`}</Button>
    </Modal>
  );
}
