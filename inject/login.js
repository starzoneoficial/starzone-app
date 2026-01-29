const { ipcRenderer } = require("electron");
const tools = require("./tools");

document.getElementById("autoLogin").style.display = "block";

document.getElementById("autoLoginSubmit").addEventListener("click", () => {
	ipcRenderer.send("autoLogin", true);
});

ipcRenderer.on("login", function(event, data) {
    location.href = '/api/loginWithClient&username='+data[0]+'&password=' + data[1];
});