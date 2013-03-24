(function() {
  var pandaURL = "http://api.flickr.com/services/rest/?method=flickr.groups.pools.getPhotos&api_key=8f0cd88e1f753b111402168e985b78ca&group_id=31687688%40N00&format=json&nojsoncallback=1";
  var get = function(url) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  window.FlickrFindr = {
    photos: (function(url) {
      var json = get(url);
      var fn = new Function("return "+json+";");
      var pandas = fn();
      return pandas.photos.photo;
    }(pandaURL)),
    getPhotos: function(howMany) {
      var list = [], pobj, url, img;
      for(var i=0; i<howMany; i++) {
        pobj = this.photos[i];
        url = "http://farm"+pobj.farm+".static.flickr.com/"+pobj.server+"/"+pobj.id+"_"+pobj.secret;
        img = new Image();
        img.src = url;
        list.push(img); }
      return list;
    }
  };
}());