$('input[type=range]').on('input', function(event){
  var min = event.target.min;
  var max = event.target.max;
  var val = event.target.value;

  $(event.target).css({
    'backgroundSize': (val - min) * 100 / (max - min) + '% 100%'
  });
}).trigger('input');