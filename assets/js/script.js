

// http://dailydead.com/feed
// http://www.bikeexif.com/feed
// http://kickstart.bikeexif.com/wp-content/themes/bikeexif/images/random/bike_exif_logo_5b.jpg

var feeds = [
 { url: 'http://dailydead.com/feed', slug: 'daily-dead' },
 { url: 'http://www.bikeexif.com/feed', slug: 'bike-exif' },
 { url: 'http://feeds.feedburner.com/edgarwrightherefeed', slug: 'edgar-wright-here' }
];

var entries = [];

function setEntries(){
  $.each(feeds, function(){
    var feed = this;
    $.each(feed.data.feed.entries, function(){
      var post = this;
          post.imUrl = '#/'+feed.slug+link(post);
          post.imFeed = feed;
          entries.push(post);
    });
  });

  entries.sort(function(a,b){
    return strftime(a.publishedDate) > strftime(b.publishedDate) ? -1 : 1;
  });

  // console.log(entries);

}

var $app = $('#app');

var dispatcher = (function(){
  var count = 0,
      $loader = $('.loading span'),
      loaded = false,
      finished;
  return {
    publish: function(data){

      $.each(feeds, function(){
        if(data.feed.feedUrl == this.url){
          this.data = data;
          return true;
        }
      });

      --count;

      $loader.html((feeds.length-count) + ' / ' + feeds.length);
      if(count <= 0){
        setEntries();
        loaded = true;
        finished();
      }
    },
    subscribe: function(){
      count++;
    },
    onLoad: function(method){
      if(loaded) {
        method();
      } else {
        finished = method;
      }
    }
  }
})();


google.load("feeds", "1");

function link(item){
  var guid = $('guid', item.xmlNode).html();
  $.each(["\\/","http:","\\.","\\?","=","-","www"], function(){
    var r = new RegExp(this, 'g');
    guid = guid.replace(r, '');
  });
  return '/'+guid;
}

function feedBySlug(slug){
  var data = false;
  $.each(feeds, function(){
    if(slug == this.slug){
      data = this;
      return true;
    }
  });
  return data;
}

function postBySlugPost(slug, post){
  var feed = feedBySlug(slug),
      o = false;

  $.each(feed.data.feed.entries, function(){
    var guid = link(this);
    if(guid == '/'+post){
      o = this;
      return true;
    }
  });

  return {
    feed: feed,
    post: o
  };
}

function four04(){

}

$.each(feeds, function(){
  var that = this;
  google.setOnLoadCallback(function(){
    dispatcher.subscribe();
    var feed = new google.feeds.Feed(that.url);
    feed.setNumEntries(100);
    feed.setResultFormat(google.feeds.Feed.MIXED_FORMAT);
    feed.load(function(result) {
      if (!result.error) {
        dispatcher.publish(result);
      }
    });
  });
});

var AppRouter = Backbone.Router.extend({
  routes: {
    ":slug":"index",
    ":slug/:post":"post",
    "*actions":"default"
  }
});

var router = new AppRouter;

router.on('route:default', function(actions) {
  dispatcher.onLoad(function(){
    var t = _.template($("#default").html());
    $app.html(t({entries:entries}));
  });
});

router.on('route:index', function(slug) {
  dispatcher.onLoad(function(){
    var feed = feedBySlug(slug);
    if(feed){
      var t = _.template($("#list").html());
      $app.html(t({feed:feed}));
    } else {
      four04();
    }
  });
});

router.on('route:post', function(slug, post){
  dispatcher.onLoad(function(){
    var t = _.template($("#post").html()),
        p = postBySlugPost(slug, post);
    if(p){
      $app.html(t(p));
    } else {
      four04();
    }
  });
});

Backbone.history.start();

$('#app').on('click', function(e){
  $target = $(e.target);
  if($target.hasClass('nav')){
    window.scrollTo(0,0);
    router.navigate($target.attr('href'), { trigger: true });
  }
});
