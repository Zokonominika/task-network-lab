const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  // 1. Pencere Ayarları
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Task Network System",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true, // Üstteki "Dosya, Düzenle" menüsünü gizle
    icon: path.join(__dirname, 'public/favicon.ico') // Varsa ikonunu kullanır
  });

  // 2. Hangi Adresi Gösterecek?
  // Geliştirme modundaysak localhost'u, değilse build dosyasını aç
  const startUrl = 'http://localhost:5173'; 
  
  mainWindow.loadURL(startUrl);

  // Pencere kapatılınca belleği temizle
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Electron hazır olduğunda pencereyi aç
app.on('ready', createWindow);

// Tüm pencereler kapanınca uygulamadan çık (Mac hariç)
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});