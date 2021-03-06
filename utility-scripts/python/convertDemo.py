import sys
import os
import shutil
import re

from time import gmtime, strftime
        
#
# vmHeader
#
vmHeader  = '#* @vtlvariable name="content" type="org.apache.turbine.services.pull.tools.ContentTool" *#\n' 
vmHeader += '#* @vtlvariable name="displayManager" type="org.nrg.xdat.display.DisplayManager" *#\n' 
vmHeader += '#* @vtlvariable name="om" type="org.nrg.xdat.om.XnatMrsessiondata" *#\n'


#
# headers
#
autoHeader =  \
 "<!-- THIS FILE WAS AUTOGENERATED BY ($XNATImageViewer)/utility-scripts/"
autoHeader += "%s at %s -->"%(os.path.basename(__file__), \
                              strftime("%Y-%m-%d %H:%M:%S", gmtime()))
autoHeaders = ['\n']*3 + [autoHeader] + ['\n']*3


#
# Tags
#
XIV_STATE_TAG = 'XIV_STATE'


def writeTarget(target, lines):
    """
    """
    dirname = os.path.dirname(target)
    if not os.path.exists(dirname):
        os.makedirs(dirname)
    f = open(target,'w')
    for line in lines:
        f.write("%s\n" % line)
    f.close()




def makeBackup(target):
    """
    """
    if not os.path.exists(target): 
        return

    shutil.move(target, os.path.join(os.path.dirname(target), os.path.basename(target).split('.')[0] + '.BKP'))




def getFileLines(path):
    """
    """
    with open(path) as f:
        content = f.readlines()
    return content




def convertDemoToPopup(demoPath):
    """ Converts the Demo.html file to the associated popup.html
    """
    #-----------------
    # Define parameters
    #-----------------
    newlines = []
    content = getFileLines(demoPath)


    for line in content:

        #
        # Replace the appropriate paths
        #
        line = line.replace('src/main', '../../..').strip()
        

        #
        # Set the Image viewer mode
        #
        if isModalStateLine(line):
            line = 'var modalState = \'popup\';';

        if isModeLine(line):
            line = XIV_STATE_TAG + ' = \'live\';';

        #
        # Need to add the server root
        #
        if ('goog.require' in line):
            line = line + "\nserverRoot = '';";
        
        newlines.append(line)

    return newlines


def isModeLine(line):
    return ' = ' in line and XIV_STATE_TAG in line \
        and line.count('=') == 1 and not 'new' in line




def isModalStateLine(line):
    return ' = ' in line and 'modalState' in line and \
        line.count('=') == 1 and not 'new' in line



def convertDemoToVM(demoPath):
    """ Converts the Demo.html file to the associated XImgView.vm
    """

    #-----------------
    # Define parameters
    #-----------------
    clearables = ['html>', 'head>', 'body>', 'title>', 'DEMO_DATA']    
    pathVal = 'projects/$om.getProject()/subjects/$om.getSubjectId()/' + \
              'experiments/$om.getId()'
    newlines = []
    content = getFileLines(demoPath)



    #-----------------
    # Loop through lines
    #-----------------   
    for line in content:
        #
        # Remove html tags 
        # (this works for both prepend tags and suffix tags)
        #
        for clearable in clearables:
            if clearable in line:
                line = ''

        #
        # Set the Image viewer mode
        #
        if isModeLine(line):
            line = XIV_STATE_TAG + ' = \'live\';';
        elif isModalStateLine(line):
            line = 'var modalState = \'windowed\';';

            
        #
        # Convert filepaths to VM gets
        #
        vmChangers = ['href=', 'src=']
        for changer in vmChangers:
            if changer in line:
                lineSplit = line.split(" ")
                for word in lineSplit:
                    if changer in word:
                        word = word.replace("'", '"')
                        quoteLocations = [m.start() for m in re.finditer('"', word)]
                        
                        prefix = word[:quoteLocations[0]]
                        mid = '"$content.getURI("' + word[quoteLocations[0]+1:quoteLocations[1]] + '")"'
                        suffix = word[quoteLocations[1]+1:]
                        newWord = prefix + mid + suffix

                        line = line.replace(word, newWord)
                        

            
        #
        # Convert filepaths to appropriate directories
        #
        if 'src/main/' in line:
            line = line.replace('src/main/', '')



            
        newlines.append(line.strip())

    return [vmHeader] + newlines[1:]


    


#
# MAIN FUNCTION
#
        
def main():
    type = os.environ.get('XIV_TYPE')
    if type == '':
      type = 'debug' # release, debug

    #----------------------------
    #  Params
    #----------------------------  
    imageViewerHome = os.environ.get('XNATIMAGEVIEWER_HOME')
    apacheHome = os.environ.get('CATALINA_HOME')

    # Release version uses minified javascript/closure version
    if (type == 'release'):
      demoPath =  imageViewerHome + '/Demo-min.html'
    else:
      demoPath =  imageViewerHome + '/Demo.html'
    
    vmTargets = [
        apacheHome + '/webapps/xnat/templates/screens/XImgView.vm', 
        imageViewerHome + '/src/main/templates/screens/XImgView.vm', 
    ] 

    popupTargets = [
        imageViewerHome +   '/src/main/scripts/viewer/xiv/popup.html'
    ]

    #----------------------------
    #  Get the new files as lines
    #----------------------------    
    vmLines = autoHeaders + convertDemoToVM(demoPath)
    popupLines = autoHeaders + convertDemoToPopup(demoPath)



    def makeAndWrite(lines, targets):
        for target in targets:
            makeBackup(target)
            writeTarget(target, lines)            
        


    #----------------------------
    #  Make VM
    #----------------------------
    makeAndWrite(vmLines, vmTargets)
    makeAndWrite(popupLines, popupTargets)

             

           

if __name__ == "__main__":
    main()

