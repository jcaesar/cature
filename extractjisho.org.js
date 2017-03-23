
var page = require('webpage').create();
var sys = require('system');

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

var voclinks = [];
function main() {
	while(!sys.stdin.atEnd()) {
		var ac = sys.stdin.readLine();
		voclinks.push(ac);
	}
	next();
}

function next() {
	if (voclinks.length > 0) {
		var n = voclinks[voclinks.length-1];
		page.open(n, function(status) {
			setTimeout(function() {
				if (status == 'success') {
					voclinks.pop();
					extractvocab();
					next();
				} else
					next();
			}, 5*1000);
		});
	} else
		phantom.exit(0);
}


function extractvocab() {
	var o = page.evaluate(function() {
		var assert = function(v, msg) {
			if (!v) {
				throw 'ERROR: couldn\'t obtain ' + msg + '\n' + 
					page.evaluate(function() { return document.documentElement.innerHTML; });
			}
		}
		try {
			var e;
			if (document.location.href.match(/jisho.org\/word/))
				e = [document];
			else {
				e = document.getElementById('primary');
				assert(e, "primary vocab container");
				e = document.getElementsByClassName('exact_block');
				assert(e && e.length > 0, "exact block");
			}
			e = e[0].getElementsByClassName('concept_light');
			assert(e && e.length > 0, "concept block (whatever that is)");
			var tc = e[0].getElementsByClassName('columns');
			assert(tc && tc.length == 2, "two columns " + tc.length);
			var jc = tc[0].getElementsByClassName('japanese');
			assert(jc && jc.length > 0, "Japanese container");
			jc = jc[0];
			e = jc.getElementsByClassName('text');
			assert(e && e.length == 1, "Japanese text container")
			var jkan = e[0].innerText.trim();
			e = jc.getElementsByClassName('furigana');
			assert(e && e.length == 1, "Furigana container");
			e = e[0].getElementsByTagName('span');
			assert(e.length == jkan.length, "Array of furigana, one for every char");
			var furi = '';
			for (var i = 0; i < e.length; i ++) {
				var t = e[i].innerText.trim();
				furi += (t == ''? jkan[i] : t);
			}
			e = tc[1].getElementsByClassName('meaning-meaning');
			assert(e && e.length > 0, "meaning / english");
			var eng = e[0].innerText; 
			return {'success':jkan + "\t" + furi + "　／　" + eng + "\n"};
		} catch(e) {
			return {'fail':e};
		}
	});
	if (o.success)
		sys.stdout.write(o.success);
	else
		sys.stderr.write(o.fail);
	
}


main();

