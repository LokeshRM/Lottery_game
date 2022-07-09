require("@nomiclabs/hardhat-etherscan");
require("dotenv").config({ path: ".env" });
const hre = require("hardhat");
const { FEE, VRF_COORDINATOR, LINK_TOKEN, KEY_HASH } = require("../constants");

async function main() {
    const Lottery = await hre.ethers.getContractFactory("Lottery");
    const lottery = await Lottery.deploy(
        VRF_COORDINATOR,
        LINK_TOKEN,
        KEY_HASH,
        FEE
    );

    await lottery.deployed();

    console.log("Lottery deployed to:", lottery.address);

    await sleep(30000);

    await hre.run("verify:verify", {
        address: lottery.address,
        constructorArguments: [VRF_COORDINATOR, LINK_TOKEN, KEY_HASH, FEE],
    });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
