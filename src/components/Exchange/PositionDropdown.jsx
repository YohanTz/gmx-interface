import { Menu } from "@headlessui/react";

import "./PositionDropdown.css";
import { HiDotsVertical } from "react-icons/hi";
import { AiOutlineEdit } from "react-icons/ai";
import { BiSelectMultiple } from "react-icons/bi";
import { RiShareBoxFill } from "react-icons/ri";
import increaseLimit from "img/ic_increaselimit_16.svg";
import increaseMarket from "img/ic_increasemarket_16.svg";
import triggerClose from "img/ic_triggerclose_16.svg";

function PositionDropdown(p) {
  const {
    handleEditCollateral,
    handleShare,
    handleMarketSelect,
    handleMarketIncreaseSize,
    handleLimitIncreaseSize,
    handleTriggerClose,
  } = p;

  return (
    <Menu>
      <Menu.Button as="div">
        <button className="PositionDropdown-dots-icon">
          <HiDotsVertical fontSize={20} fontWeight={700} />
        </button>
      </Menu.Button>
      <div className="PositionDropdown-extra-options">
        <Menu.Items as="div" className="menu-items">
          <Menu.Item>
            <div className="menu-item" onClick={handleEditCollateral}>
              <AiOutlineEdit fontSize={16} />
              <p>
                <span>Edit Collateral</span>
              </p>
            </div>
          </Menu.Item>
          <Menu.Item>
            <div className="menu-item" onClick={handleMarketSelect}>
              <BiSelectMultiple fontSize={16} />
              <p>
                <span>Select Market</span>
              </p>
            </div>
          </Menu.Item>
          {handleShare && (
            <Menu.Item>
              <div className="menu-item" onClick={handleShare}>
                <RiShareBoxFill fontSize={16} />
                <p>
                  <span>Share Position</span>
                </p>
              </div>
            </Menu.Item>
          )}
          {handleMarketIncreaseSize && (
            <Menu.Item>
              <div className="menu-item" onClick={handleMarketIncreaseSize}>
                <img src={increaseMarket} alt="Increase Limit" height={16} />
                <p>
                  <span>Increase Size (Market)</span>
                </p>
              </div>
            </Menu.Item>
          )}
          {handleLimitIncreaseSize && (
            <Menu.Item>
              <div className="menu-item" onClick={handleLimitIncreaseSize}>
                <img src={increaseLimit} alt="Increase Limit" height={16} />
                <p>
                  <span>Increase Size (Limit)</span>
                </p>
              </div>
            </Menu.Item>
          )}
          {handleTriggerClose && (
            <Menu.Item>
              <div className="menu-item" onClick={handleTriggerClose}>
                <img src={triggerClose} alt="Increase Limit" height={16} />
                <p>
                  <span>Trigger Close</span>
                </p>
              </div>
            </Menu.Item>
          )}
        </Menu.Items>
      </div>
    </Menu>
  );
}

export default PositionDropdown;
