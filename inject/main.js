document.onreadystatechange = function(e) {
    if (document.readyState === 'interactive') {
        run();
    }
}

/*function run() {
    const config = require('../package.json');
    const dd = (this.location.href == "http://"+config.serverURL+"/" || this.location.href == "http://"+config.serverURL+"/index.php" || this.location.href == "http://"+config.serverURL+"/index.php?action=register" || this.location.href == "http://"+config.serverURL+"/index.php?action=lostPassword");

    switch (true) {
        case dd:
            require("./login");
            break;
        default:
            break;
    }
}*/

function run(){
    require("./login");
}
