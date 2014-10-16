var helper = (function(){

  return {

    title: function(str){
      document.title = str;
    },

    guid: function(item){

      var guid = $('guid', item.xmlNode).text();

      $.each(["\\/","http:","\\.","\\?","=","-","www"], function(){
        var r = new RegExp(this, 'g');
        guid = guid.replace(r, '');
      });

      return '/'+guid;

    },

    feedBySlug: function(slug, feeds){

      var data = false;

      $.each(feeds, function(){
        if(slug == this.slug){
          data = this;
          return true;
        }
      });

      return data;

    },

    postBySlugPost: function(slug, post, feeds){

      var feed = helper.feedBySlug(slug, feeds),
          o = false,
          entries = feed.data.feed.entries;


      for(var i=0; i < entries.length; i++){
        var entry = entries[i], guid = helper.guid(entry);
        if(guid == '/'+post){
          prev = entries[i-1];
          next = entries[i+1];
          o = entry;
        }

      }

      return {
        feed: feed,
        post: o,
        next: next ? next : false,
        prev: prev ? prev : false
      };

    }

  }

})();


/////////////////////////////////////////

var loader = (function(feeds){

  var $el = $('.loading .progress').html('Loading 0 / ' + feeds.length),
      count = feeds.length;

  google.load("feeds", "1");

  $.each(feeds, function(){
    var that = this;
    google.setOnLoadCallback(function(){
      var feed = new google.feeds.Feed(that.url);
      feed.setNumEntries(100);
      feed.setResultFormat(google.feeds.Feed.MIXED_FORMAT);
      feed.load(function(result) {
        PubSub.publish('Feed Loaded', result);
      });
    });
  });

  PubSub.subscribe('Feed Loaded', function(msg, data){

    $.each(feeds, function(){
      if(data.feed.feedUrl == this.url){
        this.data = data;
        return true;
      }
    });

    --count;

    $el.html('Loading ' + (feeds.length-count) + ' / ' + feeds.length);

    if(count <= 0){
      PubSub.publish('All Feeds Loaded', feeds);
    }

  });

  PubSub.subscribe('Page Built', function(msg, data){
    setTimeout(function(){
      $('.loading').fadeOut();
    }, 1000)
  });

  return {
    data: function(){
      return (count <= 0) ? feeds : false;
    }
  }

})(feeds);

/////////////////////////////////////////

var ocn = (function(){
  var $nav = $('#ocn nav');
  PubSub.subscribe('All Feeds Loaded', function(msg, data){
    var t = _.template($("#feed-menu").html());
    $('#ocn nav').html(t({feeds:data}));
  });
})();

/////////////////////////////////////////

var entries = (function(){

  var posts = [];

  PubSub.subscribe('All Feeds Loaded', function(msg, data){
    $.each(data, function(){
      var feed = this;
      $.each(feed.data.feed.entries, function(){
        var post = this;
            post.imUrl = '#/'+feed.slug+helper.guid(post);
            post.imFeed = feed;

            posts.push(post);
      });
    });

    posts.sort(function(a,b){
      var ad = new Date(a.publishedDate),
          bd = new Date(b.publishedDate);

      return ad.getTime() > bd.getTime() ? -1 : 1;

    });

    PubSub.publish('Entries Built', posts);

  });

  return {
    data: function(){
      return posts;
    }
  }

})();


/////////////////////////////////////////

var AppRouter = Backbone.Router.extend({
  routes: {
    ":slug":"index",
    ":slug/:post":"post",
    "*actions":"default"
  }
});

var router = new AppRouter;

/////////////////////////////////////////

router.on('route:default', function(actions) {

  var view = function(data){
    var t = _.template($("#default").html());
    $('#app').html(t({entries:data}));
    helper.title('Home | All posts');

    PubSub.publish('Page Built', {});

  }

  if(!loader.data()){
    PubSub.subscribe('Entries Built', function(msg, data){
      view(data);
    });
  } else {
    view(entries.data());
  }

});

/////////////////////////////////////////

router.on('route:index', function(slug) {

  var view = function(data){

    var feed = helper.feedBySlug(slug, data);

    if(feed){
      var t = _.template($("#list").html());
      $('#app').html(t({feed:feed}));
      helper.title('Feed');
    } else {
      console.log('problem');
    }

    PubSub.publish('Page Built', {});

  }

  if(!loader.data()){
    PubSub.subscribe('All Feeds Loaded', function(msg, data){
      view(data);
    });
  } else {
    view(loader.data());
  }

});

/////////////////////////////////////////

router.on('route:post', function(slug, post){

  var view = function(data){
    var t = _.template($("#post").html()),
        p = helper.postBySlugPost(slug, post, data);
        console.log(p);
    if(p){
      $('#app').html(t(p));
      helper.title('Post');
    } else {

    }

    PubSub.publish('Page Built', {});

  }

  if(!loader.data()){
    PubSub.subscribe('All Feeds Loaded', function(msg, data){
      view(data);
    });
  } else {
    view(loader.data());
  }

});

/////////////////////////////////////////

Backbone.history.start();

/////////////////////////////////////////

$(window).on('click', function(e){
  $target = $(e.target);
  if($target.hasClass('nav')){
    window.scrollTo(0,0);
    router.navigate($target.attr('href'), { trigger: true });
  }

  if($target.hasClass('burger') || $target.hasClass('fa-bars')){
    $('html').toggleClass('open');
  }

  if($target.hasClass('close')){
    $('html').removeClass('open');
  }

});


/////////////////////////////////////////

var paginator = function($el){
  var $lis = $el.children('article'),
      lisPerPage = 4,
      cursor = 0,
      totalPages = Math.ceil( $lis.length / lisPerPage ),
      turn = function(i){
        if(i < totalPages && i > -1){
          window.scrollTo(0,0);
          cursor = i;
          var start = cursor*lisPerPage,
              end = start+lisPerPage;
          $lis.hide().slice(start,end).show();
          $pagination.removeClass('active').eq(cursor+1).addClass('active');
        }
      };

  if(lisPerPage < $lis.length){
    var t = _.template($('#paginator').html());
    var $pagination = $(t({
      pages: totalPages,
      cursor: cursor
    })).insertAfter($el).find('li').on('click', function(e){
      e.preventDefault();
      var $this = $(this),
          i = $this.index()-1;
      if($this.is(':first-child')){
        i = cursor-1;
      } else if($this.is(':last-child')){
        i = cursor+1;
      }
      turn(i);
    });
    turn(cursor);
  }
}

////////

PubSub.subscribe('Page Built', function(msg, data){
  $(".paginate").each(function(){
    new paginator($(this));
  });
});
