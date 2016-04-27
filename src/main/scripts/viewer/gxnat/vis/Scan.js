/**
 * @author kumar.sunil.p@gmail.com (Sunil Kumar)
 */
goog.provide('gxnat.vis.Scan');

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
gxnat.vis.Scan = 
function(opt_viewableJson, opt_experimentUrl, opt_initComplete) {
    //
    // superclass
    //
    goog.base(this, 'Scans', opt_viewableJson, opt_experimentUrl);

    //
    // Set the init frames to 0
    //
    this.sessionInfo['Total Frames'] = 0;

    //
    // Call init complete
    //
    if (opt_initComplete){
    opt_initComplete(this);
    }
}
goog.inherits(gxnat.vis.Scan, gxnat.vis.AjaxViewableTree);
goog.exportSymbol('gxnat.vis.Scan', gxnat.vis.Scan);



/**
 * @const
 */
/**
   gxnat.vis.Scan.sessionProperties = {
   "SessionID": {'label': "Session ID", 'value': ['--']},
   "Accession #": {'label':"Accession #", 'value': ['--']},
   "Scanner" : {'label':"Scanner", 'value': ["--"]},
   "Format" : {'label':"Format", 'value': ["--"]},
   "Age" : {'label':"Age", 'value': ["--"]},
   "Gender": {'label':"Gender", 'value': ["--"]},
   "Handedness": {'label':"Handedness", 'value': ["--"]},
   "AcqDate" : {'label':"Acq.Date", 'value': ["--"]},
   "Scan" : {'label':"Scan", 'value': ['--']},
   "Type" : {'label':"type", 'value': ["--"]},
   "Quality" : {'label':"type", 'value': ["--"]},
   }
*/


/**
 * @const
 * @type {!Array.<string>}
 */
gxnat.vis.Scan.acceptableFileTypes = [    
    'dcm',
    'dicom',
    'nii.gz',
    'nii',
]

/**
 * We'll drop scans that have more than 1500 frames
 * @const
 * @type {number}
 */
gxnat.vis.Scan.MAX_FRAMES = 1500;

/**
 * We'll drop scans that have more than 2000 files (used when we don't know the frame count)
 * @const
 * @type {number}
 */
gxnat.vis.Scan.MAX_FILES = 2000;

/**
 * Columns to request when making REST calls (value of columns parameter, to request specific metadata)
 * @type {!string}
 */
gxnat.vis.Scan.prototype.restColumns = 'ID,URI,quality,series_description,type,xnat_imagescandata_id,xsiType,xnat:mrscandata/parameters/orientation,frames,xnat:mrscandata/parameters/acqType';


/**
 * @private
 */
gxnat.vis.Scan.restDataObject;


/**
 * @override
 * @param {!array} viewablesJson - The json returned from viewableFolderUrl
 * @param {!string} viewableFolderUrl - The url of the viewable folders
 * @param {!Function} runCallback.  The callback to apply.
 */
gxnat.vis.Scan.prototype.populateRestDataObject = function(viewablesJson,viewableFolderUrl,runCallback) {
	var scanIds = '';
	gxnat.vis.Scan.restDataObject = { viewables:viewablesJson };
	goog.array.forEach(viewablesJson,function(viewableJson,i){
		if (typeof viewableJson.ID !== 'undefined' && viewableJson.ID != '') {
			if (typeof viewableJson.frames !== 'undefined') {
				var nFrames = parseInt(viewableJson.frames);
			}
			if (isNaN(nFrames) || nFrames <= gxnat.vis.Scan.MAX_FRAMES) {
				scanIds+=(viewableJson.ID + ((i<viewablesJson.length-1) ? ',' : ''));
			}
		}
	});
    	gxnat.jsonGet(viewableFolderUrl + '/' + scanIds + '/files?format=json', function(filesJson){ 
		gxnat.vis.Scan.restDataObject.files = filesJson;
		runCallback();
	});
} 


/**
 * @private
 * @param {!string} abbrev
 * @return {string}
 */
gxnat.vis.Scan.prototype.getOrientationFromAbbreviation_ = function(abbrev){
    switch (abbrev){
    case 'Sag':
    return 'Sagittal';
    case 'Cor':
    return 'Coronal';
    case 'Tra':
    return 'Transverse';
    }
}



/**
 * @const
 * @type {!string}
 */
gxnat.vis.Scan.prototype.folderQuerySuffix = 'scans';

/**
 * @const
 * @type {!string}
 */
gxnat.vis.Scan.prototype.fileQuerySuffix = '/files';



/**
 * @type {!string}
 * @protected
 */
gxnat.vis.Scan.prototype.fileContentsKey = 'URI';



/**
 * @type {!Object}
 * @private
 */
gxnat.vis.Scan.prototype.scanMetadata_;




/**
 * @inheritDoc
 */
gxnat.vis.Scan.prototype.setViewableMetadata = function(){
    //
    // Call superclass
    //
    goog.base(this, 'setViewableMetadata');

    //
    // Set the init frames to 0
    //
    if (goog.isDefAndNotNull(this.scanMetadata_['frames'])){
    	this.sessionInfo['Total Frames'] = this.scanMetadata_['frames'];
    	if (typeof this.sessionInfo['Total Frames'] == 'undefined' || this.sessionInfo['Total Frames'] == "") {
			this.sessionInfo['Total Frames'] = "Unknown";
		}
    }

    //
    // Orientation
    //
    if (goog.isDefAndNotNull(this.scanMetadata_['xnat:mrscandata/parameters/orientation'])){
    this.sessionInfo['Orientation'] = 
        this.getOrientationFromAbbreviation_(
        this.scanMetadata_['xnat:mrscandata/parameters/orientation']);

    //
    // Store the orientation as a property
    //
    this.orientation = this.sessionInfo['Orientation'];
    }
    
    //
    // Acq. Type
    //
    if (goog.isDefAndNotNull(this.scanMetadata_['xnat:mrscandata/parameters/acqtype'])){
    this.sessionInfo['Acq. Type'] = this.scanMetadata_['xnat:mrscandata/parameters/acqtype']
    }
}



/**
 * @inheritDoc
 */
gxnat.vis.Scan.prototype.getFileList = function(callback){
    //
    // Run callback if we already have the files
    //
    if (this.filesGotten){
    callback();
    return;
    }

    //--------------------------
    //
    // IMPORTANT!! PLEASE READ!!
    //
    // The basic idea here is that before we get the actual file list, we
    // must get the metadata associated with the scan.  So, we do exactly that.
    // We first query for the scan's metadata, and then we call the superclass
    // 'getFileList' to query for the actual file list.
    //
    // MRH:  With the addition of gxnat.vis.Scan.prototype.restColumns, we expect not to have to issue separate queries to get the metadata 
    //--------------------------

    //
    // Get the scan metadata first
    //
    this.scanMetadata_ = this.json;
    //
    // set the metadata
    //
    this.setViewableMetadata();

    var fileQueryUrl = this.queryUrl + this.fileQuerySuffix;
    var absoluteUrl = '';    
    var fileUrl = '';
    var fileMetadata;

    goog.array.forEach(gxnat.vis.Scan.restDataObject.viewables,function(viewable){
	var len = gxnat.vis.Scan.restDataObject.files.length;
	if (viewable.ID!=this.json.ID) {
		return;
	}
    var addFileArr = [];
	for (var i=0; i<len; i++) {
	    fileMetadata = gxnat.vis.Scan.restDataObject.files[i];
	    var scanID = fileMetadata.URI.substring(fileMetadata.URI.indexOf("scans/")+6);
	    scanID = scanID.substring(0,scanID.indexOf("/"));
	    if (scanID!=viewable.ID) {
		continue;
	    }
	    fileUrl = this.makeFileUrl(fileMetadata);
	    //window.console.log("ABSOLUTE URL:", 
	    //fileMetadataArray[i], fileUrl); 
	    if (fileUrl) { 
		     this.setFileMetadata(fileUrl, fileMetadata)
           addFileArr.push(fileUrl);
           // Remove element from array and decrement iterator and length (probably more efficient here to iterate through the array forward)
           gxnat.vis.Scan.restDataObject.files.splice(i,1);
           len--;
           i--;
	    }
	}
	this.addFiles(addFileArr, this.fileFilter);

    if (this.sessionInfo['Total Frames'] == 0 || this.sessionInfo['Total Frames'] == "Unknown" ) {
        this.sessionInfo['Total Frames'] = (this.ViewableGroups.length>0) ? this.ViewableGroups[0].getViewables()[0].getFiles().length : this.sessionInfo['Total Frames'];
    }

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

	this.getThumbnailImage();
	callback();
	this.filesGotten = true;
    }.bind(this));

}



/**
 * @inheritDoc
 */
gxnat.vis.Scan.prototype.fileFilter = function(fileName){    
    fileName = gxnat.vis.Scan.superClass_.fileFilter.call(this, fileName);
    //window.console.log("FILENAME", fileName);
    if (!goog.isDefAndNotNull(fileName)) { return };
    
    var i = 0;
    var len = gxnat.vis.Scan.acceptableFileTypes.length;
    for (; i<len; i++) {
    //window.console.log(fileName);
    if (goog.string.caseInsensitiveEndsWith(fileName, 
        '.' + gxnat.vis.Scan.acceptableFileTypes[i])) {
        //window.console.log('Found usable scan file: ', fileName);
        return fileName;
    } 
    }
    //window.console.log('Found skippable scan file: ', fileName);
    return null;
}


/**
 * @private
 */
gxnat.vis.Scan.prototype.getGroupForFileCreateIfNecessary = function(fileName) {
    // We'll create a group for each resource if DICOM and each NIFTI file if NIFTI.
    var nameParts = fileName.split("/");
    for (var i=0;i<nameParts.length;i++) {
        if (nameParts[i]=="scans") {
            var scanStr = nameParts[i+1];
            if (scanStr!=this.json.ID) {
            	return;
            }
        }
        if (nameParts[i]=="resources") {
            var resourceStr = nameParts[i+1];
            if (goog.string.caseInsensitiveContains(nameParts[nameParts.length-1],"nii")) {
                resourceStr = resourceStr + " - " + nameParts[nameParts.length-1];
            }
            break;
        }
    }
    if (resourceStr == undefined) {
        resourceStr = 'scan';
    }
    for (var i=0;i<this.ViewableGroups.length;i++) {
        if (this.ViewableGroups[i].getSourceInfo()==resourceStr) {
            return this.ViewableGroups[i];
        }
    }
    var newGroup = new gxnat.vis.ViewableGroup();
    newGroup.setSourceInfo(resourceStr);
    newGroup.setTitle(resourceStr);
    newGroup.setCategory('scans');
    var match = false;
    goog.array.some(gxnat.vis.Scan.restDataObject.files,function(fileObj){
    	var compareVal = fileName.substring(fileName.indexOf('scans/')+6);
    	if (compareVal == fileObj.URI.substring(fileObj.URI.indexOf('scans/')+6)) {
                    if (fileObj.collection.indexOf("DCMCatalog")>=0) {
                        newGroup.setTitle("DICOM" + ((resourceStr.indexOf('-')>0) ? resourceStr.substring(resourceStr.indexOf('-')-1) : ""));
    		} else {
                        newGroup.setTitle(fileObj.collection + ((resourceStr.indexOf('-')>0) ? resourceStr.substring(resourceStr.indexOf('-')-1) : ""));
    		} 
    		match = true;
    		return true;
    	}
    	return false;
    });
    if (!match) {
          newGroup.setTitle(resourceStr);
    }
    this.ViewableGroups.push(newGroup);
    return newGroup;
}

/**
 * @inheritDoc
 */
gxnat.vis.Scan.prototype.addFiles = function(fileNames) {

    this.setCategory('Scans');
    
    if (fileNames.length>gxnat.vis.Scan.MAX_FILES) {
        return;
    }
    for (var i=0; i<fileNames.length; i++) {
        var currFile = this.fileFilter(fileNames[i]);
        if (!goog.isDefAndNotNull(currFile)) {
            continue;
        }
        var vGroup = this.getGroupForFileCreateIfNecessary(currFile);    
        if (vGroup==undefined) {
            continue;
	    }
        if (vGroup.getViewables().length == 0){
            vGroup.addViewable(new gxnat.vis.Viewable());
        }
        vGroup.getViewables()[0].addFiles(fileNames[i], this.fileFilter);
    }

    //window.console.log(this.ViewableGroups[0].getViewables()[0].getFiles());
    //window.console.log('SCAN FILE LENGTH', 
    //this.ViewableGroups[0].getViewables()[0].getFiles().length);
}

/**
 * @inheritDoc
 */
gxnat.vis.Scan.prototype.makeFileUrl = function(xnatFileJson) {
    return gxnat.Path.graftUrl(this.experimentUrl, 
          xnatFileJson[this.fileContentsKey], 'experiments');

}



/**
 * @inheritDoc
 */
gxnat.vis.Scan.prototype.getThumbnailImage = function(opt_callback){
    //window.console.log('GET THUMBNAIL IMAGE');
    var useMontage = false;

    if (!useMontage) {
    
    //window.console.log('NOT USING MONTAGE');
    //window.console.log(this, this.ViewableGroups[0]);

    if (!this.ViewableGroups || !this.ViewableGroups[0]) { return };

    //
    // Select the image in the middle of the list to 
    // serve as the thumbnail after sorting the fileURIs
    // using natural sort.
    //
    for (var i=0;i<this.ViewableGroups.length;i++) {
        var sortedFiles = this.ViewableGroups[i].getViewables()[0].getFiles().
            sort(gxnat.naturalSort);
        if (sortedFiles[0].toLowerCase().indexOf(".nii")>=0) {
            this.ViewableGroups[i].setThumbnailUrl(serverRoot + '/images/viewer/xiv/ui/Thumbnail/silhouette.png');
        } else {
            var imgInd = Math.floor((sortedFiles.length) / 2);
            this.ViewableGroups[i].setThumbnailUrl(sortedFiles[imgInd] + gxnat.JPEG_CONVERT_SUFFIX);
        }
        if (i==0) {
           this.setThumbnailUrl(this.ViewableGroups[0].getThumbnailUrl());
        }
        //window.console.log("UNSORTED", 
        //           this.ViewableGroups[0].getViewables()[0].getFiles())
        //window.console.log("SORTED", sortedFiles);
    }

    if (goog.isDefAndNotNull(opt_callback)){
        opt_callback(this);
    }
    return;
    }

    //
    // Use the cached XNAT Thumbnail image - for performance.
    //

    // reference
    var refStr = "/xnat/REST/experiments/localhost_E00003/scans/1a" + 
    "/resources/SNAPSHOTS/files?file_content=THUMBNAIL&index=0"

    var thumbUrl = this.Path['prefix'] + '/experiments/' + 
    this.Path['experiments'] + '/scans/' + this.Path['scans'] + 
    "/resources/SNAPSHOTS/files?file_content=THUMBNAIL&index=0";

    this.setThumbnailUrl(thumbUrl);

    if (goog.isDefAndNotNull(opt_callback)){
    opt_callback(this);
    }
}



/**
 * @inheritDoc
 */
gxnat.vis.Scan.prototype.dispose = function(){
    goog.base(this, 'dispose');

    if (goog.isDefAndNotNull(this.scanMetadata_)){
    goog.object.clear(this.scanMetadata_);
    }
    delete this.scanMetadata_;
}

goog.exportSymbol('gxnat.vis.Scan.acceptableFileTypes',
    gxnat.vis.Scan.acceptableFileTypes);
goog.exportSymbol('gxnat.vis.Scan.MAX_FRAMES',
    gxnat.vis.Scan.MAX_FRAMES);
goog.exportSymbol('gxnat.vis.Scan.MAX_FILES',
    gxnat.vis.Scan.MAX_FILES);
goog.exportSymbol('gxnat.vis.Scan.prototype.restColumns',
    gxnat.vis.Scan.prototype.restColumns);
goog.exportSymbol('gxnat.vis.Scan.prototype.populateRestDataObject',
    gxnat.vis.Scan.prototype.populateRestDataObject);
goog.exportSymbol('gxnat.vis.Scan.prototype.folderQuerySuffix',
    gxnat.vis.Scan.prototype.folderQuerySuffix);
goog.exportSymbol('gxnat.vis.Scan.prototype.fileQuerySuffix',
    gxnat.vis.Scan.prototype.fileQuerySuffix);
goog.exportSymbol('gxnat.vis.Scan.prototype.fileContentsKey',
    gxnat.vis.Scan.prototype.fileContentsKey);
goog.exportSymbol('gxnat.vis.Scan.prototype.setViewableMetadata',
    gxnat.vis.Scan.prototype.setViewableMetadata);
goog.exportSymbol('gxnat.vis.Scan.prototype.getFileList',
    gxnat.vis.Scan.prototype.getFileList);
goog.exportSymbol('gxnat.vis.Scan.prototype.fileFilter',
    gxnat.vis.Scan.prototype.fileFilter);
goog.exportSymbol('gxnat.vis.Scan.prototype.addFiles',
    gxnat.vis.Scan.prototype.addFiles);
goog.exportSymbol('gxnat.vis.Scan.prototype.makeFileUrl',
    gxnat.vis.Scan.prototype.makeFileUrl);
goog.exportSymbol('gxnat.vis.Scan.prototype.getThumbnailImage',
    gxnat.vis.Scan.prototype.getThumbnailImage);
goog.exportSymbol('gxnat.vis.Scan.prototype.dispose',
    gxnat.vis.Scan.prototype.dispose);
