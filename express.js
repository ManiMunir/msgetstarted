#!/usr/local/bin/node --harmony

////////////////////////////////////////
//
// Node Secure Server (SSL)
//   localhost:8080/src/msgetstarted.html
//
////////////////////////////////////////

var readlineSync = require('readline-sync');
var http = require('http');
var opn = require('opn');
var fetch = require('node-fetch');
var colors = require('colors');
var cheerio = require('cheerio');
var replace = require("replace");

var whiteLabel = {
    logoLink: '',
    logoFileName: '',
    logoToolTip: '',
    eri: '',
    resellerId: '',
    mediaCloud: ''
}

var init = ()=> {
    console.log('would you like to setup branding?[Y/n]'.green);
    if (readlineSync.question('') == 'n') {
        initServer();
    } else {
        authUser();
    }
}

var authUser = () => {
    console.log('enter your enterprise login name?'.green);
    var user = readlineSync.question('');
    if (user == '') {
        console.log('not a valid enterprise user name or email'.red);
        process.exit();
    }
    console.log('enter your enterprise password?'.green);
    var pass = readlineSync.question('');
    if (pass == '') {
        console.log('not a valid enterprise password'.red);
        process.exit();
    }

    console.log('will this be hosted on the default mediaCloud?[Y/n]'.green);
    if (readlineSync.question('') == 'n') {
        whiteLabel.mediaCloud = false;
    } else {
        whiteLabel.mediaCloud = true;
    }

    user = 'reseller@ms.com'
    pass = '123123';

    fetch(`https://galaxy.signage.me/WebService/ResellerService.ashx?command=GetEri&resellerUserName=${user}&resellerPassword=${pass}`)
        .then(function (res) {

            return res.json();

        }, function () {
            console.log('\nthere was a problem contacting the remote server\n'.red);
            process.exit();

        }).then(function (json) {

        if (json && json.eri) {
            whiteLabel.eri = json.eri;
            whiteLabel.resellerId = json.resellerId;
            console.log('enterprise user authenticated'.green)
            console.log('installing credentials'.magenta)
            console.log('start server'.magenta)
            loadResellerInfo(json.resellerId)
        } else {
            console.log('\nthere was a problem contacting the remote server\n'.red);
            process.exit();
        }
    }, function () {
        console.log('\nUser name or password did not match for the given enterprise user...\n'.red);
        process.exit();
    });
}

var loadResellerInfo = (i_resellerId) => {
    fetch(`https://galaxy.signage.me/WebService/ResellerService.ashx?command=LoadResellerInfo&resellerId=${i_resellerId}`)
        .then(function (res) {
            return res;
        }, function () {
            console.log('\nthere was a problem contacting the remote server\n'.red);
            process.exit();
        }).then(function (res) {
        res.text().then(function (xml) {
            $ = cheerio.load(xml);
            $('Logo').each(function (i, o) {
                whiteLabel.logoToolTip = o.attribs.tooltip;
                whiteLabel.logoLink = o.attribs.link;
                whiteLabel.logoFileName = o.attribs.filename;
                whiteLabel.logoFullLink = 'http://galaxy.signage.me/Resources/Resellers/' + whiteLabel.resellerId + '/' + o.attribs.filename;
            });
            $('Command').each(function (i, o) {
                if (o.attribs.label == '' && o.attribs.id == 'help2') {
                    whiteLabel['videos'] = o.attribs.href;
                } else {
                    whiteLabel[o.attribs.label] = o.attribs.href;
                }
            });
            injectBranding();
        }, function () {
        });
    }, function () {
        console.log('\nUser name or password did not match for the given enterprise user...\n'.red);
        process.exit();
    });
}

var injectBranding = ()=> {
    console.log(whiteLabel);
    replace({
        regex: "\/\/ START_REDIRECT[^]+\/\/ END_REDIRECT",
        replacement: `\/\/ START_REDIRECT\n\t\t\t\t BB.CONSTS.REDIRECT = '${whiteLabel['Visit site']}' \n\t\t\t\t\/\/ END_REDIRECT`,
        paths: ['App.js'],
        recursive: false,
        silent: false
    });

    replace({
        regex: "\/\/ START_RESELLER[^]+\/\/ END_RESELLER",
        replacement: `\/\/ START_RESELLER\n\t\t\t\t BB.CONSTS.RESELLER = '${whiteLabel['resellerId']}' \n\t\t\t\t\/\/ END_RESELLER`,
        paths: ['App.js'],
        recursive: false,
        silent: false
    });

    replace({
        regex: "\/\/ START_ERI[^]+\/\/ END_ERI",
        replacement: `\/\/ START_ERI\n\t\t\t\t BB.globs\['ERI'\] = '${whiteLabel['eri']}' \n\t\t\t\t\/\/ END_ERI`,
        paths: ['App.js'],
        recursive: false,
        silent: false
    });

    replace({
        regex: "\/\/ START_CLOUD[^]+\/\/ END_CLOUD",
        replacement: `\/\/ START_CLOUD\n\t\t\t\t BB.globs\['CLOUD'\] = ${whiteLabel['mediaCloud']} \n\t\t\t\t\/\/ END_CLOUD`,
        paths: ['App.js'],
        recursive: false,
        silent: false
    });

    initServer();
}

var initServer = ()=> {
    var globs = {};
    globs.IPLISTEN = '127.0.0.1';
    globs.PORT_LISTEN_DIST = 8080;
    var express = require('express');
    var app = express();
    var express = require('express');
    var app = express();
    app.use('/msgetstarted', express.static(__dirname));
    app.listen(globs.PORT_LISTEN_DIST, function () {
        console.log('Now opening your browser to http://localhost:8080/msgetstarted/msgetstarted.html'.yellow);
    });
    opn('http://localhost:8080/msgetstarted/msgetstarted.html');
}

init();

