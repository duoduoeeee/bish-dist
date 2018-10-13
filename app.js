'use strict';
const interactiveui = require('./com/prompts');
const shellui = require('./com/vorpal')();
const chalk = require('./com/chalk');
const filesystem = require('fs');
const requesttool = require('./com/request');
const openurl = require('./com/openurl');
const rsamodule = require('./com/node-rsa');
requesttool.debug=true;

//Colors
const color_header = chalk.bold.yellowBright;
const color_owner = chalk.blueBright;
const color_archiveownermid = chalk.white;
const color_danmaku = chalk.rgb(242, 93, 142);
const color_fav = chalk.yellowBright;
const color_coin = chalk.rgb(45, 183, 245);
const color_share = chalk.greenBright;
const color_debugmessage = chalk.keyword('orange');
const color_errormessage = chalk.white.bgRedBright;

//modulename: systemwide
//function(s): bare bone of the entire application
var systemwide = (function(){
  var bilibili = {};
  //add methods or variables. will be added through loose augmentation.
  //static strings
  bilibili.debugoutput = true;
  bilibili.language = "en";
  bilibili.programversion = "v1.0.0";
  bilibili.welcometext = "Welcome to Bilibili. " + bilibili.programversion;
  bilibili.legalnotice = "请自觉遵守互联网相关的政策法规，严禁发布色情、暴力、反动的言论。";
  bilibili.logginginprompt = "Just a sec...";
  bilibili.illegalmode = "Illegal mode. Try the mod command.";
  bilibili.loginsuccessfulprompt = "Cheers, Bilibili. - ( ゜- ゜)つロ";
  //variables
  bilibili.mid = "0";
  bilibili.username = "nobody";
  bilibili.upusername = "";
  bilibili.mod = "idle";
  bilibili.resid = ""; //资源识别号
  bilibili.objectstring = ""; //表示直播房间号或视频av号的字串
  bilibili.additionalstring = ""; //up主名字、搜索类别、风纪委员会案件号

  //network variables
  bilibili.qs = {};
  bilibili.reqoptions = {};

  bilibili.refreshCommandPrompt = function(){
    switch (bilibili.mod) {
      case "account":
      case "idle":
      case "dynamic":
        var str = bilibili.username + "(" + bilibili.mid + ")@bilibili:" + bilibili.mod;
        // duoduoeeee(17376116)@bilibili:account #
        break;
      case "video":
      case "liveroom":
        var str = bilibili.username + "(" + bilibili.mid + ")@bilibili:" + bilibili.objectstring;
        // duoduoeeee(17376116)@bilibili:av20204904 #
        break;
      case "upuser":
      case "search":
      case "committee":
      case "bangumi":
        var str = bilibili.username + "(" + bilibili.mid + ")@bilibili:" + bilibili.mod + "(" + bilibili.additionalstring + ")";
        // duoduoeeee(17376116)@bilibili:upuser(泠鸢yousa) #
        break;
      default:
    }
    if (bilibili.mid != "0") {
      str += "\ #";
    } else {
      str += "\ $";
    }
    return str;
  };
  return bilibili;
}());

//modulename: sensitiveloginstate
//function: to store login states.
//// WARNING: clear these variables upon completion of usage
var sensitiveloginstate = (function(){
  var ret = {};
  ret.publickey = "";
  ret.hash = "";
  ret.encryptstring = "";
  ret.plainpassword = "";
  ret.username = "";
  ret.encryptedstring = "";
  ret.cookiestring = "";
  ret.bilijct = "";
  return ret;
}());

// function to encrypt login password
// thanks to: https://stackoverflow.com/questions/8750780
// i have never used the crypto module before = =
function encryptWithPublicKey() {
  return new Promise(function(resolve, reject) {
    systemwide.qs = {
      'act': 'getkey'
    };
    systemwide.reqoptions = {
      'url': 'https://passport.bilibili.com/login',
      'qs': systemwide.qs,
      'method': 'GET'
    };
      requesttool(systemwide.reqoptions, function(error, response, body){
      if (error) {
        shellui.log(color_errormessage('[error] ' + error));
        reject("Problem connecting to the internet.");
      } else if (response.statusCode == 200) {
        var publickeyobj = JSON.parse(body);
        sensitiveloginstate.publickey = publickeyobj.key;
        sensitiveloginstate.hash = publickeyobj.hash;
        //make encryptedstring string
        sensitiveloginstate.encryptstring = sensitiveloginstate.hash + sensitiveloginstate.plainpassword;
        var key = new rsamodule(sensitiveloginstate.publickey, 'public');
        sensitiveloginstate.encryptedstring = key.encrypt(sensitiveloginstate.encryptstring, 'base64', 'utf8');
        shellui.log(color_debugmessage("[debug] encryptedstring: " + sensitiveloginstate.encryptedstring));
        resolve(true);
      } else {
        shellui.log(color_debugmessage("[warn] " + response.statusCode + ": " + response.statusMessage));
        reject("Service not working properly.");
      };
    });
  });
};

//function to store login cookies
function getAndStoreLoginCookies() {
  return new Promise(function(resolve, reject) {
    //obtain access key
    shellui.log(color_debugmessage("[debug] encryptedstring: " + sensitiveloginstate.encryptedstring));
    systemwide.qs = {
      'userid': sensitiveloginstate.username,
      'pwd': sensitiveloginstate.encryptedstring
    };
    systemwide.reqoptions = {
      'url': 'https://account.bilibili.com/api/login/v2',
      'method': 'GET',
      'qs': systemwide.qs
    };
    requesttool(systemwide.reqoptions, function(error, response, body){
      if (error) {
        shellui.log(color_errormessage('[error] ' + error));
        reject("Problem connecting to the internet.");
      } else if (response.statusCode == 200){
        var accesskeyobj = JSON.parse(body);
        if (accesskeyobj.code != 0) {
          shellui.log(color_errormessage("[error] " + accesskeyobj.code));
          reject("Incorrect password.");
        } else {
          systemwide.mid = accesskeyobj.mid.toString();
          var accesskey = accesskeyobj.access_key;
          //obtain cookie string
          systemwide.qs = {
            'access_key': accesskey
          };
          systemwide.reqoptions = {
            'url': 'https://api.kaaass.net/biliapi/user/sso',
            'method': 'GET',
            'qs': systemwide.qs
          };
          requesttool(systemwide.reqoptions, function(error, response, body){
            if (error) {
              shellui.log(color_errormessage('[error] ' + error));
              reject("Problem connecting to the internet.");
            } else if (response.statusCode == 200) {
              var cookiestrobj = JSON.parse(body);
              if (cookiestrobj.status === 'OK') {
                sensitiveloginstate.cookiestring = cookiestrobj.cookie;
                //save cookie string to local file
                sensitiveloginstate.cookiestring.pipe(filesystem.createWriteStream(systemwide.mid + ".state"));
                resolve(true);
              } else {
                shellui.log(color_errormessage('[error] ' + cookiestrobj.status + cookiestrobj.msg));
                reject("Incorrect password.");
              }
            }
          });
        }
      } else {
        reject("Service not running properly.");
      }
    });
  });
};

//function to read and mount login cookies
function mountAndValidateLoginCookies() {
  return new Promise(function(resolve, reject) {
    var f = systemwide.mid + ".state";
    filesystem.access(f, filesystem.constants.F_OK, (err) => {
      if (!err) {
        sensitiveloginstate.cookiestring = filesystem.createReadStream(systemwide.mid + '.state').toString();
        //validate whether cookies are valid
        systemwide.reqoptions = {
          "url": 'https://account.bilibili.com/identify/index',
          "method": 'GET',
          "headers": {
            'DNT': 1,
            'Cookie': sensitiveloginstate.cookiestring
          }
        };
        requesttool(systemwide.reqoptions, function(error, response, body){
          if (error) {
            shellui.log(color_errormessage("[error] " + error));
          } else if (response.statusCode == 200) {
            var identifyobj = JSON.parse(body);
            if (identifyobj.code == 0) { //验证成功
              //determine bilijct value, which will be used later
              sensitiveloginstate.bilijct = sensitiveloginstate.cookiestring.match(/bili_jct=(.+);/);
              shellui.log(color_debugmessage('[debug] bili_jct = ' + sensitiveloginstate.bilijct));
              shellui.log(chalk.greenBright(systemwide.loginsuccessfulprompt));
              resolve(true);
            } else {
              shellui.log(color_debugmessage("[warn] Login failed or expired"));
              reject("Session failed.");
            }
          }
        });
      } else {
        reject("File system error.");
      }
    });
  });
};

//async function that bundles the above three functions, and to provide error handling
async function loginBundle() {
  try {
    let a = await encryptWithPublicKey();
    let b = await getAndStoreLoginCookies();
    let c = await mountAndValidateLoginCookies();
  } catch (err) {
    shellui.log(color_errormessage('[error] ' + err));
  }
}
//Commands.

shellui.command('mod <mode>') //state: completed
  .option('')
  .description('Switch between preset modes.')
  .autocomplete(['account', 'dynamic', 'idle'])
  .action(function(args,callback){
    shellui.hide();
    switch (args.mode) {
      case "account":
        systemwide.mod = "account";
        break;
      case "idle":
        systemwide.mod = "idle";
        break;
      case "dynamic":
        systemwide.mod = "dynamic";
        break;
      default:
        this.log(color_errormessage("[error] " + systemwide.illegalmode));
    }
    shellui.delimiter(systemwide.refreshCommandPrompt());
    shellui.show();
    callback();
  });

shellui.command('av <aid>') //state: completed
  .option('')
  .description('Assign an AV number and enter the video mode.')
  .action(function(args,callback){
    shellui.hide();
    systemwide.mod = "video";
    systemwide.objectstring = "av" + args.aid;
    systemwide.resid = args.aid;
    shellui.delimiter(systemwide.refreshCommandPrompt());
    shellui.show();
    callback();
  });

shellui.command('open [uid]') //state: completed
  .option('')
  .description('Opens specific resource in browser.')
  .alias('o')
  .action(function(args, callback){
    shellui.hide();
    switch (systemwide.mod) {
      case "video":
        if (args.uid) {
        var str = "https://www.bilibili.com/video/av" + args.uid;
      } else {
        var str = "https://www.bilibili.com/video/av" + systemwide.resid;
      }
      openurl.open(str);
        break;
      case "account":
        if (args.uid) {
          var str = "https://space.bilibili.com/" + args.uid;
        } else if(systemwide.mid !="0"){
          var str = "https://space.bilibili.com/" + systemwide.mid;
        } else {
          var str = "https://space.bilibili.com/";
        }
        openurl.open(str);
        break;
      case "dynamic":
        if (args.uid && args.uid != "") {
        var str = "https://t.bilibili.com/" + args.uid;
      } else {
        var str = "https://t.bilibili.com/" + systemwide.resid;
      }
      openurl.open(str);
        break;
      case "upuser":
        if (args.uid && args.uid != "") {
        var str = "https://space.bilibili.com/" + args.uid;
      } else {
        var str = "https://space.bilibili.com/" + systemwide.resid;
      }
      openurl.open(str);
        break;
      case "liveroom":
        if (args.uid && args.uid != "") {
        var str = "https://live.bilibili.com/" + args.uid;
      } else {
        var str = "https://live.bilibili.com/" + systemwide.resid;
      }
      openurl.open(str);
        break;
      default:
        this.log(color_errormessage('[error] ' + systemwide.illegalmode));
    }
    shellui.delimiter(systemwide.refreshCommandPrompt());
    shellui.show();
    callback();
  })

shellui.command('info [uid]')
  .description('Shows information of the selected resource.')
  .action(function(args, callback){
    shellui.hide();
    switch (systemwide.mod) {
      case "video":
        if (args.uid) {
          systemwide.qs = {'ids': args.uid.toString(),
                          'jsonp': 'jsonp'};
          } else {
          systemwide.qs = {'ids': systemwide.resid.toString(),
                          'jsonp': 'jsonp'};
          };
          systemwide.reqoptions = {
            'method': 'GET',
            'qs': systemwide.qs,
            'url': "https://api.bilibili.com/x/article/archives",
        };
        requesttool(systemwide.reqoptions, function(error, response, body){
          if (error) {
            shellui.log(color_errormessage('[error] ' + error));
          } else if (response.statusCode == 200) {
            var requestdecodeable = JSON.parse(body);
            if (requestdecodeable.code == 0) {
            //variables to output
            var archivetitle = requestdecodeable.data[systemwide.qs.ids].title;
            var archivecount = requestdecodeable.data[systemwide.qs.ids].videos;
            var archivedesc = requestdecodeable.data[systemwide.qs.ids].desc;
            var archiveowner = requestdecodeable.data[systemwide.qs.ids].owner.name;
            var archiveownermid = requestdecodeable.data[systemwide.qs.ids].owner.mid;
            var archivestat_view = requestdecodeable.data[systemwide.qs.ids].stat.view;
            var archivestat_danmaku = requestdecodeable.data[systemwide.qs.ids].stat.danmaku;
            var archivestat_comments = requestdecodeable.data[systemwide.qs.ids].stat.reply;
            var archivestat_favorites = requestdecodeable.data[systemwide.qs.ids].stat.favorite;
            var archivestat_coins = requestdecodeable.data[systemwide.qs.ids].stat.coin;
            var archivestat_shares = requestdecodeable.data[systemwide.qs.ids].stat.share;
            var archivestat_recms = requestdecodeable.data[systemwide.qs.ids].stat.like;

            shellui.log(color_header(archivetitle) + "\n"
            + "Author: " + color_owner(archiveowner) + color_archiveownermid("(" + archiveownermid + ")") + "\n"
            + color_danmaku("dmk: (" + archivestat_danmaku + ")") + "|"
            + color_fav("fav: (" + archivestat_favorites + ")") + "|"
            + color_coin("coin: (" + archivestat_coins + ")") + "|"
            + color_share("shr: (" + archivestat_shares + ")") + "|"
            + "cmt: (" + archivestat_comments + ")" + "|"
            + "recm: (" + archivestat_recms + ")" + "\n"
            + archivedesc);
          } else {
            shellui.log(color_debugmessage("[warn] " + requestdecodeable.message));
            }
          } else {
            shellui.log(color_debugmessage("[warn] " + response.statusCode + ": " + response.statusMessage));
          }
        }
      );
        break;
      case "account":
        break;
      case "dynamic":
        if (args.uid && args.uid != "") {
          systemwide.qs = {
            'dynamic_id': args.uid
          };
      } else {
        systemwide.qs = {
          'dynamic_id': systemwide.resid
        };
        systemwide.reqoptions = {
          'method': 'GET',
          'qs': systemwide.qs,
          'url': "https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/get_dynamic_detail",
        };
        requesttool(systemwide.reqoptions, function(error, response, body){
          if (error) {
            shellui.log(color_errormessage('[error] ' + error));
          } else if (response.statusCode == 200) {
            var dynamicobj = JSON.parse(body);
            if (dynamicobj.code == 0) {
              //variables to output
              var dynamic_id = dynamicobj.data.card.desc.dynamic_id;
              var dynamic_author = dynamicobj.data.card.desc.user_profile.info.uname;
              var dynamic_author_mid = dynamicobj.data.card.desc.user_profile.info.uid;
              var dynamic_contentobj = JSON.parse(dynamicobj.data.card.card);
              // TODO: parse dynamic content here!!
              var dynamic_timecreated = dynamicobj.data.card.desc.timestamp;
              // TODO: parse time here using original js!!
              // TODO: complete remaining business logic
            } else {
              shellui.log(color_debugmessage("[warn] " + dynamicobj.code + ": " + dynamicobj.msg));
            }
          } else {
            shellui.log(color_debugmessage('[warn] ' + response.statusCode + ": " + response.statusMessage));
          }
        });
      }
        break;
      case "upuser":
        if (args.uid && args.uid != "") {
        // TODO: make detail request with this id (an upuser mid)
        systemwide.qs = {
          'mid': args.uid,
          'photo': 'true'
        };
    } else {
      systemwide.qs = {
        'mid': systemwide.resid
      };
    }
    systemwide.reqoptions = {
      'method': 'GET',
      'qs': systemwide.qs,
      'url': "https://api.bilibili.com/x/web-interface/card", // TODO: probably deprecated interface! change this one later
    };
        break;
      case "liveroom":
        if (args.uid && args.uid != "") {
        // TODO: make detail request with this id (a liveroom roomid)
      } else {
        // TODO: make detail request with systemwide.resid
      }
        break;
      default:
        this.log(color_errormessage("[error] " + systemwide.illegalmode));
    }
    shellui.delimiter(systemwide.refreshCommandPrompt());
    shellui.show();
    callback();
  });

shellui.command('login')
  .description('Log in to your account.')
  .action(function(args, callback) {
      this.log(chalk.green.bold("Please proceed with your account credentials."));
    (async () => {
      let logincredentials = [
        {
          type: 'text',
          name: 'username',
          message: 'Your email or phone number',
        },
        {
          type: 'password',
          name: 'password',
          message: 'Your Bilibili password',
        }
      ];
      let onCancel = interactiveui => {
        shellui.log(color_debugmessage('No cheers. You called it off.'));
      }
      var accountobj = await interactiveui(logincredentials, {onCancel});
      //this.log(accountobj.username);
      shellui.log(chalk.greenBright('[info] ' + systemwide.logginginprompt));
      shellui.hide();
      if (accountobj.username && accountobj.password && accountobj.username !="" && accountobj.password !="") {
      //make accesskey request.
      sensitiveloginstate.plainpassword = accountobj.password;
      sensitiveloginstate.username = accountobj.username;
      loginBundle();
    } else {
      shellui.log(color_errormessage("[error] Illegal input."));
    }
      shellui.delimiter(systemwide.refreshCommandPrompt());
      shellui.show();
      callback();
    })();
});

shellui.command('catch [mid]')
  .description('Specify an upuser and enter the upuser mode.')
  .action(function(args, callback) {
    (async () => {
      shellui.hide();
      if (!args.mid) {
      this.log("No user mid specified. Would you like to search for an upuser?");
        let searchfield = [
          {
            type: 'text',
            name: 'searchterm',
            message: 'Search'
          }
        ];
        let onCancel = interactiveui => {
          shellui.log(color_debugmessage("No input."));
        };
        let upsearchobj = await interactiveui(searchfield,{onCancel});
        if (upsearchobj.searchterm && upsearchobj.searchterm != "") {
        //search for the upuser
          systemwide.qs = {
            'search_type': 'user',
            'keyword': upsearchobj.searchterm,
            'from_source': 'banner_search'
          };
          systemwide.reqoptions = {
            'method': 'GET',
            'qs': systemwide.qs,
            'url': 'https://search.bilibili.com/api/search'
          };
          requesttool(systemwide.reqoptions, function(error, response, body){
            if (error) {
              shellui.log(color_errormessage("[error] " + error));
            } else if (response.statusCode == 200) {
              // TODO: complete search logic
              //search has to return the mid and the name of the upuser.
            } else {
            shellui.log(color_debugmessage("[warn] " + response.statusCode + ": " + response.statusMessage));
            }
          });
        } else {
          shellui.log(color_debugmessage("No input."));
        }
      } else {
      // setup upuser mode
      // TODO: complete logic here. request the net and determine whom the mid refers to, and then set systemwide variables.
    }
      systemwide.refreshCommandPrompt();
      shellui.show();
      callback();
    })();
  });

//start the console.
console.log(chalk.keyword('pink')(systemwide.welcometext));
shellui.delimiter(systemwide.refreshCommandPrompt())
  .show();
