function tplawesome(e,t){res=e;for(var n=0;n<t.length;n++){res=res.replace(/\{\{(.*?)\}\}/g,function(e,r){return t[n][r]})}return res}

$(function() {
    $("form").on("submit", function(e) {
       e.preventDefault();
       // prepare the request
       var request = gapi.client.youtube.search.list({
            part: "snippet",
            type: "video",
            q: encodeURIComponent($("#search").val()).replace(/%20/g, "+"),
            maxResults: 5,
            order: "viewCount",
            publishedAfter: "2000-01-01T00:00:00Z"
       });
       // execute the request
       request.execute(function(response) {
          var results = response.result;
          console.log(results)
          $(".drop").remove();
          $.each(results.items, function(index, item) {
            $.get("item.html", function(data) {
                $(".thumbnails")
                  .append(tplawesome(data, [{"title":item.snippet.title, 
                                             "videoid":item.id.videoId, 
                                             "thumbnail":item.snippet.thumbnails.default.url}]));
            });
          });
          resetVideoHeight();
       });
    });

    $(window).on("resize", resetVideoHeight);
});

$(".thumbnails").on('click', 'button', function(e) {
  console.log('e.target.dataset.thumbnail: ', e.target.dataset.thumbnail);
  socket.emit('enqueue', {id: e.target.id, 
                          title: e.target.value, 
                          thumbnail: e.target.dataset.thumbnail});
})

function resetVideoHeight() {
    $(".video").css("height", $("#results").width() * 9/16);
}


function init(){
  gapi.client.setApiKey("AIzaSyDxx1rrqR-q7Tcfkz0MqII6sO2GQpONrGg");
  gapi.client.load("youtube","v3",function(){

  })
}