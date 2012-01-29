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
