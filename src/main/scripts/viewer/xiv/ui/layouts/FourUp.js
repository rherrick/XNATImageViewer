/**
 * @author kumar.sunil.p@gmail.com (Sunil Kumar)
 */
goog.provide('xiv.ui.layouts.FourUp');

// goog
goog.require('goog.style')
goog.require('goog.events')
goog.require('goog.array')
goog.require('goog.string')


// nrg
goog.require('nrg.string')
goog.require('nrg.ui.Resizable')

// xiv
goog.require('xiv.ui.layouts.XyzvLayout')

//-----------



/**
 * xiv.ui.layouts.FourUp
 *
 * @constructor
 * @extends {xiv.ui.layouts.XyzvLayout}
 */
xiv.ui.layouts.FourUp = function() { 
    goog.base(this); 
}
goog.inherits(xiv.ui.layouts.FourUp, xiv.ui.layouts.XyzvLayout);
goog.exportSymbol('xiv.ui.layouts.FourUp', xiv.ui.layouts.FourUp);



/**
 * @type {!string}
 * @expose
 */
xiv.ui.layouts.FourUp.TITLE = 'Four-Up';



/**
 * Event types.
 * @enum {string}
 * @public
 */
xiv.ui.layouts.FourUp.EventType = {}



/**
 * @type {!string} 
 * @const
 * @expose
 */
xiv.ui.layouts.FourUp.ID_PREFIX =  'xiv.ui.layouts.FourUp';



/**
 * @enum {string}
 * @expose
 */
xiv.ui.layouts.FourUp.CSS_SUFFIX = {
    X: 'x',
    Y: 'y',
    Z: 'z',
    V: 'v'
}




/**
 * @inheritDoc
 */
xiv.ui.layouts.FourUp.prototype.setupLayoutFrame_X = function(){
    goog.base(this, 'setupLayoutFrame_X');

    //
    // Set the plane resizable
    //
    this.setLayoutFrameResizable('X', ['RIGHT', 'TOP', 'TOP_RIGHT']);

    //
    // Listen for the RESIZE event.
    //
    goog.events.listen(this.LayoutFrames['X'].getResizable(), 
		       nrg.ui.Resizable.EventType.RESIZE,
		       this.onLayoutFrameResize_X.bind(this));

    goog.events.listen(this.LayoutFrames['X'].getResizable(), 
		       nrg.ui.Resizable.EventType.RESIZE_END,
		       this.updateStyle.bind(this));
}



/**
 * @override
 * @param {!Event} e
 */
xiv.ui.layouts.FourUp.prototype.onLayoutFrameResize_X = function(e){

    var planePos = goog.style.getPosition(this.LayoutFrames['X'].getElement());
    var planeSize = goog.style.getSize(this.LayoutFrames['X'].getElement());


    //
    // Y PLANE
    //
    goog.style.setPosition(
	this.LayoutFrames['Y'].getElement(), 
	planeSize.width,
	planePos.y);
    goog.style.setSize(
	this.LayoutFrames['Y'].getElement(), 
	this.currSize.width - planeSize.width,
	planeSize.height);


    //
    // Z PLANE
    //
    goog.style.setPosition(
	this.LayoutFrames['Z'].getElement(), 0, 0);
    goog.style.setSize(
	this.LayoutFrames['Z'].getElement(), planeSize.width, planePos.y);



    //
    // V PLANE
    //
    goog.style.setPosition( this.LayoutFrames['V'].getElement(), 
			    planeSize.width, 0);
    goog.style.setSize(this.LayoutFrames['V'].getElement(), 
	this.currSize.width - planeSize.width, planePos.y);


    //
    // CHEAT Make the X RIGHT handle 100% of the height
    //
    var xRightHandle = 
	this.LayoutFrames['X'].getResizable().getResizeDragger('RIGHT').
	getHandle();
    xRightHandle.style.top = '0px';
    xRightHandle.style.height = (this.currSize.height).toString() + 'px';


    //
    // Required!
    //
    this.dispatchResize();
}



/**
* @inheritDoc
*/
xiv.ui.layouts.FourUp.prototype.updateStyle = function(){
    goog.base(this, 'updateStyle');

    this.scaleFrames_();

    //
    // IMPORTANT: these two must come first
    //
    this.updateStyle_Z();
    this.updateStyle_V();

    //
    // Then these
    //
    this.updateStyle_X();
    this.updateStyle_Y();
}




/**
 * @private
 */
xiv.ui.layouts.FourUp.prototype.scaleFrames_ = function(){
    if ((this.prevSize.width !== this.currSize.width) || 
	(this.prevSize.height !== this.currSize.height)) {

	var heightDiff = 1 - ((this.prevSize.height - this.currSize.height) / 
	    this.prevSize.height);
	var widthDiff = 1 - ((this.prevSize.width - this.currSize.width) / 
			     this.prevSize.width);
	var frameHeight = (this.prevSize.height * heightDiff) / 2;
	var frameWidth = (this.prevSize.width * widthDiff) / 2;
	
	this.loop(function(frame, key){
	    goog.style.setSize(frame.getElement(), 
			       Math.max(frameWidth, 
					this.minLayoutFrameWidth_),
			       Math.max(frameHeight, 
					this.minLayoutFrameHeight_));	    
	}.bind(this))


    }
}



/**
 * @inheritDoc
 */
xiv.ui.layouts.FourUp.prototype.updateStyle_X = function() {

    this.LayoutFrames['X'].getElement().style.top = 
	this.LayoutFrames['Z'].getElement().style.height;



    //
    // Boundary
    //
    goog.style.setPosition(
	this.LayoutFrames['X'].getResizable().getBoundaryElement(), 
	this.minLayoutFrameWidth_, this.minLayoutFrameHeight_);

    goog.style.setSize(
	this.LayoutFrames['X'].getResizable().getBoundaryElement(), 
	this.currSize.width - this.minLayoutFrameWidth_ * 2,
	this.currSize.height - this.minLayoutFrameHeight_ * 2);

    

    //
    // Make the X TOP handle 100% of the width
    //
    var xTopHandle = 
	this.LayoutFrames['X'].getResizable().getResizeDragger('TOP').
	getHandle();
    xTopHandle.style.left = '0px';
    xTopHandle.style.width = (this.currSize.width).toString() + 'px';


    //
    // IMPORTANT!!!
    //
    this.LayoutFrames['X'].getResizable().update();


    //
    // CHEAT Make the X RIGHT handle 100% of the height
    //
    var xRightHandle = 
	this.LayoutFrames['X'].getResizable().getResizeDragger('RIGHT').
	getHandle();
    xRightHandle.style.top = '0px';
    xRightHandle.style.height = (this.currSize.height).toString() + 'px';
}



/**
 * @inheritDoc
 */
xiv.ui.layouts.FourUp.prototype.updateStyle_Y = function() {
    this.LayoutFrames['Y'].getElement().style.left = 
	this.LayoutFrames['Z'].getElement().style.width;

    this.LayoutFrames['Y'].getElement().style.top = 
	this.LayoutFrames['Z'].getElement().style.height;
}


/**
 * @inheritDoc
 */
xiv.ui.layouts.FourUp.prototype.updateStyle_Z = function() {
    // Do nothing for now
}



/**
 * @inheritDoc
 */
xiv.ui.layouts.FourUp.prototype.updateStyle_V = function() {
    this.LayoutFrames['V'].getElement().style.left = 
	this.LayoutFrames['Z'].getElement().style.width;
}




/**
* @inheritDoc
*/
xiv.ui.layouts.FourUp.prototype.disposeInternal = function(){
    goog.base(this, 'disposeInternal');
    
}



goog.exportSymbol('xiv.ui.layouts.FourUp.TITLE', xiv.ui.layouts.FourUp.TITLE);
goog.exportSymbol('xiv.ui.layouts.FourUp.EventType',
	xiv.ui.layouts.FourUp.EventType);
goog.exportSymbol('xiv.ui.layouts.FourUp.ID_PREFIX',
	xiv.ui.layouts.FourUp.ID_PREFIX);
goog.exportSymbol('xiv.ui.layouts.FourUp.CSS_SUFFIX',
	xiv.ui.layouts.FourUp.CSS_SUFFIX);
goog.exportSymbol('xiv.ui.layouts.FourUp.prototype.setupLayoutFrame_X',
	xiv.ui.layouts.FourUp.prototype.setupLayoutFrame_X);
goog.exportSymbol('xiv.ui.layouts.FourUp.prototype.onLayoutFrameResize_X',
	xiv.ui.layouts.FourUp.prototype.onLayoutFrameResize_X);
goog.exportSymbol('xiv.ui.layouts.FourUp.prototype.updateStyle',
	xiv.ui.layouts.FourUp.prototype.updateStyle);
goog.exportSymbol('xiv.ui.layouts.FourUp.prototype.updateStyle_X',
	xiv.ui.layouts.FourUp.prototype.updateStyle_X);
goog.exportSymbol('xiv.ui.layouts.FourUp.prototype.updateStyle_Y',
	xiv.ui.layouts.FourUp.prototype.updateStyle_Y);
goog.exportSymbol('xiv.ui.layouts.FourUp.prototype.updateStyle_Z',
	xiv.ui.layouts.FourUp.prototype.updateStyle_Z);
goog.exportSymbol('xiv.ui.layouts.FourUp.prototype.updateStyle_V',
	xiv.ui.layouts.FourUp.prototype.updateStyle_V);
goog.exportSymbol('xiv.ui.layouts.FourUp.prototype.disposeInternal',
	xiv.ui.layouts.FourUp.prototype.disposeInternal);
