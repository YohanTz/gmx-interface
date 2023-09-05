import "./RedirectModal.css";
import Modal from "../Modal/Modal";
import Checkbox from "../Checkbox/Checkbox";

import ExternalLink from "components/ExternalLink/ExternalLink";
import Button from "components/Button/Button";

export function RedirectPopupModal({
  redirectModalVisible,
  setRedirectModalVisible,
  appRedirectUrl,
  setRedirectPopupTimestamp,
  setShouldHideRedirectModal,
  shouldHideRedirectModal,
}) {
  const onClickAgree = () => {
    if (shouldHideRedirectModal) {
      setRedirectPopupTimestamp(Date.now());
    }
  };

  return (
    <Modal
      className="RedirectModal"
      isVisible={redirectModalVisible}
      setIsVisible={setRedirectModalVisible}
      label={`Launch App`}
    >
      <span>You are leaving GMX.io and will be redirected to a third party, independent website.</span>
      <br />
      <br />
      <span>
        The website is a community deployed and maintained instance of the open source{" "}
        <ExternalLink href="https://github.com/gmx-io/gmx-interface">GMX front end</ExternalLink>, hosted and served on
        the distributed, peer-to-peer <ExternalLink href="https://ipfs.io/">IPFS network</ExternalLink>.
      </span>
      <br />
      <br />
      <span>
        Alternative links can be found in the{" "}
        <ExternalLink href="https://docs.gmx.io/docs/community/frontends">docs</ExternalLink>.
        <br />
        <br />
        By clicking Agree you accept the <ExternalLink href="https://gmx.io/#/terms-and-conditions">
          T&Cs
        </ExternalLink>{" "}
        and <ExternalLink href="https://gmx.io/#/referral-terms">Referral T&Cs</ExternalLink>.
        <br />
        <br />
      </span>
      <div className="mb-sm">
        <Checkbox isChecked={shouldHideRedirectModal} setIsChecked={setShouldHideRedirectModal}>
          <span>Don't show this message again for 30 days.</span>
        </Checkbox>
      </div>
      <Button variant="primary-action" className="w-full" to={appRedirectUrl} onClick={onClickAgree}>
        <span>Agree</span>
      </Button>
    </Modal>
  );
}
