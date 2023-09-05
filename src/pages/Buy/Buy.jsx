import React from "react";

import Footer from "components/Footer/Footer";
import "./Buy.css";
import TokenCard from "components/TokenCard/TokenCard";
import SEO from "components/Common/SEO";
import { getPageTitle } from "lib/legacy";
import PageTitle from "components/PageTitle/PageTitle";

export default function BuyGMXGLP() {
  return (
    <SEO title={getPageTitle(`Buy GLP or GMX`)}>
      <div className="BuyGMXGLP page-layout">
        <div className="BuyGMXGLP-container default-container">
          <PageTitle showNetworkIcon={false} isTop title={`Buy Protocol Tokens`} />
          <TokenCard />
        </div>
        <Footer />
      </div>
    </SEO>
  );
}
