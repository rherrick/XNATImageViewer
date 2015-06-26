/**
 * @author kumar.sunil.p@gmail.com (Sunil Kumar)
 */
goog.provide('gxnat.vis.ExperimentResource');

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
gxnat.vis.ExperimentResource = 
function(opt_viewableJson, opt_experimentUrl, opt_initComplete) {
    //
    // superclass
    //
    goog.base(this, 'ExperimentResources', opt_viewableJson, opt_experimentUrl);
   	
    // Set name (used for label);
   	this.sessionInfo['Name'] = opt_viewableJson['label'];

    this.fileNameEval_=eval("(function(fileName) { " + this.getFileNameFilterEvalString() + "})");
    this.setThumbnailUrl(serverRoot + '/images/viewer/xiv/ui/Thumbnail/silhouette.png');

    //
    // Call init complete
    //
    if (opt_initComplete){
    opt_initComplete(this);
    }
}
goog.inherits(gxnat.vis.ExperimentResource, gxnat.vis.AjaxViewableTree);
goog.exportSymbol('gxnat.vis.ExperimentResource', gxnat.vis.ExperimentResource);

/**
 * @const
 * @type {!Array.<string>}
 */
gxnat.vis.ExperimentResource.acceptableFileTypes = [    
    'dcm',
    'dicom',
    'nii.gz',
    'nii',
]

/**
 * @const
 * @type {!string}
 */
gxnat.vis.ExperimentResource.prototype.folderQuerySuffix = 'resources';

/**
 * @const
 * @type {!string}
 */
gxnat.vis.ExperimentResource.prototype.fileQuerySuffix = '/files';



/**
 * @type {!string}
 * @protected
 */
gxnat.vis.ExperimentResource.prototype.fileContentsKey = 'URI';



/**
 * @type {!Object}
 * @private
 */
gxnat.vis.ExperimentResource.prototype.scanMetadata_;



/**
 * @inheritDoc
 */
gxnat.vis.ExperimentResource.prototype.setViewableMetadata = function(){
    //
    // Call superclass
    //
    goog.base(this, 'setViewableMetadata');

}


/**
 * @private
 */
gxnat.vis.ExperimentResource.prototype.getFileNameFilterEvalString = function() {

    var filters = projNode["experimentResourceFilters"];
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
gxnat.vis.ExperimentResource.prototype.getFileList = function(callback){
    //
    // Run callback if we already have the files
    //
    if (this.filesGotten){
    callback();
    return;
    }

    gxnat.get(this.Path['originalUrl'] + "?format=xml",function(returnedXmlStr){
        try {
            var resourceXml = goog.dom.xml.loadXml(returnedXmlStr);
            var entryTags = resourceXml.getElementsByTagName("entry");
            if (!goog.isDefAndNotNull(entryTags) || entryTags.length<1) {
                entryTags = resourceXml.getElementsByTagName("cat:entry");
                if (!goog.isDefAndNotNull(entryTags) || entryTags.length<1) {
                    this.filesGotten=true;
                    return;
                }
            }
            for (var i=0;i<entryTags.length;i++) {
                var fileURI = entryTags[i].getAttribute("URI");
                var fileUrl = this.Path['originalUrl'] + "/files/"  + fileURI;
                if (goog.isDefAndNotNull(fileUrl)) { 
                    this.addFiles(fileUrl, this.fileFilter);
                }
            }
            this.filesGotten=true;
            callback();
        } catch (e) {
            console.log(e);
        }
    }.bind(this), 'text');

    this.setViewableMetadata();

}


/**
 * @inheritDoc
 */
gxnat.vis.ExperimentResource.prototype.fileFilter = function(fileName){    

    fileName = gxnat.vis.ExperimentResource.superClass_.fileFilter.call(this, fileName);
    
    if (!goog.isDefAndNotNull(fileName)) { return };
    var i = 0;
    var len = gxnat.vis.ExperimentResource.acceptableFileTypes.length;
    for (; i<len; i++) {
        if (goog.string.caseInsensitiveEndsWith(fileName, 
            '.' + gxnat.vis.ExperimentResource.acceptableFileTypes[i])) {
         	var junkvar=this.fileNameEval_(fileName); 
         	return this.fileNameEval_(fileName); 
        } 
    }
    return null;
}


/**
 * @private
 */
gxnat.vis.ExperimentResource.prototype.getGroupForFileCreateIfNecessary = function(fileName) {

    // We'll create a group for each resource if DICOM and each NIFTI file if NIFTI.
    var nameParts = fileName.split("/");
    for (var i=0;i<nameParts.length;i++) {
        if (nameParts[i]=="files") {
            var resourceStr = "";
            if (goog.string.caseInsensitiveContains(nameParts[nameParts.length-1],"nii")) {
                for (var j=i+1;j<nameParts.length;j++) {
                    resourceStr = (resourceStr!="") ? resourceStr + "/" + nameParts[j] : nameParts[j];
                }
            }
            break;
        }
    }
    if (resourceStr == undefined) {
        resourceStr = 'experimentResource';
    }
    for (var i=0;i<this.ViewableGroups.length;i++) {
        if (this.ViewableGroups[i].getTitle()==resourceStr) {
            return this.ViewableGroups[i];
        }
    }
    var newGroup = new gxnat.vis.ViewableGroup();
    newGroup.setSourceInfo(this.sessionInfo['Name']);
    newGroup.setTitle(resourceStr);
    newGroup.setCategory('experimentResources');
    newGroup.setThumbnailUrl("NONE");
    this.ViewableGroups.push(newGroup);
    return newGroup;

}

/**
 * @inheritDoc
 */
gxnat.vis.ExperimentResource.prototype.addFiles = function(fileNames) {

    this.setCategory('Experiment Resources');
    
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
gxnat.vis.ExperimentResource.prototype.makeFileUrl = function(xnatFileJson) {
    return gxnat.Path.graftUrl(this.experimentUrl, 
          xnatFileJson[this.fileContentsKey], 'experiments');

}


/**
 * @inheritDoc
 */
gxnat.vis.ExperimentResource.prototype.dispose = function(){
    goog.base(this, 'dispose');

    if (goog.isDefAndNotNull(this.scanMetadata_)){
    goog.object.clear(this.scanMetadata_);
    }
    delete this.scanMetadata_;
}

goog.exportSymbol('gxnat.vis.ExperimentResource.acceptableFileTypes',
    gxnat.vis.ExperimentResource.acceptableFileTypes);
goog.exportSymbol('gxnat.vis.ExperimentResource.prototype.folderQuerySuffix',
    gxnat.vis.ExperimentResource.prototype.folderQuerySuffix);
goog.exportSymbol('gxnat.vis.ExperimentResource.prototype.fileQuerySuffix',
    gxnat.vis.ExperimentResource.prototype.fileQuerySuffix);
goog.exportSymbol('gxnat.vis.ExperimentResource.prototype.fileContentsKey',
    gxnat.vis.ExperimentResource.prototype.fileContentsKey);
goog.exportSymbol('gxnat.vis.ExperimentResource.prototype.setViewableMetadata',
    gxnat.vis.ExperimentResource.prototype.setViewableMetadata);
goog.exportSymbol('gxnat.vis.ExperimentResource.prototype.getFileList',
    gxnat.vis.ExperimentResource.prototype.getFileList);
goog.exportSymbol('gxnat.vis.ExperimentResource.prototype.fileFilter',
    gxnat.vis.ExperimentResource.prototype.fileFilter);
goog.exportSymbol('gxnat.vis.ExperimentResource.prototype.addFiles',
    gxnat.vis.ExperimentResource.prototype.addFiles);
goog.exportSymbol('gxnat.vis.ExperimentResource.prototype.makeFileUrl',
    gxnat.vis.ExperimentResource.prototype.makeFileUrl);
goog.exportSymbol('gxnat.vis.ExperimentResource.prototype.dispose',
    gxnat.vis.ExperimentResource.prototype.dispose);
