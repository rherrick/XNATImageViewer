/**
 * @author kumar.sunil.p@gmail.com (Sunil Kumar)
 */
goog.provide('gxnat.vis.ExperimentReconstruction');

// goog
goog.require('goog.dom.DomHelper');
goog.require('goog.dom');
goog.require('goog.dom.xml');
goog.require('goog.net.XhrIo');
goog.require('goog.string');
goog.require('goog.object');

// gxnat
goog.require('gxnat');
goog.require('gxnat.Path');
goog.require('gxnat.vis.AjaxViewableTree');
goog.require('gxnat.vis.Viewable');
goog.require('gxnat.vis.ViewableGroup');

//-----------



/**
 * Subclass of the 'AjaxViewableTree' class pertaining to Slicer .mrb files.
 * 
 * @param {Object=} opt_viewableJson The json associated with the viewable.
 * @param {string=} opt_experimentUrl The experiment-level url of the viewable.
 * @param {Function=} opt_initComplete The callback when the init process is 
 *     complete.
 * @constructor
 * @extends {gxnat.vis.AjaxViewableTree}
 */
gxnat.vis.ExperimentReconstruction = 
function(opt_viewableJson, opt_experimentUrl, opt_initComplete) {
    //
    // superclass
    //
    goog.base(this, 'ExperimentReconstructions', opt_viewableJson, opt_experimentUrl);
   	
    // Set name (used for label);
   	this.sessionInfo['Name'] = opt_viewableJson['ID'];

    this.fileNameEval_=eval("(function(fileName) { " + this.getFileNameFilterEvalString() + "})");
    this.setThumbnailUrl(serverRoot + '/images/viewer/xiv/ui/Thumbnail/silhouette.png');

    //
    // Call init complete
    //
    if (opt_initComplete){
    opt_initComplete(this);
    }
}
goog.inherits(gxnat.vis.ExperimentReconstruction, gxnat.vis.AjaxViewableTree);
goog.exportSymbol('gxnat.vis.ExperimentReconstruction', gxnat.vis.ExperimentReconstruction);

/**
 * @const
 * @type {!Array.<string>}
 */
gxnat.vis.ExperimentReconstruction.acceptableFileTypes = [
    'nii.gz',
    'nii',
]

/**
 * @const
 * @type {!string}
 */
gxnat.vis.ExperimentReconstruction.prototype.folderQuerySuffix = 'reconstructions';

/**
 * @const
 * @type {!string}
 */
gxnat.vis.ExperimentReconstruction.prototype.fileQuerySuffix = '/files';



/**
 * @type {!string}
 * @protected
 */
gxnat.vis.ExperimentReconstruction.prototype.fileContentsKey = 'URI';



/**
 * @type {!Object}
 * @private
 */
gxnat.vis.ExperimentReconstruction.prototype.scanMetadata_;



/**
 * @inheritDoc
 */
gxnat.vis.ExperimentReconstruction.prototype.setViewableMetadata = function(){
    //
    // Call superclass
    //
    goog.base(this, 'setViewableMetadata');

}


/**
 * @private
 */
gxnat.vis.ExperimentReconstruction.prototype.getFileNameFilterEvalString = function() {

    var filters = projNode["experimentReconstructionFilters"];
    // NOTE:  by default (with invalid or no configuration), we will not return any files. 
    var whenNoFilters = "return null;"
    if (goog.isDefAndNotNull(filters)) {
    	var evalStr="if (";
        for (var prop in filters) {
            var nameMatch = eval("(function(name){return name.match(" + prop + ")})(\"" + this.sessionInfo['Name'] + "\")");
            if (filters.hasOwnProperty(prop) && nameMatch && nameMatch==this.sessionInfo['Name']) {
                for (var j=0;j<filters[prop].length;j++) {
                    if (evalStr.length>4) evalStr+=" || ";
                    evalStr+="(fileName.match(";
                    evalStr+=filters[prop][j];
                    evalStr+="))"; 
                }
            } 
        }
        evalStr+=") return fileName;";
        if (evalStr.indexOf("(fileName.match(")>=0) {
            return evalStr;
        } else {
            // NOTE:  by default (with invalid or no configuration), we will not return any files. 
            return whenNoFilters;
        }
    }
    return whenNoFilters;

}



/**
 * @inheritDoc
 */
gxnat.vis.ExperimentReconstruction.prototype.getFileList = function(callback){
    //
    // Run callback if we already have the files
    //
    if (this.filesGotten){
      callback();
      return;
    }
    //
    // Otherwise, run query
    //
    //window.console.log("GET FILES", this);
    var fileQueryUrl = this.queryUrl + this.fileQuerySuffix;
    var absoluteUrl = '';    
    var len = 0;
    var fileUrl = '';
    var fileMetadata;
    var resource = '';

    //window.console.log(this, fileQueryUrl);
    gxnat.jsonGet(fileQueryUrl, function(fileMetadataArray){
    	//window.console.log(fileMetadataArray);
    	len = fileMetadataArray.length;
    	for (var i =  0; i < len; i++) {
    	    fileMetadata = fileMetadataArray[i]
    	    fileUrl = this.makeFileUrl(fileMetadata);
    	    //window.console.log("ABSOLUTE URL:", 
    	    //fileMetadataArray[i], fileUrl); 
    	    if (fileUrl) { 
    		    this.setFileMetadata(fileUrl, fileMetadata)
            this.addFiles(fileUrl, this.fileFilter);
    	    }
    	}
    	callback();
    	this.filesGotten = true;
    }.bind(this));
    

    this.setViewableMetadata();

}


/**
 * @inheritDoc
 */
gxnat.vis.ExperimentReconstruction.prototype.fileFilter = function(fileName){    

    fileName = gxnat.vis.ExperimentReconstruction.superClass_.fileFilter.call(this, fileName);
    
    if (!goog.isDefAndNotNull(fileName)) { return };
    var i = 0;
    var len = gxnat.vis.ExperimentReconstruction.acceptableFileTypes.length;
    for (; i<len; i++) {
        if (goog.string.caseInsensitiveEndsWith(fileName, 
            '.' + gxnat.vis.ExperimentReconstruction.acceptableFileTypes[i])) {
         	//var junkvar=this.fileNameEval_(fileName); 
         	return this.fileNameEval_(fileName); 
        } 
    }
    return null;
}


/**
 * @private
 */
gxnat.vis.ExperimentReconstruction.prototype.getGroupForFileCreateIfNecessary = function(fileName) {

    // We'll create a group for each resource and each NIFTI file.
    var nameParts = fileName.split("/");
    for (var i=0;i<nameParts.length;i++) {
        if (nameParts[i]=="files") {
            var resourceStr = this.fileMetadata_[fileName]['collection'];
            if (goog.string.caseInsensitiveContains(nameParts[nameParts.length-1],"nii")) {
                for (var j=i+1;j<nameParts.length;j++) {
                    resourceStr = (resourceStr!="") ? resourceStr + "/" + nameParts[j] : nameParts[j];
                }
            }
            break;
        }
    }
    if (resourceStr == undefined) {
        resourceStr = 'experimentReconstruction';
    }
    for (var i=0;i<this.ViewableGroups.length;i++) {
        if (this.ViewableGroups[i].getTitle()==resourceStr) {
            return this.ViewableGroups[i];
        }
    }
    var newGroup = new gxnat.vis.ViewableGroup();
    newGroup.setSourceInfo(this.sessionInfo['Name']);
    newGroup.setTitle(resourceStr);
    newGroup.setCategory('experimentReconstructions');
    newGroup.setThumbnailUrl("NONE");
    this.ViewableGroups.push(newGroup);
    return newGroup;

}

/**
 * @inheritDoc
 */
gxnat.vis.ExperimentReconstruction.prototype.addFiles = function(fileNames) {

    this.setCategory('Experiment Reconstructions');
    
    goog.array.forEach(fileNames.split(","), function(fileName){
        var currFile = this.fileFilter(fileName);
        if (!goog.isDefAndNotNull(currFile)) {
            return;
        }
        var vGroup = this.getGroupForFileCreateIfNecessary(currFile);    
        if (vGroup.getViewables().length == 0){
            vGroup.addViewable(new gxnat.vis.Viewable());
        }
        vGroup.getViewables()[0].addFiles(fileNames);
    }, this);

    this.ViewableGroups.sort(function(a,b) {
        var a_hasdcm=false;
        var a_hasnii=false;
        var b_hasdcm=false;
        var b_hasnii=false;
        if (a.Viewables.length>0 && a.Viewables[0].getFiles().length>0) {
            if (a.Viewables[0].getFiles()[0].toLowerCase().indexOf(".dcm")>=0 || a.Viewables[0].getFiles()[0].toLowerCase().indexOf(".dcm")>=0) {
                a_hasdcm=true;
            } else if (a.Viewables[0].getFiles()[0].toLowerCase().indexOf(".nii")>=0) {
                a_hasnii=true;
            }
        } 
        if (b.Viewables.length>0 && b.Viewables[0].getFiles().length>0) {
            if (b.Viewables[0].getFiles()[0].toLowerCase().indexOf(".dcm")>=0 || b.Viewables[0].getFiles()[0].toLowerCase().indexOf(".dcm")>=0) {
                b_hasdcm=true;
            } else if (b.Viewables[0].getFiles()[0].toLowerCase().indexOf(".nii")>=0) {
                b_hasnii=true;
            }
        } 
        var a_srtval = ((a_hasdcm) ? 9 : 0) + ((a_hasnii) ? 5 : 0) + ((a.getTitle()<b.getTitle()) ? 1 : -1);
        var b_srtval = ((b_hasdcm) ? 9 : 0) + ((b_hasnii) ? 5 : 0);
        return b_srtval-a_srtval;
    });

}

/**
 * @inheritDoc
 */
gxnat.vis.ExperimentReconstruction.prototype.makeFileUrl = function(xnatFileJson) {
    return gxnat.Path.graftUrl(this.experimentUrl, 
          xnatFileJson[this.fileContentsKey], 'experiments');

}


/**
 * @inheritDoc
 */
gxnat.vis.ExperimentReconstruction.prototype.dispose = function(){
    goog.base(this, 'dispose');

    if (goog.isDefAndNotNull(this.scanMetadata_)){
    goog.object.clear(this.scanMetadata_);
    }
    delete this.scanMetadata_;
}

goog.exportSymbol('gxnat.vis.ExperimentReconstruction.acceptableFileTypes',
    gxnat.vis.ExperimentReconstruction.acceptableFileTypes);
goog.exportSymbol('gxnat.vis.ExperimentReconstruction.prototype.folderQuerySuffix',
    gxnat.vis.ExperimentReconstruction.prototype.folderQuerySuffix);
goog.exportSymbol('gxnat.vis.ExperimentReconstruction.prototype.fileQuerySuffix',
    gxnat.vis.ExperimentReconstruction.prototype.fileQuerySuffix);
goog.exportSymbol('gxnat.vis.ExperimentReconstruction.prototype.fileContentsKey',
    gxnat.vis.ExperimentReconstruction.prototype.fileContentsKey);
goog.exportSymbol('gxnat.vis.ExperimentReconstruction.prototype.setViewableMetadata',
    gxnat.vis.ExperimentReconstruction.prototype.setViewableMetadata);
goog.exportSymbol('gxnat.vis.ExperimentReconstruction.prototype.getFileList',
    gxnat.vis.ExperimentReconstruction.prototype.getFileList);
goog.exportSymbol('gxnat.vis.ExperimentReconstruction.prototype.fileFilter',
    gxnat.vis.ExperimentReconstruction.prototype.fileFilter);
goog.exportSymbol('gxnat.vis.ExperimentReconstruction.prototype.addFiles',
    gxnat.vis.ExperimentReconstruction.prototype.addFiles);
goog.exportSymbol('gxnat.vis.ExperimentReconstruction.prototype.makeFileUrl',
    gxnat.vis.ExperimentReconstruction.prototype.makeFileUrl);
goog.exportSymbol('gxnat.vis.ExperimentReconstruction.prototype.dispose',
    gxnat.vis.ExperimentReconstruction.prototype.dispose);
