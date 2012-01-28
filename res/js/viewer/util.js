$.fn.rotate = function(rot) {
 return this.css('-webkit-transform', 'rotate(' + rot + 'deg)')
            .css('-moz-transform', 'rotate(' + rot + 'deg')
            .css('-o-transform', 'rotate(' + rot + 'deg')
            .css('-ms-transform', 'rotate(' + rot + 'deg')
            .css('transform', 'rotate(' + rot + 'deg');
};

$.fn.offsetFrom = function(el) {
 var offset = this.offset();
 var otherOffset = $(el).offset();
 return {top: offset.top - otherOffset.top, left: offset.left - otherOffset.left};
}

$.fn.offsetCentre = function() {
 var offset = this.offset();
 return {top: offset.top + this.height() / 2, left: offset.left + this.width() / 2};
}

function getURLParameter(name) {
 return decodeURIComponent((location.search.match(RegExp("[?|&]"+name+'=(.+?)(&|$)'))||[,null])[1]);
}
