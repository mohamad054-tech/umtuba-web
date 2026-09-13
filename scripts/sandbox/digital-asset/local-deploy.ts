/**
 * LOCAL in-memory deploy receipt only.
 * Does not connect to any RPC, testnet, or mainnet.
 */
import { createDigitalAssetLab } from "../../../lib/sandbox/digitalAsset/lab";

const lab = createDigitalAssetLab();
const receipt = lab.localDeployReceipt();
console.log(JSON.stringify({ ...receipt, deployed: "LOCAL_IN_MEMORY_ONLY" }, null, 2));
