const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getState: () => ipcRenderer.invoke("state:get"),
  send: (text, submit) => ipcRenderer.invoke("prompt:send", { text, submit }),
  toggle: (id) => ipcRenderer.invoke("site:toggle", id),
  setMode: (mode) => ipcRenderer.invoke("layout:set", mode),
  newChat: (id) => ipcRenderer.invoke("site:newchat", id ?? null),
  reload: (id) => ipcRenderer.invoke("site:reload", id),
  collect: () => ipcRenderer.invoke("answers:collect"),
  external: (id) => ipcRenderer.invoke("site:external", id),
});
