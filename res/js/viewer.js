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
      $(this).data('tower').position = adjustMapOffset($(this).offsetFrom('#mapcontainer'), thisLevel, 1);
     }
    })
    .css('position', 'absolute')
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

 $.each(levels, function(key) {
  $('<button>')
   .append($('<img>').attr('src', this.image))
   .append($('<p>').text(this.name))
   .click(function() {
    updateLayout({level: key + 1, towers:[]});
    closePicker();
   })
   .appendTo($('#layoutpicker'));
 });

 function showPicker() {
  $('#layoutcontainer').show();
 }

 function closePicker() {
  $('#layoutcontainer').hide();
 }

 function saveLayout() {
  $('#save_inprogress').show();
  $('#save_done').hide();
  $('#savecontainer').show();
  $('#save_error').hide();

  $.ajax({
   type: 'POST',
   url: 'data/layouts/new',
   data: JSON.stringify(layout),
   success: function(res) {
    var url = window.location.href + "?id=" + res;
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

 $('#createlayout').click(showPicker);
 $('#layoutmask').click(closePicker);
 $('#savelayout').click(saveLayout);

 function updateLayout(data) {
  clearLayout();

  layout = data;
  thisLevel = levels[layout.level - 1];
  $('#mapcontainer').css('background-image', 'url("' + thisLevel.minimap + '")');

  $('#notecontent').val(layout.notes);
  $.each(layout.towers, function() {
   createElForTower(this).appendTo($('#mapcontainer'));
  });
  updateDefenseUnits();

  $('#du_total').text(thisLevel.du);
 }

 function getLayout(id) {
  $.getJSON('res/data/layouts/' + id + '.js', updateLayout);
 }

 getLayout(parseInt(getURLParameter('id')) || 13934);
});
