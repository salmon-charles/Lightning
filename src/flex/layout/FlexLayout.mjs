import ContentAligner from "./ContentAligner.mjs";
import FlexUtils from "../FlexUtils.mjs";
import LineLayouter from "./LineLayouter.mjs";
import ItemCoordinatesUpdater from "./ItemCoordinatesUpdater.mjs";

/**
 * Layouts a flex container (and descendants).
 */
export default class FlexLayout {

    constructor(flexContainer) {
        this._flexContainer = flexContainer;

        this._lineLayouter = new LineLayouter(this);

        this._resizingMainAxis = false;
        this._resizingCrossAxis = false;

        /**
         * While layouting the tree, if a certain flex container branch does not fit it's contents then the layout of
         * it can be deferred (because it's guaranteed that its contents won't affect the upper branch).
         *
         * This enables the update loop to improve performance: updating its layout may not be needed at all (if it
         * is out of bounds or invisible).
         * @type {boolean}
         */
        this._deferLayout = false;
    }

    layoutTree() {
        const isSubTree = this.item.flexParent;
        if (isSubTree) {
            // Use the dimensions set by the parent flex tree.
            this._updateTreeLayoutWithCurrentAxes();
        } else {
            this.updateTreeLayout();
        }
        this.updateItemCoords();
    }

    updateTreeLayout() {
        this.resetDeferredLayout();
        this._setInitialAxisSizes();
        this._layoutAxes();
    }

    updateItemCoords() {
        const updater = new ItemCoordinatesUpdater(this);
        updater.finalize();
    }

    _updateTreeLayoutWithCurrentAxes() {
        this.resetDeferredLayout();
        this._layoutAxes();
    }

    deferLayout() {
        this._deferLayout = true;
        this.item.resetNonFlexLayout();
        this.item.mustUpdateDeferred();
    }

    isLayoutDeferred() {
        return this._deferLayout;
    }

    resetDeferredLayout() {
        this._deferLayout = false;
    }

    _setInitialAxisSizes() {
        this.mainAxisSize = this._getMainAxisBasis();
        this.crossAxisSize = this._getCrossAxisBasis();
        this._resizingMainAxis = false;
        this._resizingCrossAxis = false;
    }

    _layoutAxes() {
        this._layoutMainAxis();
        this._layoutCrossAxis();
    }

    /**
     * @pre mainAxisSize should exclude padding.
     */
    _layoutMainAxis() {
        this._layoutLines();
        this._fitMainAxisSizeToContents();
    }

    _layoutLines() {
        this._lineLayouter.layoutLines();
    }

    get _lines() {
        return this._lineLayouter.lines;
    }

    _fitMainAxisSizeToContents() {
        if (!this._resizingMainAxis) {
            if (this.isMainAxisFitToContents()) {
                this.mainAxisSize = this._lineLayouter.mainAxisContentSize;
            }
        }
    }

    /**
     * @pre crossAxisSize should exclude padding.
     */
    _layoutCrossAxis() {
        const aligner = new ContentAligner(this);
        aligner.init();
        this._totalCrossAxisSize = aligner.totalCrossAxisSize;
        this._fitCrossAxisSizeToContents();
        aligner.align();
    }

    _fitCrossAxisSizeToContents() {
        if (!this._resizingCrossAxis) {
            if (this.isCrossAxisFitToContents()) {
                this.crossAxisSize = this._totalCrossAxisSize;
            }
        }
    }

    isWrapping() {
        return this._flexContainer.wrap;
    }

    isMainAxisFitToContents() {
        return !this.isWrapping() && !this._hasFixedMainAxisBasis();
    }

    isCrossAxisFitToContents() {
        return !this._hasFixedCrossAxisBasis();
    }

    _hasFixedMainAxisBasis() {
        return (this._getMainAxisBasis() !== 0);
    }

    _hasFixedCrossAxisBasis() {
        return (this._getCrossAxisBasis() !== 0);
    }

    getAxisMinSize(horizontal) {
        if (this._horizontal === horizontal) {
            return this._getMainAxisMinSize();
        } else {
            return this._getCrossAxisMinSize();
        }
    }

    _getMainAxisMinSize() {
        if (this.isLayoutDeferred()) {
            // We need info about the contents, so we can't defer layout.
            this.updateTreeLayout();
        }
        return this._lineLayouter.mainAxisMinSize;
    }

    _getCrossAxisMinSize() {
        if (this.isLayoutDeferred()) {
            this.updateTreeLayout();
        }
        return this._lineLayouter.crossAxisMinSize;
    }

    resizeMainAxis(size) {
        this._resizingMainAxis = true;

        if (this.mainAxisSize !== size) {
            this.mainAxisSize = size;

            this._layoutAxes();
        }
        this._resizingMainAxis = false;
    }

    resizeCrossAxis(size) {
        this._resizingCrossAxis = true;

        if (this.crossAxisSize !== size) {
            this.crossAxisSize = size;

            this._layoutCrossAxis();
        }
        this._resizingCrossAxis = false;
    }

    getParentFlexContainer() {
        return this.item.isFlexItemEnabled() ? this.item.flexItem.ctr : null;
    }

    _getMainAxisPadding() {
        return FlexUtils.getTotalPadding(this.item, this._horizontal);
    }

    _getCrossAxisPadding() {
        return FlexUtils.getTotalPadding(this.item, !this._horizontal);
    }

    _getHorizontalPadding() {
        return FlexUtils.getTotalPadding(this.item, true);
    }

    _getVerticalPadding() {
        return FlexUtils.getTotalPadding(this.item, false);
    }

    _getHorizontalPaddingOffset() {
        return FlexUtils.getPaddingOffset(this.item, true);
    }

    _getVerticalPaddingOffset() {
        return FlexUtils.getPaddingOffset(this.item, false);
    }

    _getMainAxisBasis() {
        return FlexUtils.getAxisSize(this.item, this._horizontal);
    }

    _getCrossAxisBasis() {
        return FlexUtils.getAxisSize(this.item, !this._horizontal);
    }

    get _horizontal() {
        return this._flexContainer._horizontal;
    }

    get _reverse() {
        return this._flexContainer._reverse;
    }

    get item() {
        return this._flexContainer.item;
    }

    get items() {
        return this.item.items;
    }

    get resizingMainAxis() {
        return this._resizingMainAxis;
    }

    get resizingCrossAxis() {
        return this._resizingCrossAxis;
    }

    get numberOfItems() {
        return this.items.length;
    }

    get mainAxisSize() {
        return FlexUtils.getAxisLayoutSize(this.item, this._horizontal);
    }

    get crossAxisSize() {
        return FlexUtils.getAxisLayoutSize(this.item, !this._horizontal);
    }

    set mainAxisSize(v) {
        FlexUtils.setAxisLayoutSize(this.item, this._horizontal, v);
    }

    set crossAxisSize(v) {
        FlexUtils.setAxisLayoutSize(this.item, !this._horizontal, v);
    }

}
