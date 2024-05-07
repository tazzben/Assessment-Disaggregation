const { sign } = require('crypto');
const os = require('os');
const path = require('path');

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
        iconUrl: './src/icons/icon.ico',
        setupIcon: './src/icons/icon.ico',
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
  ]
};

module.exports = baseConfig;