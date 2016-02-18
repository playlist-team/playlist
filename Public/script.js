$(document).ready(function() {

if(window.FileReader) { 
  addEventHandler(window, 'load', function() {
    var status = document.getElementById('status');
    var drop   = document.getElementById('drop');
    var list   = document.getElementById('list');
  	
    function cancel(e) {
      if (e.preventDefault) { e.preventDefault(); }
      return false;
    }
  
    // Tells the browser that we *can* drop on this target
    addEventHandler(drop, 'dragover', cancel);
    addEventHandler(drop, 'dragenter', cancel);
  });
} else { 
  document.getElementById('status').innerHTML = 'Your browser does not support the HTML5 FileReader.';
}

function addEventHandler(obj, evt, handler) {
    if(obj.addEventListener) {
        // W3C method
        obj.addEventListener(evt, handler, false);
    } else if(obj.attachEvent) {
        // IE method.
        obj.attachEvent('on'+evt, handler);
    } else {
        // Old school method.
        obj['on'+evt] = handler;
    }
}

var audio = new AudioContext;

addEventHandler(drop, 'drop', function (e) {
  e = e || window.event; // get window.event if e argument missing (in IE)   
  if (e.preventDefault) { e.preventDefault(); } // stops the browser from redirecting.

  var dt = e.dataTransfer;
  var test = e.dataTransfer.getData('audio/mpeg');
  var files = dt.files;
  for (var i=0; i<files.length; i++) {
    var file = files[i];
    var reader = new FileReader();
      
    //attach event handlers here...
    reader.addEventListener('load', function(event) {
      var data = event.target.result;
      audio.decodeAudioData(data, function(buffer) {
        var source = audio.createBufferSource();
        source.buffer = buffer;
        source.connect(audio.destination);
        source.start();
      });
    });
    reader.readAsArrayBuffer(file);
  }
  // return false;
});

});