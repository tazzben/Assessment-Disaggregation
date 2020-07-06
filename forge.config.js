const keychain = require('keytar');

async function getAppleId (){
  let credentials = await keychain.findCredentials("electronBuildAppleID");
  let cert = await keychain.findCredentials("electronBuildCert");
  let notarize = {};
  let useCert = "";
  for (let row of credentials){
    notarize = {
     appleId: row.account,
     appleIdPassword: row.password
    };
  }
  for (let row of cert){
    useCert = row.password;
  }
 return {notarize: notarize, useCert: useCert}; 
}

let baseConfig  = {
  packagerConfig: {
      icon: "./src/icons/icon.icns",
      appId: "com.bensresearch.assessmentdisaggregation",
      appBundleId: "com.bensresearch.assessmentdisaggregation",
      osxSign: {
        hardenedRuntime: true,
        entitlements: "entitlements.plist",
        "entitlements-inherit": "entitlements.plist",
        "gatekeeper-assess": false
      }
  },
  makers: [
      {
          name: "@electron-forge/maker-squirrel",
          config: {
            name: "assessment_disaggregation"
          }
        },
        {
          name: "@electron-forge/maker-zip",
          platforms: [
            "darwin"
          ]
        },
        {
          name: "@electron-forge/maker-dmg",
          config: {
            name: "Assessment Disaggregation",
            icon: "./src/icons/icon.icns"
          },
          platforms: [
            "darwin"
          ]
        },
        {
          name: "@electron-forge/maker-deb",
          config: {}
        },
        {
          name: "@electron-forge/maker-rpm",
          config: {}
        }
  ]
};

if(process.platform == 'darwin'){
  let creds = getAppleId();
  creds.then((value) => {
    const {notarize, useCert} = value;
    baseConfig.packagerConfig.osxNotarize = notarize;
    baseConfig.packagerConfig.osxSign.identity = useCert;
  });
}


module.exports =  baseConfig;