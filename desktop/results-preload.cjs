const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("results", {
  onData: (cb) => ipcRenderer.on("results:data", (_e, data) => cb(data)),
  copy: (text) => ipcRenderer.invoke("results:copy", text),
});
