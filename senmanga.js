var url = require('system').args.slice(-1)[0];
Log("Running on " + url);

var page = require('webpage').create();
var fs = require("fs");

var maxglobaltimeouts = 5;
var globaltimeout;
var timeoutcount;
function updateTimeout() {
	clearTimeout(globaltimeout);
	timeoutcount = 0;
	globaltimeout = setTimeout(function() {
		timeoutcount++;
		page.render('phantom-timeout-' + timeoutcount + '.png');
		Log("Global timeout triggered: " + timeoutcount + '/' + maxglobaltimeouts);
		if (timeoutcount >= maxglobaltimeouts) {
			console.log(page.evaluate(function() { return document.documentElement.innerHTML; }));
			phantom.exit(-1);
		} else {
			PageHit('timeout');
		}
	}, 60*1000);
}
updateTimeout();

var debug = false;
page.onResourceReceived = function(response) {
  updateTimeout();
  if (response.stage !== "end") return;
  if (debug) Log('Response (#' + response.id + ', stage "' + response.stage + '"): ' + response.url);
};
page.onResourceRequested = function(requestData, networkRequest) {
  updateTimeout();
  if (debug) Log('Request (#' + requestData.id + '): ' + requestData.url);
};
page.onUrlChanged = function(targetUrl) {
  updateTimeout();
  if (debug) Log('New URL: ' + targetUrl);
};
page.onLoadFinished = function(status) {
  updateTimeout();
  if (debug) Log('Load Finished: ' + status);
  if(status == 'fail')
      page.render('load-fail.png');
};
page.onLoadStarted = function() {
  updateTimeout();
  if (debug) Log('Load Started');
};
page.onNavigationRequested = function(url, type, willNavigate, main) {
  updateTimeout();
  if (debug) Log('Trying to navigate to: ' + url);
};

page.onConsoleMessage = function(msg) {
   updateTimeout();
   Log(msg); 
};

function Log(msg) {
	var zeroExtend = function (n, l) { return (Array(l).join('0') + n).slice(-l); }
	var d = new Date();
	msg = msg.replace(/\s+$/, '');
	console.log('['
			+ zeroExtend(d.getHours(), 2) + ':' + zeroExtend(d.getMinutes(), 2) + ':' + zeroExtend(d.getSeconds(), 2)
			+ '] ' + msg);
}

var retry;
var rtto;
var PageHit = function(status) {};
function Open(uri, action) {
    retry = 15;
	clearTimeout(rtto);
    var tryl;
    tryl = function(w) {
        rtto = setTimeout(function() {
			PageHit = function(status) {
                retry--;
                if (status !== 'success') {
                    Log('Unable to load url: ' + status + ' - ' + page.reason_url + ' - ' + page.reason + ' Retrys left: ' + retry);
                    if(retry > 0)
                        tryl(w*2);
                    else {
                        Log("Giving up.");
						phantom.exit(-2);
					}
                }
            }
            page.open(uri, PageHit);
        }, w);
    }
    tryl(1500);
}

var oldtitle;
function StuffDone() {
	if(oldtitle == page.title)
		return setTimeout(StuffDone, 1000);
	var img = page.evaluate(function() {
		var img = document.getElementById('picture');
		if (!img || !img.alt.match(/Sen Manga.*raw/)) return null;
		if (img.src.match(/error.png$/)) {
			console.log("Error ocurred, received error.png instead of image");
			return null;
		}
		if (!(img.complete && img.naturalWidth != 00)) return null;
		var canvas = document.createElement("canvas");
		canvas.width = img.width;
		canvas.height = img.height;
		var ctx = canvas.getContext("2d");
		ctx.drawImage(img, 0, 0);      
		return canvas.toDataURL("image/png").split(",")[1];
	});
	if(!img || img.length < 100) {
		return setTimeout(StuffDone, 500);
	}
	var sanitize = function(str) {
		return str.split('').filter(function(m){return ('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- '.indexOf(m)!=-1);}).join('').trim();
	}
	var tit = page.title.split('|');
	var name = sanitize(tit[2]);
	var chp = sanitize(tit[3].replace('Chapter', ''));
	var pg = sanitize(tit[4].replace('Page', ''));
	var fn = name + "/" + chp + "/" + pg;
	Log("Got " + fn);
	fs.write(fn + ".png",atob(img),'wb');
	getlink = function(title) {
		var next;
		var spans = document.querySelectorAll('span');
		for(var i = 0; i < spans.length; ++i) {
			var span = spans[i];
			if (!span || !span.firstChild || !span.firstChild.data)
				continue;
			if(span.firstChild.data.trim() == title) {
				var par = span;
				while(par) {
					if(par.href) {
						return par.href;
					}
					par = par.parentNode;
				}
			}
		}
		return null;
	};
	var next = page.evaluate(getlink, "Next Page");
	if (!next)
		next = page.evaluate(getlink, "Next Chapter");
	if(!next)
		phantom.exit(0);
	else
		Open(next, StuffDone);
	oldtitle = page.title;
	return setTimeout(StuffDone, 2000);
}

function DoStuff() {
	Open(url, StuffDone);
	StuffDone();
}

page.viewportSize = { width: 1920, height: 1500 };
phantom.cookiesEnabled = true;
page.settings.userAgent = 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)';
DoStuff();
