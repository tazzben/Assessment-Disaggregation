const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  dialog,
  shell,
  TouchBar
} = require('electron');

const {
  TouchBarButton,
  TouchBarSpacer
} = TouchBar;

if (require('electron-squirrel-startup')) app.quit();

require('update-electron-app')({
  notifyUser: false
});

let settings = require('electron-settings');

const path = require('path');
const database = require('./dbo.js');
const csv = require('./readcsv.js');
const output = require('./output.js');

let splashScreen;

let data = new database();
let mainWindow;

let fileState = {};

const createSplash = () => {
  if (!splashScreen || splashScreen.isDestroyed()) {
    splashScreen = new BrowserWindow({
      show: false,
      width: 960,
      height: 408,
      frame: false,
      resizable: false,
      alwaysOnTop: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        worldSafeExecuteJavaScript: true,
        nativeWindowOpen: true
      }
    });
    splashScreen.loadFile(path.join(__dirname, 'splash.html'));
    splashScreen.once('ready-to-show', () => {
      splashScreen.show();
    });
  }
};

const createStartSplash = async () => {
  let splashRun = await settings.get('run.hasRun');
  if (splashRun !== true) {
    createSplash();
  }
  await settings.set('run', {
    hasRun: true
  });
  if (splashScreen) {
    splashScreen.webContents.once('dom-ready', () => {
      if (!splashScreen.isDestroyed()) {
        splashScreen.webContents.send("fromMain", "startTimer");
      }
    });
  }
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    show: false,
    width: 1000,
    height: 900,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      worldSafeExecuteJavaScript: true,
      nativeWindowOpen: true
    }
  });

  const buttonPretest = new TouchBarButton({
    label: 'Pretest',
    click: () => {
      loadPretest();
    }
  });

  const buttonPosttest = new TouchBarButton({
    label: 'Posttest',
    click: () => {
      loadPosttest();
    }
  });

  const buttonAssessment = new TouchBarButton({
    label: 'Assessment Map',
    click: () => {
      loadAssessmentMap();
    }
  });

  const buttonAnalysis = new TouchBarButton({
    label: 'Matched Analysis',
    backgroundColor: '#307df6',
    click: () => {
      produceMatchedQ();
    }
  });

  const touchBar = new TouchBar({
    items: [
      buttonPretest,
      buttonPosttest,
      buttonAssessment,
      new TouchBarSpacer({
        size: 'flexible'
      }),
      buttonAnalysis,
    ],
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.setTouchBar(touchBar);

  mainWindow.once('ready-to-show', () => { 
    mainWindow.show();
  });

  mainWindow.webContents.once('dom-ready', () => {
    sendMessage({
      appVersion: app.getVersion()
    });
    sendUpdate(true, {
      ...fileState,
      ...{
        "startup": true
      }
    });
  });
};

const loadPretest = () => {
  const pretestFile = dialog.showOpenDialogSync(mainWindow, {
    properties: ['openFile'],
    filters: [{
      name: 'CSV',
      extensions: ['csv']
    }]
  });
  if (pretestFile && pretestFile.toString().length > 0) {
    csv.processExamFile(data, pretestFile.toString(), 1, sendUpdate);
  }
};

const loadPosttest = () => {
  const posttestFile = dialog.showOpenDialogSync(mainWindow, {
    properties: ['openFile'],
    filters: [{
      name: 'CSV',
      extensions: ['csv']
    }]
  });
  if (posttestFile && posttestFile.toString().length > 0) {
    csv.processExamFile(data, posttestFile.toString(), 2, sendUpdate);
  }
};

const loadAssessmentMap = () => {
  const assessmentMap = dialog.showOpenDialogSync(mainWindow, {
    properties: ['openFile'],
    filters: [{
      name: 'CSV',
      extensions: ['csv']
    }]
  });
  if (assessmentMap && assessmentMap.toString().length > 0) {
    csv.readAssessmentFile(data, assessmentMap.toString(), sendUpdate);
  }
};

const loadStudents = () => {
  const studentList = dialog.showOpenDialogSync(mainWindow, {
    properties: ['openFile'],
    filters: [{
      name: 'CSV',
      extensions: ['csv']
    }]
  });
  if (studentList && studentList.toString().length > 0) {
    csv.readStudentIds(data, studentList.toString(), sendUpdate);
  }
};

const deleteAssessmentMap = () => {
  data.deleteAssessment();
  data.buildAssessment();
  sendUpdate(true, {
    assessmentFile: ' '
  });
};

const deleteStudentList = () => {
  data.deleteStudents();
  data.buildStudents();
  sendUpdate(true, {
    studentFile: ' '
  });
};

const updateFiles = (args) => {
  if (args.examFileOne) {
    fileState.examFileOne = args.examFileOne;
  }
  if (args.examFileTwo) {
    fileState.examFileTwo = args.examFileTwo;
  }
  if (args.assessmentFile) {
    fileState.assessmentFile = args.assessmentFile;
  }
  if (args.studentFile) {
    fileState.studentFile = args.studentFile;
  }
};


const sendUpdate = (outcome, args = {}) => {
  if (outcome === false) {
    dialog.showMessageBox(null, {
      message: 'I don\'t know what to make of that file!',
      detail: 'The file you selected does not conform to a format I know.  Make sure you selected the correct file.  For more information about supported file formats, check the help menu.'
    });
  }
  let obj = {
    examOne: data.getExamScore(1),
    examTwo: data.getExamScore(2),
    students: data.getNumberOfMatchedStudents(),
    questions: data.getNumberOfMatchedQuestions(),
    questionOptions: data.getQuestionsOptions()
  };
  sendMessage({
    ...obj,
    ...args
  });
  updateFiles(args);
};

const produceMatchedQ = async () => {
  const summaryOption = await settings.get('summaryOption') || false;
  const matchedAnalysisQ = dialog.showSaveDialogSync(mainWindow, {
    properties: ['openFile'],
    filters: [{
      name: 'CSV',
      extensions: ['csv']
    }]
  });
  if (matchedAnalysisQ && matchedAnalysisQ.toString().length > 0) {
    output.questionAnalysis(data, matchedAnalysisQ, summaryOption);
  }
};

const matchedStudent = async (group) => {
  const summaryOption = await settings.get('summaryOption') || false;
  const matchedAnalysisS = dialog.showSaveDialogSync(mainWindow, {
    properties: ['openFile'],
    filters: [{
      name: 'CSV',
      extensions: ['csv']
    }]
  });
  if (matchedAnalysisS && matchedAnalysisS.toString().length > 0) {
    output.studentAnalysis(data, matchedAnalysisS, group, summaryOption);
  }
};

const unmatchedExam = async () => {
  const summaryOption = await settings.get('summaryOption') || false;
  const unmatchedExamstring = dialog.showSaveDialogSync(mainWindow, {
    properties: ['openFile'],
    filters: [{
      name: 'CSV',
      extensions: ['csv']
    }]
  });
  if (unmatchedExamstring && unmatchedExamstring.toString().length > 0) {
    output.unMatchedExamResults(data, unmatchedExamstring, summaryOption);
  }
};

const unmatchedStudent = async () => {
  const summaryOption = await settings.get('summaryOption') || false;
  const unmatchedStudentFile = dialog.showSaveDialogSync(mainWindow, {
    properties: ['openFile'],
    filters: [{
      name: 'CSV',
      extensions: ['csv']
    }]
  });
  if (unmatchedStudentFile && unmatchedStudentFile.toString().length > 0) {
    output.unMatchedStudentResults(data, unmatchedStudentFile, summaryOption);
  }

};

const changeQuestionOptionDefault = async (options) => {
  await settings.set('options', options);
  data.setQuestionOptions(options);
  data.buildAssessment();
  sendUpdate(true);
};

const createMenu = async () => {
  let numOptions = await settings.get('options');
  let summaryOption = await settings.get('summaryOption') || false;
  numOptions = (Number.isInteger(numOptions)) ? numOptions : 4;
  data.setQuestionOptions(numOptions);
  const isMac = process.platform === 'darwin';
  const template = [
    // { role: 'appMenu' }
    ...(isMac ? [{
      label: app.name,
      submenu: [{
          role: 'about'
        },
        {
          type: 'separator'
        },
        {
          role: 'services'
        },
        {
          type: 'separator'
        },
        {
          role: 'hide'
        },
        {
          role: 'hideothers'
        },
        {
          role: 'unhide'
        },
        {
          type: 'separator'
        },
        {
          role: 'quit'
        }
      ]
    }] : []),
    // { role: 'fileMenu' }
    {
      label: '&File',
      submenu: [
        isMac ? {
          role: 'close'
        } : {
          role: 'quit'
        }
      ]
    },
    {
      label: '&Load',
      submenu: [{
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
      label: 'Unload',
      submenu: [{
          label: 'Unload Assessment Map',
          click: () => {
            deleteAssessmentMap();
          }
        },
        {
          label: 'Unload Student List',
          click: () => {
            deleteStudentList();
          }
        }
      ]
    },
    {
      label: '&Analyze',
      submenu: [{
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
      label: '&Options',
      submenu: [{
          label: 'Default Number of Question Options: Two',
          type: 'radio',
          accelerator: 'CmdOrCtrl+2',
          checked: (numOptions == 2) ? true : false,
          click: () => {
            changeQuestionOptionDefault(2);
          }
        },
        {
          label: 'Default Number of Question Options: Three',
          type: 'radio',
          accelerator: 'CmdOrCtrl+3',
          checked: (numOptions == 3) ? true : false,
          click: () => {
            changeQuestionOptionDefault(3);
          }
        },
        {
          label: 'Default Number of Question Options: Four',
          type: 'radio',
          accelerator: 'CmdOrCtrl+4',
          checked: (numOptions == 4) ? true : false,
          click: () => {
            changeQuestionOptionDefault(4);
          }
        },
        {
          label: 'Default Number of Question Options: Five',
          type: 'radio',
          accelerator: 'CmdOrCtrl+5',
          checked: (numOptions == 5) ? true : false,
          click: () => {
            changeQuestionOptionDefault(5);
          }
        },
        {
          label: 'Default Number of Question Options: Six',
          type: 'radio',
          accelerator: 'CmdOrCtrl+6',
          checked: (numOptions == 6) ? true : false,
          click: () => {
            changeQuestionOptionDefault(6);
          }
        },
        {
          label: 'Include Summary Rows',
          type: 'checkbox',
          checked: (summaryOption) ? true : false,
          click: async () => {
            summaryOption = (summaryOption) ? false : true;
            await settings.set('summaryOption', summaryOption);            
          }
        }
      ]
    },
    {
      role: 'help',
      submenu: [{
          label: 'Online Docs',
          click: async () => {
            await shell.openExternal('https://docs.assessmentdisaggregation.org');
          }
        },
        {
          label: 'Quick Start YouTube Series',
          click: async () => {
            await shell.openExternal('https://youtube.com/playlist?list=PL9jjyQ5QNxiy4EhUpB4nc5quLfyg8c0ko');
          }
        },
        {
          label: 'Download Example Files',
          click: async () => {
            await shell.openExternal('https://www.assessmentdisaggregation.org/downloads/ww_data.zip');
          }
        },
        {
          label: 'E-Mail for Help',
          click: async () => {
            await shell.openExternal('mailto:bosmith@unomaha.edu?subject=Assessment%20Disaggregation');
          }
        },
        {
          label: 'Schedule a Zoom Appointment',
          click: async () => {
            await shell.openExternal('https://assessmentdisaggregation.org/#zoom')
          }
        },
        {
          label: 'Splash Startup',
          click: () => {
            createSplash();
          }
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

const sendMessage = (messageObj) => {
  if (!mainWindow.isDestroyed()) {
    mainWindow.webContents.send("fromMain", messageObj);
  }
};

app.whenReady().then(() => {
  createMenu();
  createWindow();
  createStartSplash();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})


ipcMain.on("toMain", (event, args) => {
  if (args == 'pretest') {
    loadPretest();
  }
  if (args == 'posttest') {
    loadPosttest();
  }
  if (args == 'map') {
    loadAssessmentMap();
  }
  if (args == 'students') {
    loadStudents();
  }
  if (args == 'matchedOutputQ') {
    produceMatchedQ();
  }
  if (args == 'matchedOutputStudents') {
    matchedStudent(true);
  }
  if (args == 'matchedOutputStudentsbyGroup') {
    matchedStudent(false);
  }
  if (args == 'unmatchedExam') {
    unmatchedExam();
  }
  if (args == 'unmatchedStudents') {
    unmatchedStudent();
  }
  if (args == 'update') {
    sendUpdate(true);
  }
  if (args == 'closeSplash') {
    if (splashScreen || !splashScreen.isDestroyed()) {
      splashScreen.destroy();
    }
  }
});
