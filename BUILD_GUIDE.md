# QTalk APK Build Guide

## Method 1: EAS Build (Recommended - Cloud Build)

### Prerequisites
- Expo account (free)
- Node.js installed
- Internet connection

### Steps
1. **Install EAS CLI**
   ```bash
   npm install -g @expo/cli eas-cli
   ```

2. **Login to Expo**
   ```bash
   eas login
   ```

3. **Configure EAS Build**
   ```bash
   eas build:configure
   ```

4. **Build APK**
   ```bash
   eas build --platform android --profile apk
   ```

5. **Download APK**
   - Go to https://expo.dev/accounts/malithdamsara/projects/QTalk
   - Click on the completed build
   - Download the APK file

### Build Profiles in eas.json
```json
{
  "build": {
    "apk": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

## Method 2: Local Build with Expo Dev Client

### Prerequisites
- Android Studio with SDK tools
- Java 17 or higher
- Android device or emulator

### Steps
1. **Install Expo Dev Build**
   ```bash
   npx expo install expo-dev-client
   ```

2. **Create Development Build**
   ```bash
   npx expo run:android
   ```

3. **Build APK Locally**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

4. **Find APK**
   The APK will be located at:
   `android/app/build/outputs/apk/release/app-release.apk`

## Method 3: Expo Classic Build (Deprecated but still works)

### Steps
1. **Install Expo CLI**
   ```bash
   npm install -g @expo/cli
   ```

2. **Build APK**
   ```bash
   expo build:android -t apk
   ```

3. **Download**
   Follow the URL provided after build completion

## Troubleshooting

### Common Issues
1. **Firebase Config**: Ensure `firebaseConfig.js` has valid credentials
2. **Permissions**: Check that all Android permissions are correctly configured
3. **Assets**: Verify all images and icons exist in the correct paths
4. **Dependencies**: Run `npm install` before building

### Build Optimization
- Use `production` build profile for release
- Enable proguard for smaller APK size
- Optimize images and assets
- Remove unused dependencies

## Testing the APK
1. Enable "Unknown Sources" on Android device
2. Install the APK
3. Test all features:
   - QR code scanning
   - Chat functionality
   - Offline capabilities
   - Firebase sync

## App Store Deployment
After testing, use:
```bash
eas build --platform android --profile production
eas submit --platform android
```

## Build Configuration Files

### app.json
```json
{
  "expo": {
    "name": "QTalk",
    "slug": "QTalk",
    "version": "1.0.0",
    "android": {
      "package": "com.malith.qtalk",
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO"
      ]
    }
  }
}
```

### eas.json
```json
{
  "build": {
    "apk": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```
