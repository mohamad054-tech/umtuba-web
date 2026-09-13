import { writeLocalizationQaSampleFile } from "../../lib/store/productLocalization/sampleFile";

const path = writeLocalizationQaSampleFile();
process.stdout.write(`${path}\n`);
