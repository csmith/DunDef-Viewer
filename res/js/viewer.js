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
$(function() {

 // Instructions
 (function() {
  var cookieName = 'hideinstructions';

  function showInstructions() {
   $.cookie(cookieName, null);
   $('#instructions').show();
   $('#showinstructions').hide();
  }

  function hideInstructions() {
   $.cookie(cookieName, 1, { expires: 365 });
   $('#instructions').hide();
   $('#showinstructions').show();
  }

  $('#hideinstructions').click(hideInstructions);
  $('#showinstructions').click(showInstructions);

  if ($.cookie(cookieName)) {
   hideInstructions();
  }
 })();

 // Saving
 (function() {
  function saveLayout() {
   _gaq.push(['_trackEvent', 'General', 'Save']);

   layout.notes = $('#notecontent').val();

   $('#save_inprogress').show();
   $('#save_done').hide();
   $('#savecontainer').show();
   $('#save_error').hide();

   $.ajax({
    type: 'POST',
    url: 'res/data/layouts/new',
    data: {layout: JSON.stringify(layout)},
    success: function(res) {
     window.location.hash = res;
     var url = window.location.href;
     $('#link').children().remove();
     $('<a>').attr('href', url).text(url).appendTo($('#link'));
     $('#save_inprogress').hide();
     $('#save_done').show();
    },
    error: function(xhr, status, error) {
     $('#save_error').text('Save failed! Server said: ' + error).show();
    }
   });
  }

  function closeSave() {
   $('#savecontainer').hide();
  }

  $('#savelayout').click(saveLayout);
  $('#savemask').click(closeSave);
  $('#saveclose').click(closeSave);
 })();

 // Layout picker
 (function() {
  $.each(levels, function(key) {
   var name = this.name;

   $('<button>')
    .append($('<img>').attr('src', this.image))
    .append($('<p>').text(name))
    .click(function() {
     window.location.hash = '';
     _gaq.push(['_trackEvent', 'Level picker', 'Picked', name]);
     showBlankLayout(key + 1);
     closePicker();
    })
    .appendTo($('#layoutpicker .container'));
  });

  function showPicker() {
   _gaq.push(['_trackEvent', 'Level picker', 'Shown']);
   $('#layoutcontainer').show();
  }

  function closePicker() {
   $('#layoutcontainer').hide();
  }

  $('#createlayout').click(showPicker);
  $('#layoutmask').click(closePicker);
  $('#layoutclose').click(closePicker);
 })();

 // Address management
 (function() {
  function updateFromHash() {
   var id = window.location.hash;
   if (id === '') {
    showBlankLayout(1);
   } else if (id.substr(0,7) == '#blank:') {
    showBlankLayout(parseInt(id.substr(7)));
   } else {
    getLayout(id.substr(1));
   }
  }

  $(window).bind('hashchange', updateFromHash);
  updateFromHash();
 })();

 // Palette
 (function() {
  $.each(towers, function(key) {
   createBaseElForTower(key, this).appendTo($('#palette'));
  });

  $('.tower,.core').draggable({
   helper: 'clone',
   containment: 'document',
   stop: function(evt, ui) {
    if (!$(this).data('type')) {
     return;
    }

    var tower = {
     type: $(this).data('type'),
     rotation: 0,
     position: adjustMapOffset(ui.helper.offsetFrom('#mapcontainer'), thisLevel, 1)
    };

    layout.towers.push(tower);
    createElForTower(tower).appendTo($('#mapcontainer'));
    updateDefenseUnits();
   }
  });
 })();

 // Searching
 (function() {
  $('#search_classes img').click(function() {
   var el = $(this);
   if (el.hasClass('disabled')) {
    el.removeClass('disabled');
   } else {
    el.addClass('disabled');
   }
  });

  var sel = $('select[name=search_map]');
  $.each(levels, function(key) {
   $('<option>').val(key + 1).text(this.name).appendTo(sel);
  });

  function showSearch() {
   $('#searchcontainer').show();
  }

  function hideSearch() {
   $('#searchcontainer').hide();
  }

  function clearSearchResults() {
   $('#searchresults tbody tr').remove();
  }

  function buildSearchQuery() {
   var query = {};

   var level = $('select[name=search_map]').val();
   if (level != 'any') {
    query.map = level;
   }

   var difficulty = $('select[name=search_difficulty]').val();
   if (difficulty != 'any') {
    query.difficulty = difficulty;
   }

   var type = $('select[name=search_type]').val();
   if (type != 'any') {
    query.type = type;
   }

   query.classes = '';
   $.each($('#search_classes img'), function() {
    if (!$(this).hasClass('disabled')) {
     if (query.classes.length > 0) { query.classes += ','; }
     query.classes += this.id.replace('search_', '');
    }
   });

   query.mode = '';
   if ($('input[name=search_hc]').is(':checked')) {
    query.mode += ',hardcore';
   }
   if ($('input[name=search_mm]').is(':checked')) {
    query.mode += ',mixed';
   }
   if ($('input[name=search_ps]').is(':checked')) {
    query.mode += ',strategy';
   }

   if (query.mode.length == 0) {
    delete query.mode;
   } else {
    query.mode = query.mode.substr(1);
   }

   query.limit = 100;

   doSearch(query);
   return false;
  }

  function doSearch(data) {
   clearSearchResults();

   $.ajax({
    url: 'res/data/layouts/search',
    data: data,
    success: handleSearch
   });
  }

  function handleSearch(data) {
   var body = $('#searchresults tbody');
   $.each(data, function() {
    this.difficulty = this.difficulty || 'unknown';
    this.type = (this.type && this.type != 'none') ? this.type : 'unknown';

    var tr = $('<tr>');
    tr.append($('<td>').append($('<a>').attr('href', '#' + this.id).text(this.id).click(hideSearch)));
    tr.append($('<td>').text(levels[this.level - 1] ? levels[this.level - 1].name : 'Unknown!'));
    tr.append($('<td>').addClass(this.difficulty).text(this.difficulty));
    tr.append($('<td>').addClass(this.type).text(this.type));
    tr.append($('<td>').html(getModesHTML(this.mode)));

    var classes = this.classes;
    var td = $('<td>');
    $.each(['huntress', 'apprentice', 'monk', 'squire'], function(k, v) {
     var url = v == 'apprentice' ? 'mage' : v;
     var img = $('<img>').attr('src', 'res/images/classes/' + url + '_icon.png')
                         .attr('alt', v);
     if ($.inArray(v, classes) == -1) {
      img.addClass('disabled');
     }
     td.append(img);
    });

    tr.append(td);

    body.append(tr);
   });
  }

  $('#search_submit').click(buildSearchQuery);
  $('#search').click(showSearch);
  $('#searchmask').click(hideSearch);
  $('#searchclose').click(hideSearch);
 })();

 var thisLevel;
 var layout;

 function getModesHTML(modes) {
  var res = '';
  modes && $.each(modes, function() {
   if (this == "hardcore") {
    res = '<abbr title="Hardcore">hc</abbr> ' + res;
   } else if (this == "mixed") {
    res = '<abbr title="Mixed mode">mm</abbr> ' + res;
   } else if (this == "strategy") {
    res = '<abbr title="Pure strategy">ps</abbr> ' + res;
   } else if (this == "none") {
    res = 'none';
   }
  });

  return res || 'unknown';
 }

 function updateDefenseUnits() {
  var used = 0;

  $.each(layout.towers, function() {
   used += towers[this.type].units;
  });

  $('#du_used').text(used);

  var hasClass = $('#du_wrapper').hasClass('over');

  $('#du_wrapper').removeClass('over');
  if (used > thisLevel.du) {
   $('#du_wrapper').addClass('over');
   if (!hasClass) {
    $('#du_wrapper').effect('pulsate', {times: 2}, 'fast');
   }
  }
 }

 function createElForCore() {
  return $('<img>')
    .attr('src', 'res/images/coreIcon.png')
    .attr('alt', 'Core')
    .addClass('core')
    .css('position', 'absolute')
    .css('height', (40 * thisLevel.towerscale) + 'px')
    .css('width', (40 * thisLevel.towerscale) + 'px');
 }

 function createBaseElForTower(key) {
  var type = towers[key];

  return $('<img>')
    .attr('src', type.image)
    .attr('alt', type.name)
    .data('type', key)
    .addClass(type.class.toLowerCase())
    .addClass('tower');
 }

 function createElForTower(tower) {
  return createBaseElForTower(tower.type)
    .data('tower', tower)
    .draggable({
     containment: 'document',
     start: function(evt) {
      return !evt.shiftKey;
     },
     stop: function() {
      var el = $(this);
      el.data('tower').position = adjustMapOffset({top: parseInt(el.css('top')), left: parseInt(el.css('left'))}, thisLevel, 1);
     }
    })
    .css('position', 'absolute')
    .css('height', (40 * thisLevel.towerscale * towers[tower.type].defaultscale) + 'px')
    .css('width', (40 * thisLevel.towerscale * towers[tower.type].defaultscale) + 'px')
    .offset(adjustMapOffset(tower.position, thisLevel))
    .rotate(tower.rotation)
    .dblclick(function() {
     layout.towers = $.grep(layout.towers, function(value) { return value != tower; });
     $(this).remove();
     updateDefenseUnits();
    })
    .mousedown(function(e) {
     if (!e.shiftKey) {
      return;
     }

     var el = $(this);
     var centre = el.offsetCentre();
     var mouseX = e.pageX - centre.left, mouseY = e.pageY - centre.top;
     var initialMouseAngle = Math.atan2(mouseY, mouseX);
     var initialRotation = tower.rotation;

     var moveHandler = function(evt) {
       var mouseX = evt.pageX - centre.left, mouseY = evt.pageY - centre.top;
       var newMouseAngle = Math.atan2(mouseY, mouseX);
       var mouseDelta = newMouseAngle - initialMouseAngle;
       var rotation = initialRotation + newMouseAngle * (180 / Math.PI);
       tower.rotation = rotation;
       el.rotate(rotation);
     };

     var upHandler = function() {
      $(document).unbind('mousemove', moveHandler);
      $(document).unbind('mouseup', upHandler);
     };

     $(document).mousemove(moveHandler);
     $(document).mouseup(upHandler);

     return false;
    });
 }

 function adjustMapOffset(towerOffset, level, reverse) {
  var res = $.extend({}, towerOffset);

  if (level.offsets && !reverse) {
   res.left += level.offsets.left;
   res.top += level.offsets.top;
  }

  if (level.scale) {
   if (reverse) {
    res.left /= level.scale.left;
    res.top /= level.scale.top;
   } else {
    res.left *= level.scale.left;
    res.top *= level.scale.top;
   }
  }

  if (level.offsets && reverse) {
   res.left -= level.offsets.left;
   res.top -= level.offsets.top;
  }

  return res;
 }

 function clearLayout() {
  $('#mapcontainer .tower').remove();
  if (layout) {
   layout.towers = [];
  }
 }

 function clearCores() {
  $('#mapcontainer .core').remove();
 }

 function updateLayout(data) {
  clearLayout();
  clearCores();

  layout = data;
  thisLevel = levels[layout.level - 1];

  $.each(thisLevel.cores, function() {
   createElForCore().offset(adjustMapOffset(this, thisLevel)).appendTo($('#mapcontainer'));
  });

  _gaq.push(['_setCustomVar', 1, 'Level', thisLevel.name, 1]);

  $('#mapcontainer').css('background-image', 'url("' + thisLevel.minimap + '")');

  $('#notecontent').val(layout.notes);
  $.each(layout.towers, function() {
   createElForTower(this).appendTo($('#mapcontainer'));
  });
  updateDefenseUnits();

  var difficulty = layout.difficulty ? layout.difficulty : "unknown";
  $('#difficulty').text(difficulty).removeClass().addClass(difficulty);

  var type = layout.type && layout.type != 'none' ? layout.type : "unknown";

  $('#type').text(type);
  $('#modes').html(getModesHTML(layout.mode));

  $('#du_total').text(thisLevel.du);
 }

 function getLayout(id) {
  _gaq.push(['_trackPageview', '/view/' + id]);
  $.getJSON('res/data/layouts/' + id + '.js', updateLayout);
 }

 function showBlankLayout(id) {
  window.location.hash = 'blank:' + id;
  _gaq.push(['_trackPageview', '/view/blank:' + id]);
  updateLayout({level: id, towers:[]});
 }
});
var levels = [

 {
  name: 'The Deeper Well',
  minimap: 'res/images/minimaps/Level1.png',
  image: 'res/images/levels/Level1.jpg',
  du: 60,
  offsets: {left: 130, top: 65},
  scale: {left: 1.19, top: 1.17},
  towerscape: 0.9,
  cores: [{left: 108, top: 576}]
 },

 {
  name: 'Foundries and Forges',
  minimap: 'res/images/minimaps/Level2.png',
  image: 'res/images/levels/Level2.jpg',
  du: 80,
  offsets: {left: 80, top: 35},
  scale: {left: 1.35, top: 1.35},
  towerscale: 1,
  cores: [{left: 286, top: 255}]
 },

 {
  name: 'Magus Quarters',
  minimap: 'res/images/minimaps/Level3.png',
  image: 'res/images/levels/Level3.jpg',
  du: 90,
  offsets: {left: 80, top: 45},
  scale: {left: 1.35, top: 1.35},
  towerscale: 1.2,
  cores: [{left: 283, top: 146}]
 },

 {
  name: 'Alchemical Laboratory',
  minimap: 'res/images/minimaps/Level4.png',
  image: 'res/images/levels/Level4.jpg',
  du: 85,
  offsets: {left: 280, top: 110},
  scale: {left: 0.92, top: 0.92},
  towerscale: 0.9,
  cores: [{left: 147, top: 422}]
 },

 {
  name: 'Servants Quarters',
  minimap: 'res/images/minimaps/Level5.png',
  image: 'res/images/levels/Level5.jpg',
  du: 85,
  offsets: {left: 115, top: 120},
  scale: {left: 1.17, top: 1.17},
  towerscale: 0.9,
  cores: [{left: 87, top: 290}, {left: 293, top: 335}]
 },

 {
  name: 'Castle Armory',
  minimap: 'res/images/minimaps/Level6.png',
  image: 'res/images/levels/Level6.jpg',
  du: 90,
  offsets: {left: 80, top: 45},
  scale: {left: 1.35, top: 1.34},
  towerscale: 1,
  cores: [{left: 234, top: 352}, {left: 341, top: 352}]
 },

 {
  name: 'Hall of Court',
  minimap: 'res/images/minimaps/Level7.png',
  image: 'res/images/levels/Level7.jpg',
  du: 100,
  offsets: {left: 35, top: 80},
  scale: {left: 1.45, top: 1.45},
  towerscale: 1,
  cores: [{left: 306, top: 264}, {left: 456, top: 264}]
 },

 {
  name: 'The Throne Room',
  minimap: 'res/images/minimaps/Level8.png',
  image: 'res/images/levels/Level8.jpg',
  du: 100,
  offsets: {left: 18, top: 130},
  scale: {left: 1.6, top: 1.5},
  towerscale: 1,
  cores: [{left: 288, top: 201}, {left: 288, top: 307}]
 },

 {
  name: 'Royal Gardens',
  minimap: 'res/images/minimaps/RoyalGardens.png',
  image: 'res/images/levels/Level9.jpg',
  du: 130,
  offsets: {left: 170, top: 55},
  scale: {left: 1.2, top: 1.2},
  towerscale: 0.75,
  cores: [{left: 175, top: 359}, {left: 322, top: 243}, {left: 322, top: 480}]
 },

 {
  name: 'The Ramparts',
  minimap: 'res/images/minimaps/Level9.png',
  image: 'res/images/levels/Level10.jpg',
  du: 110,
  offsets: {left: 142, top: 5},
  scale: {left: 1.08, top: 1.1},
  towerscale: 0.9,
  cores: [{left: 329, top: 540}, {left: 494, top: 300}, {left: 531, top: 330}]
 },

 {
  name: 'Endless Spires',
  minimap: 'res/images/minimaps/TheSpires.png',
  image: 'res/images/levels/Level11.jpg',
  du: 110,
  offsets: {left: 142, top: 57},
  scale: {left: 1.04, top: 1.04},
  towerscale: 0.65,
  cores: [{left: 420, top: 308}, {left: 424, top: 526}, {left: 262, top: 526}]
 },

 {
  name: 'The Summit',
  minimap: 'res/images/minimaps/TheSummit.png',
  image: 'res/images/levels/Level12.jpg',
  du: 150,
  offsets: {left: 200, top: 120},
  towerscale: 0.9,
  cores: [{left: 283, top: 362}, {left: 213, top: 548}, {left: 356, top: 547}]
 },

 {
  name: 'Glitterhelm Caverns',
  minimap: 'res/images/minimaps/caverns_minimap.png',
  image: 'http://placehold.it/200x100',
  du: 165,
  offsets: {left: 90, top: 35},
  scale: {left: 1.3, top: 1.27},
  towerscale: 0.8,
  cores: [{left: 230, top: 134}, {left: 234, top: 444}, {left: 413, top: 419}, {left: 38, top: 569}]
 },

];
var towers = {

 'spike': {name: 'Spike Blockade', image: 'res/images/towers/spikyBlockadeTower_Icon.png', class: 'Squire', units: 3, defaultscale: 1},
 'bouncer': {name: 'Bouncer Blockade', image: 'res/images/towers/bouncerTower_Icon.png', class: 'Squire', units: 4, defaultscale: 1},
 'harpoon': {name: 'Harpoon Turret', image: 'res/images/towers/harpoonTower_Icon.png', class: 'Squire', units: 6, defaultscale: 1},
 'bowling': {name: 'Bowling Ball Turret', image: 'res/images/towers/bowlingBallTower_Icon.png', class: 'Squire', units: 7, defaultscale: 1},
 'slice': {name: 'Slice N Dice Blockade', image: 'res/images/towers/slicerTower_Icon.png', class: 'Squire', units: 8},

 'missile': {name: 'Magic Missile Tower', image: 'res/images/towers/missleTower_Icon.png', class: 'Apprentice', units: 3, defaultscale: 1},
 'blockade': {name: 'Magic Blockade', image: 'res/images/towers/blockadeTower_Icon.png', class: 'Apprentice', units: 1, defaultscale: 1},
 'fireball': {name: 'Fireball Tower', image: 'res/images/towers/fireTower_Icon.png', class: 'Apprentice', units: 5, defaultscale: 1},
 'lightning': {name: 'Lightning Tower', image: 'res/images/towers/lightningTower_Icon.png', class: 'Apprentice', units: 7, defaultscale: 1},
 'striker': {name: 'Deadly Striker Tower', image: 'res/images/towers/strikerTower_Icon.png', class: 'Apprentice', units: 8, defaultscale: 1},

 'ensnare': {name: 'Ensnare Aura', image: 'res/images/towers/stickyGoopAura_Icon.png', class: 'Monk', units: 3, defaultscale: 2.5},
 'electric': {name: 'Electric Aura', image: 'res/images/towers/deathlyHallowsAura_Icon.png', class: 'Monk', units: 5, defaultscale: 2.5},
 'healing': {name: 'Healing Aura', image: 'res/images/towers/healingAura_Icon.png', class: 'Monk', units: 5, defaultscale: 2.5},
 'drain': {name: 'Strength Drain Aura', image: 'res/images/towers/strengthDrainAura_Icon.png', class: 'Monk', units: 6, defaultscale: 2.5},
 'enrage': {name: 'Enrage Aura', image: 'res/images/towers/enrageAura_Icon.png', class: 'Monk', units: 5, defaultscale: 2.5},

 'gas': {name: 'Gas Trap', image: 'res/images/towers/gasTrap_Icon.png', class: 'Huntress', units: 3, defaultscale: 1},
 'mine': {name: 'Proximity Mine Trap', image: 'res/images/towers/proxMineTrap_Icon.png', class: 'Huntress', units: 3, defaultscale: 1},
 'inferno': {name: 'Inferno Trap', image: 'res/images/towers/infernoTrap_Icon.png', class: 'Huntress', units: 4, defaultscale: 1},
 'etheral': {name: 'Etheral Spike Trap', image: 'res/images/towers/etherialSpikeTrap_Icon.png', class: 'Huntress', units: 3, defaultscale: 1},
 'darkness': {name: 'Darkness Trap', image: 'res/images/towers/darknessTrap_Icon.png', class: 'Huntress', units: 6, defaultscale: 1},

};
