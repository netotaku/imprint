var feedData = false;

function link(url){
  var parser = document.createElement('a');
  parser.href = url;
  return parser.pathname.replace('imprint/','');;
}

function feed(then){
  if(!feedData){
    google.load("feeds", "1");
    google.setOnLoadCallback(function(){
      var feed = new google.feeds.Feed("http://www.bikeexif.com/feed");
      feed.setNumEntries(100);
      feed.load(function(result) {
        if (!result.error) {
          feedData = result;
          then(feedData);
        }
      });
    });
  } else {
    then(feedData);
  }
}

var AppRouter = Backbone.Router.extend({
  routes: {
    "post/:id": "post",
    "*actions": "default"
  }
});

var router = new AppRouter;

router.on('route:default', function(actions) {
  feed(function(data){
    var t = _.template($("#list").html());
    $("#app").html(t({items:data.feed.entries}));
  });
})

router.on('route:post', function(id){
  feed(function(data){
    $.each(data.feed.entries, function(){
      if(link(this.link) == link(id)){
        var t = _.template($("#post").html());
        $("#app").html(t({post:this}));
      }
    })
  });
});

Backbone.history.start();

$('#app').on('click', function(e){
  $target = $(e.target);
  if($target.hasClass('more')){
    window.scrollTo(0,0);
    router.navigate($target.attr('href'), { trigger: true });
  }
});
