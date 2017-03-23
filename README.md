Caesar's phantomjs collection
=============================


cature.js -- phantomjs steamgifts.com bot
-----------------------------------------

Script for http://steamgifts.com - enters giveaways on the front page, a list of search strings, or your steam wishlist.
I hacked the whole thing together in two days, so it is not exactly a beauty. It has been extended to be able to walk through two factor authorization, but that may not work flawlessly, e.g. you might have to restart after entering the code...

The script wants a file named settings in the directory it is run in. Following JSON format:

{
	"SNM": "steam username",
	"SPW": "steam password, wrapped by quatruple application of btoa (i.e., btoa(btoa(btoa(btoa('pw-string')))))",
	"Fav": [
		"list of game names",
		"these will be searched for, and entered when found, depending on the run mode.",
		"e.g.",
		"civilization"
	],
	"RegexEntry": [
		"list of regexes",
		"applied to game urls",
		"those games are entered when seen",
		"e.g.",
		"grand.*theft.*auto",
	],
	"SearchStrings": [
		"list of game names",
		"used when searching",
		"e.g."
		"grand theft"
	],
	"BL": [
		"black list regexes"
	]
	"PointLimit": 65 # lower limit of points up to which random games are entered in front page mode
}

The script can take either of 'frontpagemode' (default), 'wishlistmode', or 'searchmode' as command line parameter and will adjust its behavior.

I run it through cron, e.g.

37 9-23/2 * * *	cd $HOME/cature; phantomjs wishlistmode --cookies-file=$HOME/cature/steamgift_cookies.txt cature.js
11 9-23/5 * * *	cd $HOME/cature; phantomjs searchmode --cookies-file=$HOME/cature/steamgift_cookies.txt cature.js

The cookies-file is not strictly-speaking necessary, but it will save going through the steam auth every time.


senmanga.js -- senmanga raw manga downloader
--------------------------------------------

Downloads image files from http://raw.senmanga.com/. 
Navigate to the first page of whatever you want to download, go into single page reading mode, and throw it to senmanga.js as a command line argument.
Example: http://raw.senmanga.com/Log-Horizon/09/1

Useful hint for sxiv users: for f in */*/*; do echo "$f; done | sort -V | sxiv -i


extractjisho.org.js -- jisho.org vocabulary
-------------------------------------------

Takes a list of links to jisho.org as input on stdin, extracts the first word and outputs something that Anki can make into flashcards.
