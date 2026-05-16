import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatEthersChaiMatchers from "@nomicfoundation/hardhat-ethers-chai-matchers";
import hardhatMocha from "@nomicfoundation/hardhat-mocha";
import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";

// Note: we deliberately don't use @nomicfoundation/hardhat-toolbox-mocha-ethers
// because its bundled hardhat-typechain plugin breaks on Node 22 (typechain
// 8.3.2 pulls in prettier 2.8.8, whose CJS bundle mis-loads under Hardhat 3's
// plugin loader). The repo doesn't use typechain anywhere, so dropping it is
// the cleanest fix. Plugins below cover the same surface as the toolbox minus
// typechain/ignition/verify (which we also don't use).
//
// Heads-up on chai matchers: the Hardhat 3 package was renamed from
// `@nomicfoundation/hardhat-chai-matchers` (Hardhat 2) to
// `@nomicfoundation/hardhat-ethers-chai-matchers` (Hardhat 3). Make sure you
// install the new name, not the old one.
export default defineConfig({
  solidity: "0.8.28",
  plugins: [
    hardhatEthers,
    hardhatEthersChaiMatchers,
    hardhatMocha,
    hardhatNetworkHelpers,
  ],
});