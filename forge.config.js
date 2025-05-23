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
          let newFilename = filename.replace(/\s/, "_");
          if(!(newFilename.includes(result.arch))){
            const dashIndex = newFilename.indexOf("-");
            if (dashIndex !== -1) {
              newFilename = newFilename.substring(0, dashIndex) + "-" + result.arch + newFilename.substring(dashIndex);
            }
          }
          if (!(newFilename.includes(result.platform))) {
            const archIndex = newFilename.indexOf(result.arch);
            if (archIndex !== -1) {
              newFilename = newFilename.substring(0, archIndex) + result.platform + "-" + newFilename.substring(archIndex);
            }
          }
          const newArtifact = path.join(dirname, newFilename);
          fileRenameList.push({
            artifact,
            newArtifact,
            arch: result.arch,
            platform: result.platform
          });
          if (artifact !== newArtifact){
            fs.renameSync(artifact, newArtifact);
          }
        }
      }
      let releaseFileList = [];
      for (const fileRename of fileRenameList) {
        if (path.basename(fileRename.newArtifact) == "RELEASES") {
          let releaseFile = fs.readFileSync(fileRename.newArtifact, 'utf8').replace(/[\r]+/g, '');
          const filFileRenameList = fileRenameList.filter(fR => fR.arch == fileRename.arch && fR.platform == fileRename.platform);
          for (const fR of filFileRenameList){
            if (fR.artifact != fR.newArtifact){
              releaseFile = releaseFile.replace(path.basename(fR.artifact), path.basename(fR.newArtifact));
            }
          }
          releaseFileList.push({
            artifact: fileRename.newArtifact,
            content: releaseFile,
            arch: fileRename.arch,
            platform: fileRename.platform
          });
          fs.writeFileSync(fileRename.newArtifact, releaseFile);
        }
      }
      if (releaseFileList.length > 0){
        const releaseContent = releaseFileList
          .map(file => file.content.replace(/[\r\n]+/g, ''))
          .join("\n");
        const releaseFilePath = path.join(path.dirname(releaseFileList[0].artifact), "..", "RELEASES");
        fs.writeFileSync(releaseFilePath, releaseContent);
      }
      const filteredFileRenameList = fileRenameList.filter(fR => path.basename(fR.newArtifact) != "RELEASES");
      for (const fR of filteredFileRenameList){
        const newLocation = path.join(path.dirname(fR.newArtifact), "..", path.basename(fR.newArtifact));
        fs.renameSync(fR.newArtifact, newLocation);
      }
    }
  }
};

module.exports = baseConfig;