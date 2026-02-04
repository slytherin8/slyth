# Document Picker Setup Instructions

## Step 1: Install the Package
```bash
cd slyth-app
npx expo install expo-document-picker
```

## Step 2: Update GroupChatScreen.js

### Add Import (line 18)
```javascript
import * as DocumentPicker from 'expo-document-picker';
```

### Replace the pickDocument function with this code:
```javascript
const pickDocument = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const file = result.assets[0];
      
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        Alert.alert("File Too Large", "Please select a file smaller than 10MB");
        return;
      }
      
      sendMessage(`📎 ${file.name}`, "file", {
        name: file.name,
        size: file.size,
        uri: file.uri,
        mimeType: file.mimeType
      });
    }
  } catch (error) {
    Alert.alert("Error", "Failed to pick document");
  }
  setShowAttachmentOptions(false);
};
```

## Step 3: Update Message Rendering

Add this to the renderMessage function to display file messages:

```javascript
{item.messageType === "file" && item.fileData ? (
  <TouchableOpacity style={styles.fileMessage}>
    <Text style={styles.fileIcon}>📎</Text>
    <View style={styles.fileInfo}>
      <Text style={styles.fileName}>{item.fileData.name}</Text>
      <Text style={styles.fileSize}>
        {(item.fileData.size / 1024).toFixed(1)} KB
      </Text>
    </View>
  </TouchableOpacity>
) : null}
```

## Step 4: Add File Message Styles

Add these styles to the StyleSheet:

```javascript
fileMessage: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#F3F4F6",
  padding: 10,
  borderRadius: 8,
  marginBottom: 8
},
fileIcon: {
  fontSize: 20,
  marginRight: 10
},
fileInfo: {
  flex: 1
},
fileName: {
  fontSize: 14,
  fontWeight: "600",
  color: "#374151"
},
fileSize: {
  fontSize: 12,
  color: "#6B7280"
}
```

## Step 5: Restart Your App

After making these changes, restart your Expo development server:

```bash
npm start
```

Now document sharing will be fully functional!