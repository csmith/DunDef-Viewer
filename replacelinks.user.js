// ==UserScript==
// @name ddlayout.co.uk link replacer
// @namespace http://www.ddlayout.co.uk/
// @include *
// ==/UserScript==

var oldPrefix = 'http://html5.cubicleninja.com/cubicleninja/html5/dd/index.htm?layout=';
var newPrefix = 'http://www.ddlayout.co.uk/#';

var links = document.evaluate("//a[contains(@href, '" + oldPrefix + "')]", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);

for (var i = 0; i < links.snapshotLength; i++) {
 var link = links.snapshotItem(i);
 link.href = link.href.replace(oldPrefix, newPrefix);
}


