require('dotenv').config({ path: '~/.env' });
let baseConfig  = {
  packagerConfig: {
      icon: "./src/icons/icon.icns",
      appId: "com.bensresearch.assessmentdisaggregation",
      appBundleId: "com.bensresearch.assessmentdisaggregation",
      osxSign: {
        identity: process.env.APPLE_CERT,
        hardenedRuntime: true,
        entitlements: "entitlements.plist",
        "entitlements-inherit": "entitlements.plist",
        "gatekeeper-assess": false
      },
      osxNotarize: {
        appleId: process.env.APPLEID,
        appleIdPassword: process.env.APPLEID_PASSWORD
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
  ],
  publishers:[{
    name: '@electron-forge/publisher-github',
    config: {
      repository: {
        owner: 'tazzben',
        name: 'Assessment-Disaggregation'
      },
      authToken: process.env.GITHUB_TOKEN
    }
  }]
};

module.exports = baseConfig;