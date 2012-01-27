$(function() {
 var thisLevel;
 var layout;

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

 function clearLayout() {
  $('#mapcontainer .tower').remove();
  if (layout) {
   layout.towers = [];
  }
 }

 function clearCores() {
  $('#mapcontainer .core').remove();
 }

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

 $('#createlayout').click(showPicker);
 $('#layoutmask').click(closePicker);
 $('#layoutclose').click(closePicker);
 $('#savelayout').click(saveLayout);
 $('#savemask').click(closeSave);
 $('#saveclose').click(closeSave);

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
});
