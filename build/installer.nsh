; GOAT'ECH NSIS Custom Uninstaller Script
; Hooks into the uninstall process to ask the user
; whether to keep or delete local app data.

!macro customUnInstall
  ; Ask the user before deleting local storage data
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Do you want to delete all local app data?$\n$\n\
This includes saved records, officer settings, and cached data stored on this computer.$\n$\n\
• Click YES to permanently remove all data (clean uninstall)$\n\
• Click NO to keep your data (you can reinstall later and your data will still be there)" \
    IDNO keep_data IDYES delete_data

  delete_data:
    ; Delete Electron's app data folder where localStorage is stored
    RMDir /r "$APPDATA\case"
    RMDir /r "$LOCALAPPDATA\case"
    Goto done_data

  keep_data:
    DetailPrint "Local app data has been preserved."

  done_data:
!macroend
