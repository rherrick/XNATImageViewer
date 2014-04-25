/**
 * @author sunilk@mokacreativellc.com (Sunil Kumar)
 */

// goog
goog.require('goog.string');
goog.require('goog.array');

// utils
goog.require('moka.string');
goog.require('moka.ui.Component');

// xiv
goog.require('xiv.ui.layouts.LayoutFrame');




/**
 * xiv.ui.layouts.Layout
 *
 * @constructor
 * @extends {moka.ui.Component}
 */
goog.provide('xiv.ui.layouts.Layout');
xiv.ui.layouts.Layout = function() {
    if (!this.constructor.TITLE){
	window.console.log('\n\n\n\n' + 
			   'This is the class attempting to inherit from it:');
	window.console.log(this);
	throw new Error('Sublcasses of xiv.ui.layous.Layout must have ' + 
			' the TITLE defined as a constructor property!');

    }
    goog.base(this);


    /**
     * @type {Object.<string, xiv.ui.layout.LayoutFrames>}
     * @protected
     */
    this.LayoutFrames = {};
}
goog.inherits(xiv.ui.layouts.Layout, moka.ui.Component);
goog.exportSymbol('xiv.ui.layouts.Layout', xiv.ui.layouts.Layout);



/**
 * Event types.
 * @enum {string}
 * @public
 */
xiv.ui.layouts.Layout.EventType = {
    RESIZE: goog.events.getUniqueId('resize')
}



/**
 * @enum {string}
 * @public
 */
xiv.ui.layouts.Layout.INTERACTORS = {
    SLIDER: goog.string.createUniqueString(),
    DISPLAY: goog.string.createUniqueString(),
    CROSSHAIRS: goog.string.createUniqueString() 
}



/**
 * @type {!string} 
 * @const
 * @expose
 */
xiv.ui.layouts.Layout.ID_PREFIX =  'xiv.ui.layouts.Layout';



/**
 * @enum {string}
 * @public
 */
xiv.ui.layouts.Layout.CSS_SUFFIX = {}



/**
 * @type {!number}
 * @private
 */
xiv.ui.layouts.Layout.prototype.minLayoutFrameWidth_ = 20;



/**
 * @type {!number}
 * @private
 */
xiv.ui.layouts.Layout.prototype.minLayoutFrameHeight_ = 20;



/**
 * @param {!number} h
 * @private
 */
xiv.ui.layouts.Layout.prototype.setMinLayoutFrameHeight = function(h){
    this.minLayoutFrameHeight_ = h;
}



/**
 * @param {!number} w
 * @private
 */
xiv.ui.layouts.Layout.prototype.setMinLayoutFrameWidth = function(w){
    this.minLayoutFrameWidth_ = w;
}


/**
 * @return {Object.<string, xiv.ui.layout.LayoutFrame>}
 */
xiv.ui.layouts.Layout.prototype.getLayoutFrames = function(){
    return this.LayoutFrames;
};



/**
 * @param {!string} planeTitle
 * @return {xiv.ui.layout.LayoutFrame}
 */
xiv.ui.layouts.Layout.prototype.getLayoutFrameByTitle = function(title){
    return this.LayoutFrames[title];
};



/**
 * @param {!string} planeTitle
 * @return {xiv.ui.layout.LayoutFrame}
 */
xiv.ui.layouts.Layout.prototype.getLayoutFrameInteractors = function(title) {
    
    window.console.log(title, this.LayoutFrames[title]);
    var objs = {};

    goog.object.forEach(xiv.ui.layouts.Layout.INTERACTORS, function(inter){
	objs[inter]  =  this.LayoutFrames[title][inter]
    }.bind(this))

    window.console.log("INTERACTORS!", objs);
    return objs;
};



/**
 * @return {!string}
 */
xiv.ui.layouts.Layout.prototype.getTitle = function(){
    return this.constructor.TITLE;
}



/**
 * @param {!xiv.ui.layout.LayoutFrame} plane
 */
xiv.ui.layouts.Layout.prototype.addLayoutFrame = function(plane){
    this.LayoutFrames = this.LayoutFrames ? this.LayoutFrames : {};
    this.LayoutFrames[plane.getTitle()] = plane;
    //window.console.log("PLANES", plane, this.LayoutFrames);
}


/**
* @protected
*/
xiv.ui.layouts.Layout.prototype.dispatchResize = function(){
    this.dispatchEvent({
	type: xiv.ui.layouts.Layout.EventType.RESIZE
    })
}



/**
* @inheritDoc
*/
xiv.ui.layouts.Layout.prototype.updateStyle = function(){
    goog.base(this, 'updateStyle');
    this.dispatchResize();
}



/**
* @inheritDoc
*/
xiv.ui.layouts.Layout.prototype.disposeInternal = function(){
    goog.base(this, 'disposeInternal');

    delete this.minLayoutFrameHeight_;
    delete this.minLayoutFrameWidth_;

    moka.ui.disposeComponentMap(this.LayoutFrames_);
    delete this.LayoutFrames_;
}