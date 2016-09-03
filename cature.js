// TODO WarnIn
var PostExit = false;
function PrintStackTrace(msg, trace) {
	if(PostExit)
		return; // nvm.
	try {
		var msgStack = ['ERROR: ' + msg];
		if (trace && trace.length) {
			msgStack.push('TRACE:');
			trace.forEach(function(t) {
				msgStack.push(' -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' (in function ' + t.function + ')' : ''));
			});
		}
		ErrorOut(msgStack.join('\n'));
	} catch(e) {
		Exit(-11);
	}
}
phantom.onError = PrintStackTrace;

var page = require('webpage').create();


/*page.onResourceReceived = function(response) {
	if (response.stage !== "end") return;
		console.log('Response (#' + response.id + ', stage "' + response.stage + '"): ' + response.url);
};
page.onResourceRequested = function(requestData, networkRequest) {
	console.log('Request (#' + requestData.id + '): ' + requestData.url);
};
page.onUrlChanged = function(targetUrl) {
	console.log('New URL: ' + targetUrl);
};
page.onLoadFinished = function(status) {
	console.log('Load Finished: ' + status);
	if(status == 'fail')
		page.render('load-fail.png');
};
page.onLoadStarted = function() {
	console.log('Load Started');
};
page.onNavigationRequested = function(url, type, willNavigate, main) {
	console.log('Trying to navigate to: ' + url);
};*/

var CS = {};
function Start() {
	var fs = require('fs');
	setTimeout(function() {
		page.render("timeout.png");
		console.log(page.evaluate(function() { return document.documentElement.innerHTML; }));
		ErrorOut("Overall timeout!");
	}, 15 * 60 * 1000);
	CS = JSON.parse(fs.read('settings'));
	page.viewportSize = { width: 1920, height: 1500 };
	phantom.cookiesEnabled = true;
	page.settings.userAgent = 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)';
	Log("Starting…");
	Open('https://www.steamgifts.com', OnMainOpen);
}

function OnMainOpen(status) {
	if(IsSteamGiftsLoggedIn())
		OnSteamgiftsLogin();
	else {
		Log("Main opened, logging in…");
		page.render('steamgifts-prelogin.png');
		logins = FMTag('a', 'href', 'login$');
		if(!logins.length)
			ErrorOut("Could not find login element.");
		Open(logins[0], OnLoginOpen);
	}
}

function OnLoginOpen(status) {
	if(IsSteamGifts())
		return OnSteamgiftsLogin();
	Log("Login opened.");
	page.evaluate(function(nm, pw) {
		document.getElementById('steamAccountName').value = nm;
		document.getElementById('steamPassword').value = atob(atob(atob(atob(pw)))); // No, this is not secure or anything. But I'm reluctant to put it in plain text.
		document.getElementById('loginfriendlyname').value = 'phantomjs / steamgifts / cature.js';
	}, CS.SNM, CS.SPW);
	page.render('steam-login.png');
	var fac2ivl = setInterval(function() {
		var needac = page.evaluate(function() { 
			var ac = document.getElementById('authcode'); 
			if(!ac) throw "cature.js needs an update";
			while(ac) {
				if(ac.style && ac.style.display == 'none')
					return false;
				ac = ac.parentNode;
			}
			return true;
		});
		if(needac) {
			WarnIn("Authcode requested, can not continue.");
			var system = require('system');
			system.stdout.write('Enter Steam Authcode: ');
			system.stdout.flush();
			var ac = system.stdin.readLine();
			if(ac.trim() == '') {
				page.render('steam-empty-authcode.png');
				ErrorOut("Empty authcode given, aborting.");
			} else {
				page.evaluate(function(ac) {
					document.getElementById('authcode').value = ac;
					document.getElementById('friendlyname').value = 'phantomjs / steamgifts / cature.js';
					var ev = document.createEvent("MouseEvent");
					ev.initMouseEvent(
						"click",
						true /* bubble */, true /* cancelable */,
						window, null,
						0, 0, 0, 0, /* coordinates */
						false, false, false, false, /* modifier keys */
						0 /*left*/, null
					);
					document.querySelector('#auth_buttonset_entercode .leftbtn').dispatchEvent(ev);
				}, ac);
				Log("Authcode sent, abort manually if this takes too long.");
				setTimeout(function() { page.render('steam-authcode.png'); }, 20000);
			}
			clearInterval(fac2ivl);
		}
	}, 500);
	var olf = page.onLoadFinished;
	page.onLoadFinished = function(status) {
		// bit hard to say when the process finishes… just wait for timeout.
		clearInterval(fac2ivl);
		exec(olf,status);
		if(IsSteamGifts()) {
			page.onLoadFinished = olf;
			OnSteamgiftsLogin();
		} else {
			var wrong = page.evaluate(function() {
				var icc = document.querySelectorAll('.auth_buttonset');
				if (icc.length == 0)
					throw "cature.js needs updating.";
				for(var i = 0; i < icc.length; i++) {
					var e = icc[i];
					if (e.style.display != 'none' && e.id.match(/incorrectcode/))
						return e.outerHTML;
				}
				return false;
			});
			//require('system').stdout.write(page.evaluate(function() { return document.documentElement.innerHTML; }));
			if(wrong) {
				// console.log(wrong);
				ErrorOut("Wrong authcode.");
			} else
				page.evaluate(function() {
					document.getElementById('success_continue_btn').click();
				});
		}
	};
	page.evaluate(function() {
		setTimeout(function() { 
			document.getElementById('imageLogin').click(); 
			console.log("Login button has been mashed.");
		}, 1000);
	});
}

function OnSteamgiftsLogin() {
	Log("Logged in.");
	page.render('steamgifts.png');
	return GrepCycle(2, []);
}

function GrepCycle(nextpage, giveaways) {
	giveaways = EnterableGiveaways(giveaways);
	Log("" + giveaways.length + " giveaways.");
	if(giveaways.length > 150 || nextpage > 10) {
		if(giveaways.length == 0)
			ErrorOut("No enterable giveaways found.");
		giveaways.sort(function(a,b) { return 0.5 - Math.random(); });
		//Log(JSON.stringify(giveaways, undefined, 4));
		var nextact;
		nextact = function() {
			giveaways = giveaways.filter(function(g) { return g.p - (g.w - 1) * 100  <= AvailablePoints(); });
			Log("Having " + AvailablePoints() + "P, " + giveaways.length + " options left.");
			if(!giveaways.length)
				Finished();
			var next = giveaways.pop();
			//if(AvailablePoints() < 100 && !next.w)
			//	Finished();
			Log("Loading " + next.u);
			Open(next.u, OnGiveawayLoaded.bind(undefined, nextact));
		}
		nextact();
	} else {
		Open('https://www.steamgifts.com/giveaways/search?page=' + page, GrepCycle.bind(undefined , nextpage + 1, giveaways));
	}
}

function OnGiveawayLoaded(nextact) {
	var grender = function() { 
		page.render('steamgifts-giveaway-' + GiveawayState() + '-' + page.url.match(RegExp('giveaway/(.*)$'))[1].split('/').join('-') + '.png');
	}
	Log("Giveaway: " + page.title);
	grender();
	if(GiveawayState() != 'open')
		return nextact();
	page.evaluate(function() {
		var b = document.getElementsByClassName("sidebar__entry-insert");
		if(b.length != 1)
			console.log("" + b.length + " entry buttons. (1 expected)");
		if(b.length)
			b[0].click();
	});
	var i = 0;
	var invl = setInterval(function() {
		if(i ++> 400 || GiveawayState() == 'entered') {
			grender();
			clearInterval(invl);
			nextact();
		}
	}, 100);
}

function AvailablePoints() {
	if(!IsSteamGifts()) return 300;
	return page.evaluate(function() { return parseInt(document.getElementsByClassName('nav__points')[0].innerHTML); });
}

function IsSteamGifts() {
	return page.url.match(RegExp('^https?://[^/]*steamgifts'));
}

function IsSteamGiftsLoggedIn() {
	if(!IsSteamGifts())
		return false;	
	var v = FMTag('a', 'href', 'logout$');
	return !!v.length;
}

function EnterableGiveaways(known) {
	var gs = page.evaluate(function() {
		return Array.prototype.map.call(document.getElementsByClassName('giveaway__row-outer-wrap'), function(g) {
			try {
				if(g.getElementsByClassName('giveaway__row-inner-wrap')[0].classList.contains('is-faded'))
					return undefined;
				var l = g.getElementsByClassName('giveaway__heading__name')[0];
				if(!l.href.match(RegExp('^https?://[^/]*/giveaway/')))
					throw Error("Structures unexpected: Giveaway is not a giveaway (is " + l.href + " instead)");
				var glinks = g.getElementsByClassName('giveaway__links');
				if (!glinks || glinks.length < 1)
					throw Error("Entry count deduction, fail 1");
				var entmatch = glinks[0].innerHTML.match(/([0-9,]*) entries/);
				if (!entmatch || entmatch.length != 2)
					throw Error("Entry count deduction, fail 2");
				var ent = parseInt(entmatch[1].split(',').join(''));
				var copies = 1, points = undefined;
				Array.prototype.map.call(g.getElementsByClassName('giveaway__heading__thin'), function(h) {
					var mp = g.innerHTML.match(/\(([0-9]+)(P| points)\)/);
					if(mp)
						points = parseInt(mp[1]);	
					var mc = g.innerHTML.match(/\(([0-9]+) copies\)/);
					if(mc)
						copies = parseInt(mc[1]);
				});
				if(points === undefined)
					throw "Structures unexpected: Giveaway is not a giveaway - no points";
				return { u: l.href, c: copies, p: points, e: ent };
			} catch(e) {
				throw("Error scraping giveaways: " + e.message);
			}
		}).filter(function(a) { return a != undefined; });
	}).concat(known).uniqueOn(function(e) { return e.u; });
	for(var i = 0; i < gs.length; ++i)
		if(gs[i].w == undefined)
			gs[i].w = (CS.Fav.reduce(function(r, c) { return r || gs[i].u.match(c); }, false)) ? 1 : 0;
	return gs;
}

function GiveawayState() {
	return page.evaluate(function() {
		if(document.getElementsByClassName('sidebar__error').length)
			return 'closed';
		var isvis = function(c) {
			return !document.getElementsByClassName(c)[0].classList.contains('is-hidden');
		}
		var e = isvis('sidebar__entry-insert'),
		    d = isvis('sidebar__entry-delete'),
		    l = isvis('sidebar__entry-loading');
		if(e && d || e && l || d && l)
			throw "Structures unexpected: Can not determine giveaway status.";
		if(e) return 'open';
		if(d) return 'entered';
		if(l) return 'loading';
	});
}

function ErrorOut(msg) {
	Log('ERROR: ' + msg);
	page.render('cature-error.png');
	debugger;
	Exit(-1);
}

var HasWarned = false;
function WarnIn(msg) {
	Log('WARNING: ' + msg);
	HasWarned = true;
}

function Finished() {
	Log("Finished.");
	Exit(HasWarned ? 1 : 0);
}

function Exit(code) {
	PostExit = true;
	phantom.exit(code);
}

function Log(msg) {
	var d = new Date();
	msg = msg.replace(/\s+$/, '');
	console.log('['
		+ zeroExtend(d.getHours(), 2) + ':' + zeroExtend(d.getMinutes(), 2) + ':' + zeroExtend(d.getSeconds(), 2)
		+ '] ' + msg);
}


page.onResourceError = function(resourceError) {
	page.reason = resourceError.errorString;
	page.reason_url = resourceError.url;
};

function Open(uri, action) {
	var maxretry = 3;
	var retry = maxretry;
	var tryl;
	tryl = function(w) {
		setTimeout(function() {
			page.open(uri, function(status) {
				retry--;
				if (status !== 'success') {
					if(retry <= maxretry / 2)
						WarnIn('Unable to load url: ' + page.reason_url + ' - ' + page.reason + ' - Retry' + retry + '/' + maxretry);
					if(retry > 0)
						tryl(5678);
					else
						ErrorOut("Giving up.");
				} else {
					try {
						action(status);
					} catch(err) {
						PrintStackTrace(err.message);
					}
				}
			});
		}, w);
	}
	tryl(1500);
}

function FMTag(tag, p, m) {
	var r = page.evaluate(function(tag, p, m) {
		return Array.prototype.map.call(document.getElementsByTagName(tag)
			,function(e) { return p.split(".").reduce(function(d, a) { return d[a]; }, e) })
			.filter(function(s) { return s.match(RegExp(m)); });
	}, tag, p, m);
	return r;
}

Array.prototype.uniqueOn = function(f) {
	var u = {}, a = [];
	for(var i = 0; i < this.length; ++i) {
		var e = this[i];
		var p = f(e);
		if(u.p)
			continue;
		a.push(e);
		u[e] = true;
	}
	return a;
}

function exec(f,a,b,c,d) {
	if(typeof(f) == 'function')
		return f(a,b,c,d);
	if(typeof(f) == 'string')
		return eval(f);
}

function zeroExtend(n, l) {
	// I feel like js is stoopid…
	return (Array(l).join('0') + n).slice(-l);
	// not taking care of floats of negatives…
}

page.onConsoleMessage = function(msg) {
	Log(msg);
};

Start();
