const hre = require('hardhat');
const tokens = require('./json/tokens.json');
const {expandToNDecimals} = require("../test/shared/utils");

// let addresses= [
//     "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161",
//     "0x03aDd75ef5B57FCDd1103a46772E41850b675E4E",
//     "0xaB572fCD56b19CF30Cb72e908086E02D36f813a1",
//     "0x1448Cf925eed0436b7dA67a4dEAb76d9c09029C2",
//     "0xFa8f997D56a21Cd174e9337D7F4b6F7c0038Edf6",
//     "0x0e94DD9b9583F4726103b263915E12fe29D2EF81",
//     "0x1f137F133DF19d65669165A0963fE72485c7FD0a",
//     "0x1448Cf925eed0436b7dA67a4dEAb76d9c09029C2",
//     "0x72CcD287CAf23D839ab9760EE3C55DC4Db55321A",
//     "0x136e3b0f3C2DCb127f54AE3225edfb5ef34b45Ea",
//     "0xC6a20F97BFE06287bc104BD0d0D3343a6dA4A4fF",
//     "0xcb0eF5aFD5a3f8703cDcfBe55Bf1407b84f0bC73",
//     "0x7d747ae6dc13f4cf60ee00fa0839f7d456db984b",
//     "0xEEAf9F8E7a42273d091Dd89091B16d3cf08B8101",
//     "0x80e0310b95Cb13e886C712e6A7E5059bc9619F38",
//     "0x99873B7A96f3cF28966ed90E14B8F2e3bFD73296",
//     "0x22963f931baa98d5ce2a43ab7681a638a693f560",
//     "0x43C40c8a2e63De6fc79928bfa27648a6698B9999",
//     "0xB8e66d8406822649DbA13B620825fEB1f2FA3995",
//     "0x62a4bad24f7379d5c86c0C71f937417d6109350c",
//     "0x6020B55E2bF6746e513A1e99561CB50843fB6F28",
//     "0xE8995aeE06F518dE9865917ead8AA489D1034649",
//     "0x2Db5e12516bbBdb485351710bFF5bEb613136d26",
//     "0x0f5540a479BB9099adA1A04B702769c0564D736F",
//     "0x6Ff60E1CF749aE639fBE124dDbC2178c4C988203",
//     "0xb19A851346772e3d88929b09A709191A4707126f",
//     "0xb6932ae987775fc317737d35e9df3cb7ccc9cfec",
//     "0x319b916A699865618121B99E66E34b1Cc597EC32",
//     "0x70aB7284017B8FB8C1CA9eC767615B1eeDb95E35"
// ]

let addresses = ["0x8e2A8d1d1C18FBa96e8dCa9CF664251998065e73", "0x68d463A21c736BdfB8b690bc7351D93bc148A815"]
//     "0xe4b1b44bcea856ed75efc4a745057c0fcc26ab9a",
// "0x319b916A699865618121B99E66E34b1Cc597EC32",
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// async function
async function sendSomeShittyTokens() {
    let index = 0
    for(let token of tokens.tokens) {
        index++
        // if (index <= 16)continue
        console.log("token", token.address)
        let Token = await hre.ethers.getContractFactory("Token");
        let tk0Contract = await Token.attach(token.address);
        for (let address of addresses) {
            try{
                console.log("address", address)
                await timeout(2000)

                let decimals = await tk0Contract.decimals()
                await tk0Contract.mint(address, expandToNDecimals(1000, decimals))
            }catch (e) {
                await timeout(10000)

            }

        }
    }
}
sendSomeShittyTokens()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
