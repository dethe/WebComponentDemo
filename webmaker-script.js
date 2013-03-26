/**
 * Our "webmaker" object can keep track of all webmaker
 * elements for the purpose of hooking into them, should
 * we need to. For instance, a timeline visualizer might
 * like to ask for "all currently known elements" that
 * have timeline information, which it can get here.
 */
(function(global){
  var components = [];
  global.WebMaker = {
    addComponent: function addComponent(c) {
      components.push(c);
    },
    updateComponent: function updateComponent(c) {
      // ...this might be used to effect on-page changes
    },
    getComponentList: function getComponentList() {
      return components;
    }
  };
}(window));

/**
 * If we do not have Popcorn available, we try to load it.
 * While it's loading, we keep an object around that has the
 * same event API for addeding "things" to be popped, but 
 * rather than doing anything with them, it just queues them
 * until Popcorn's up and running, at which point we clear
 * the queue, processing every addition before letting the
 * real Popcorn take over.
 */
(function(global){
  var fnCache = [];

  // load popcorn if we don't have it available already
  if(!global.Popcorn) {
    // Stub out Popcorn until it loads
    global.Popcorn = function( fn ) {
      fnCache.push( fn );      
    };
    
    // Add popcorn as a script dependency
    var popcornScript = document.createElement("script");
    popcornScript.onload = function(){
      Popcorn(function(){
        // Clear out the function cache now that Popcorn is ready
        fnCache.forEach(function(f) { f(); });
      });
    };
    popcornScript.src = "http://cdn.popcornjs.org/code/dist/popcorn-complete.js";
    document.head.appendChild(popcornScript);
  }
}(window));