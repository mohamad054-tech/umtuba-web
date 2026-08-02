import ProductLoadingState from "../components/product/ProductLoadingState";
import { COLLABORATION_UI_COPY } from "../../lib/collaboration/workspaceUi";

export default function WorkspacesLoading() {
  return <ProductLoadingState fullPage label={COLLABORATION_UI_COPY.loading} />;
}
