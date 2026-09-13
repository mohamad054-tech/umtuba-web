import { writeLocalizationCatalogFile } from "../../lib/store/productLocalization/catalogFile";

const path = writeLocalizationCatalogFile();
process.stdout.write(`${path}\n`);
