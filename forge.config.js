const os = require('os');
const path = require('path');
const fs = require('fs');

require('dotenv').config({
  path: path.join(os.homedir(), ".env")
});
let baseConfig = {
  packagerConfig: {
    icon: "./src/icons/icon.icns",
    appBundleId: "com.bensresearch.assessmentdisaggregation",
    appCategoryType: "public.app-category.education",
    osxSign: {
      identity: process.env.APPLE_CERT,
      hardenedRuntime: true,
      entitlements: "entitlements.plist",
      "entitlements-inherit": "entitlements.plist",
      "gatekeeper-assess": false
    },
    osxNotarize: {
      appleId: process.env.APPLEID,
      appleIdPassword: process.env.APPLEID_PASSWORD,
      teamId: process.env.APPLE_TEAMID
    }
  },
  makers: [{
      name: "@electron-forge/maker-squirrel",
      config: {
        signWithParams: '/a /tr http://timestamp.sectigo.com /td sha256 /fd sha256'
      },
      platforms: [
        "win32"
      ]
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: [
        "darwin"
      ]
    },
  ],
  hooks: {
    postMake: async (config, makeResults) => {
      let fileRenameList = [];
      for (const result of makeResults) {
        for (const artifact of result.artifacts) {
          const dirname = path.dirname(artifact);
          const filename = path.basename(artifact);
          const newFilename = filename.replace(" ", "_");
          if (!(filename.includes(result.platform))) {
            const archIndex = newFilename.indexOf(result.arch);
            if (archIndex !== -1) {
              newFilename = newFilename.substring(0, archIndex) + result.platform + "-" + newFilename.substring(archIndex + result.arch.length);
            }
          }
          const newArtifact = path.join(dirname, newFilename);
          fileRenameList.push({
            artifact,
            newArtifact
          });
          fs.renameSync(artifact, newArtifact);
        }
      }
      for (const fileRename of fileRenameList) {
        if (path.basename(fileRename.newArtifact) == "RELEASES") {
          let releaseFile = fs.readFileSync(fileRename.newArtifact, 'utf8');
          for (const fR of fileRenameList){
            if (fR.artifact != fR.newArtifact){
              releaseFile = releaseFile.replace(path.basename(fR.artifact), path.basename(fR.newArtifact));
            }
          }
          fs.writeFileSync(fileRename.newArtifact, releaseFile);
        }
      }
    }
  }
};

module.exports = baseConfig;