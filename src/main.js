const {app, BrowserWindow, ipcMain, Menu, dialog, shell} = require('electron');

require('update-electron-app')();
if (require('electron-squirrel-startup')) return app.quit();

const path = require('path');
const database = require('./dbo.js');
const csv = require('./readcsv.js');
const output = require('./output.js');





let data = new database();
let mainWindow;

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 900,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
//  mainWindow.webContents.openDevTools();
}


app.whenReady().then(() => {
  createWindow()
  
  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

const loadPretest = () => {
  const pretestFile = dialog.showOpenDialogSync(mainWindow, {
    properties: ['openFile'], filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  if(pretestFile){
    csv.processExamFile(data, pretestFile.toString(), 1, sendUpdate);
  }
};

const loadPosttest = () => {
  const posttestFile = dialog.showOpenDialogSync(mainWindow, {
    properties: ['openFile'], filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  if(posttestFile){
    csv.processExamFile(data, posttestFile.toString(), 2, sendUpdate);
  }
};

const loadAssessmentMap = () => {
  const assessmentMap = dialog.showOpenDialogSync(mainWindow, {
    properties: ['openFile'], filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  if(assessmentMap){
    csv.readAssessmentFile(data, assessmentMap.toString(), sendUpdate);
  }
};

const loadStudents = () => {
  const studentList = dialog.showOpenDialogSync(mainWindow, {
    properties: ['openFile'], filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  if(studentList){
    csv.readStudentIds(data,studentList.toString(), sendUpdate);
  }
};

const sendUpdate = (outcome) => {
  if (outcome === false){
    dialog.showMessageBox(null, {
      message: 'I don\'t know what to make of that file!',
      detail: 'The file you selected does not conform to a format I know.  Make sure you selected the correct file.  For more information about supported file formats, check the help menu.'
    });
  }
  sendMessage({
    examOne: data.getExamScore(1),
    examTwo: data.getExamScore(2),
    students: data.getNumberOfMatchedStudents()
  });
};

const produceMatchedQ = () => {
  const matchedAnalysisQ = dialog.showSaveDialogSync(mainWindow, {
    properties: ['openFile'], filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  if (matchedAnalysisQ){
    output.questionAnalysis(data, matchedAnalysisQ);
  }
  
};

const matchedStudent = (group) =>{
  const matchedAnalysisS = dialog.showSaveDialogSync(mainWindow, {
    properties: ['openFile'], filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  if(matchedAnalysisS){
    output.studentAnalysis(data, matchedAnalysisS, group);
  }
};

const unmatchedExam = () => {
  const unmatchedExamstring = dialog.showSaveDialogSync(mainWindow, {
    properties: ['openFile'], filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  if (unmatchedExamstring){
    output.unMatchedExamResults(data, unmatchedExamstring);
  }
};

const unmatchedStudent = () => {
  const unmatchedStudnettring = dialog.showSaveDialogSync(mainWindow, {
    properties: ['openFile'], filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  if (unmatchedStudnettring){
    output.unMatchedStudentResults(data, unmatchedStudnettring);
  }
  
};


const isMac = process.platform === 'darwin';
const template = [
  // { role: 'appMenu' }
  ...(isMac ? [{
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  }] : []),
  // { role: 'fileMenu' }
  {
    label: 'File',
    submenu: [
      isMac ? { role: 'close' } : { role: 'quit' }
    ]
  },
  {
    label: 'Load',
    submenu: [
     {
        label: 'Select Pretest',
        accelerator: 'CmdOrCtrl+P',
        click: () => {
          loadPretest();
        }
     },
     {
      label: 'Select Posttest',
      accelerator: 'CmdOrCtrl+F',
      click: () => {
        loadPosttest();
      }
     },
      {
        label: 'Select Assessment Map',
        accelerator: 'CmdOrCtrl+A',
        click: () => {
          loadAssessmentMap();
      }
      },
      {
        label: 'Select Student List',
        accelerator: 'CmdOrCtrl+L',
        click: () => {
          loadStudents();
        }
      }
    ]
  },
  {
    label: 'Analyze',
    submenu: [
      {
        label: 'Matched Question Analysis',
        accelerator: 'CmdOrCtrl+S',
        click: () => {
          produceMatchedQ();
        }
      },
      {
        label: 'Matched Student Analysis',
        accelerator: 'CmdOrCtrl+Shift+S',
        click: () => {
          matchedStudent(true);
        }
      },
      {
        label: 'Matched Student Analysis (by Options)',
        accelerator: 'CmdOrCtrl+Shift+O',
        click: () => {
          matchedStudent(false);
        }
      },
      {
        label: 'Unmatched Exam Results',
        accelerator: 'CmdOrCtrl+R',
        click: () => {
          unmatchedExam();
        }
      },
      {
        label: 'Unmatched Student Results',
        accelerator: 'CmdOrCtrl+Shift+R',
        click: () => {
          unmatchedStudent();
        }
      }
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Online Docs',
        click: async () => {
          await shell.openExternal('https://docs.assessmentdisaggregation.org');
        }
      },
      {
        label: 'Download Example Files',
        click: async () => {
          await shell.openExternal('http://downloads.bensresearch.com/ww_data.zip');
        }
      },
      {
        label: 'E-Mail for Help',
        click: async () => {
          await shell.openExternal('mailto:bosmith@unomaha.edu?subject=Assessment%20Disaggregation');
        }
      },
    ]
  }
];
const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)

ipcMain.on("toMain", (event, args) => {
  if (args == 'pretest'){
    loadPretest();
  }
  if (args == 'posttest'){
    loadPosttest();
  }
  if (args == 'map'){
    loadAssessmentMap();
  }
  if (args == 'students'){
    loadStudents();
  }
  if (args == 'matchedOutputQ'){
    produceMatchedQ();
  }
  if (args == 'matchedOutputStudents'){
    matchedStudent(true);
  }
  if (args == 'matchedOutputStudentsbyGroup'){
    matchedStudent(false);
  }
  if (args == 'unmatchedExam'){
    unmatchedExam();
  }
  if (args == 'unmatchedStudents'){
    unmatchedStudent();
  }
  if (args == 'update'){
    sendUpdate(true);
  }
});

const sendMessage = (messageObj) => {
  mainWindow.webContents.send("fromMain", messageObj);
};
