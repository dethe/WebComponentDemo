// waterbear components
(function(){
  var wb = {
    parseChannels: function parseChannels(channelstring){
      var updatedChannels = {};
      channelpairs = channelstring.toString().split(',').forEach(function(textpair){
        var pair = textpair.trim().split(':');
        // console.log('parsing %s=>%s channel', pair[1], pair[0]);
        updatedChannels[pair[1]] = pair[0]; // reverse for lookup convenience
      });
      // console.log('updated channels: %o', updatedChannels);
      return updatedChannels;
    },
    unparseChannels: function unparseChannels(channels){
      var ret = [];
      for (var key in channels){
        ret.push(channels[key] + ':' + key);
      }
      return ret.join(',');
    },
    update: function update(elem, propertyname, uncastvalue){
      // console.log('update %s.%s(%s)', elem.localName, propertyname, uncastvalue);
      var castvalue;
      switch(typeof elem[propertyname]){
        case 'number':
          castvalue = Number(uncastvalue);
          if (Number.isNaN(castvalue)){
            throw new Error('cannot pass NaN on a channel. Property ' + propertyname + ' [' + elem[propertyname] + '] of [' + elem.localName + ' is NaN');
          }
          break;
        case 'boolean':
          castvalue = Boolean(uncastvalue);
          break;
        case 'string':
          castvalue = uncastvalue;
          break;
        case 'object':
          if (Array.isArray(elem[propertyname])){
            throw new Error('We do not deal with array channels yet');
          }else{
            throw new Error('We do not deal with object channels yet');
          }
        default:
          throw new Error('We do not allow null or undefined on channels. Property ' + propertyname + ' [' + elem[propertyname] + '] of ' + elem.localName + ' is of unrecognized type ' + typeof elem[propertyname]);
      }
      elem[propertyname] = castvalue;
    }
  }

  /*
    We are creating a pattern language here, where all the componetns work togehter

    This is the root element that defines things like channels for pub/sub, most of the
    other elements would be expected to extend it.

    We don't call document.register() for WBElementProto because it is not intended
    to be instantiated directly, but used as a building block for other elements.
  */

  var WBElementProto = Object.create(HTMLElement.prototype, {
    createdCallback: {
      value: function createdCallback(){
        console.log('%s created', this.localName);
        this.channels = this.getAttribute('channels');
      }
    },
    enteredDocumentCallback: {
      value: function enteredDocumentCallback(){
        console.log('%s entered document', this.localName);
      }
    },
    leftDocumentCallback: {
      value: function leftDocumentCallback(){
        console.log('%s left document', this.localName);
      }
    },
    attributeChangedCallback: {
      value: function attributeChangedCallback(attrName){
        // console.log('%s changed attribute %s="%s"', this.localName, attrName, this.getAttribute(attrName));
        if (attrName === 'channels'){
          this.channels = this.getAttribute('channels');
        }
      }
    }, 
    channels: {
      get: function(){
        return wb.unparseChannels(this._channelset);
      },
      set: function(channels){
        // unsubscribe to old channels
        // console.log('channels before: %o', this._channelset);
        for (propertyname in this._channelset){
          channel.off(this._channelset[propertyname], this);
        }
        this._channelset = wb.parseChannels(channels);
        // subscribe to new channels
        for (propertyname in this._channelset){
          channel.on(this._channelset[propertyname], this);
        }
        // console.log('%s channels after: %o', this.localName, this._channelset);
      },
    },
    // onChannel is a private method called by the pub/sub system
    // to notify subscribers of a change they are watching
    // it is a method instead of an event listener to avoid a proliferation
    // of event handlers, so channels work like jQuery "live" handlers
    onChannel: {
      value: function onChannel(channelname, data){
        for (propertyname in this._channelset){
          if (this._channelset[propertyname] === channelname){
            wb.update(this, propertyname, data);
          }
        }
      }
    },
    // update channel is private method called when a property is changed,
    // to notify other subscribers
    updateChannel: {
      value: function updateChannel(propertyName, newValue){
        if (this._channelset[propertyName]){
          console.log('%s sending %s to subscribers on %s', this.localName, newValue, this._channelset[propertyName]);
          channel.emit(this._channelset[propertyName], newValue);
        }else{
          console.log('%s: no channel set for %s in %s', this.localName, propertyName, Object.keys(this._channelset).join(', '));
        }
      }
    }
  });

  /* WBDraggableProto is another base object used to build other elements,
     and is not intended to be instntiated directly.
  */

  var WBDraggableProto = Object.create(WBElementProto, {
    createdCallback: {
      value: function createdCallback(){
        WBElementProto.createdCallback.call(this);
        // initialize pointer events
        this.setAttribute('touch-action', 'none');
        this.addEventListener('pointerdown', this.startDrag.bind(this));
        this.addEventListener('pointerup', this.endDrag.bind(this));
        this.addEventListener('pointermove', this.conditionalDrag.bind(this));
        this._dragging = false;
      }
    },
    // enteredDocumentCallback: {
    //   value: function enteredDocumentCallback(){
    //     WBElementProto.enteredDocumentCallback.call(this);
    //   }
    // },
    // leftDocumentCallback: {
    //   value: function leftDocumentCallback(){
    //     WBElementProto.leftDocumentCallback.call(this);
    //   }
    // },
    // attributeChangedCallback: {
    //   value: function attributeChangedCallback(attrName){
    //     WBElementProto.AttributeChangedCallback.call(this, attrName);
    //   }
    // }, 
    startDrag: {
      value: function startDrag(event){
        // console.log('starting drag for %s', this.localName);
        this.lastDragX = event.clientX;
        this.lastDragY = event.clientY;
        this._dragging = true;
      }
    },
    endDrag: {
      value: function endDrag(event){
        // console.log('ending drag for %s', this.localName);
        this._dragging = false;
      }
    },
    conditionalDrag: {
      value: function conditionalDrag(event){
        // console.log('conditional drag %s: %s', this.localName, this._dragging);
        if (this._dragging){
          this.dX = event.clientX - this.lastDragX;
          this.dY = event.clientY - this.lastDragY;
          this.lastDragX = event.clientX;
          this.lastDragY = event.clientY;
          this.drag(event);
          event.preventDefault();
          event.stopPropagation();
        }
      }
    },
    drag: {
      value: function drag(event){
        console.log('default drag implementation does nothing, over-ride me');
      },
    }
    // dragging: {
    //   value: false
    // },
    // lastDragX: {
    //   value: 0
    // },
    // lastDragY: {
    //   value: 0
    // }        
  });

  /* Now we get to actual elements that can be instantiated */

  /* Simple extension of an input field */

  var WBNumberInputProto = Object.create(WBDraggableProto, {
    createdCallback: {
      value: function createdCallback(){
        WBDraggableProto.createdCallback.call(this);
        // Would be nice to use templates for this, one of the casualties of killing the
        // declarative syntax for Custom Elements
        this.shadow = this.createShadowRoot();
        var value = this.getAttribute('value') || 0;
        var min = parseInt(this.getAttribute('min'), 10) || 0;
        var max = parseInt(this.getAttribute('max'), 10) || 100;
        this.shadow.innerHTML = '<input type="number" min="' + min + '" max="' + max + '" />';
        this._min = min;
        this._max = max;
        this.value  = value;
        var self = this;
        this.shadow.firstElementChild.addEventListener('change', function(event){
          self.value = parseInt(event.target.value, 10);
        });
        // configure drag control
        this.setAttribute('touch-action', 'pan-y');
      }
    },
    attributeChangedCallback: {
      value: function attributeChangedCallback(attrName){
        WBDraggableProto.attributeChangedCallback.call(this, attrName);
        if (attrName === 'value'){
          this.value = parseInt(value);
        }
      }
    },
    value: {
      get: function(){
        return this._value;
      },
      set: function(value){
        var intValue = parseInt(value, 10) || this._value || 0;
        intValue = Math.max(this._min, intValue);
        intValue = Math.min(this._max, intValue);
        if (intValue !== this._value){
          if (Number.isNaN(intValue)) return;
          this._value = intValue;
          this.shadow.firstElementChild.value = intValue;
          this.updateChannel('value', intValue);
        }
      }
    },
    drag: {
      value: function drag(event, detail, sender){
        // console.log('dragging %s', this.localName);
        this.value += this.dX;
      }
    }
  });

  document.WBNumberInput = document.register('wb-number-input', {prototype: WBNumberInputProto});

  /* Simple extension of an input field */

  var WBRangeInputProto = Object.create(WBElementProto, {
    createdCallback: {
      value: function createdCallback(){
        WBElementProto.createdCallback.call(this);
        this.shadow = this.createShadowRoot();
        var value = this.getAttribute('value') || '';
        var max = this.getAttribute('max') || 100;
        var min = this.getAttribute('min') || 0;
        this.shadow.innerHTML = '<input type="range" min="' + min + '" + max="' + max + '" />';
        this.value = this.getAttribute('value') || 0;
        var self = this;
        this.shadow.firstElementChild.addEventListener('change', function(event){
          self.value = parseInt(event.target.value, 10);
        })
      }
    },
    attributeChangedCallback: {
      value: function attributeChangedCallback(attrName){
        WBDraggableProto.AttributeChangedCallback.call(this, attrName);
        if (attrName === 'value'){
          this.value = this.getAttribute('value');
        }
      }
    },
    value: {
      get: function(){
        return this._value;
      },
      set: function(value){
        var intValue = parseInt(value, 10) || this._value || 0;
        if (this._value !== intValue){
          this._value = intValue;
          this.shadow.firstElementChild.value = intValue;
          this.updateChannel('value', intValue);
        }
      }
    }
  });

  document.WBRangeInput = document.register('wb-range-input', {prototype: WBRangeInputProto});



  var WBBarGraphProto = Object.create(WBDraggableProto, {
    createdCallback: {
      value: function createdCallback(){
        WBElementProto.createdCallback.call(this);
        this.shadow = this.createShadowRoot();
        this.shadow.innerHTML = '<div></div>';
        this.impl.style.display = 'inline-block';
        this.impl.style.position = 'relative';
        this.impl.style.width = '20px';
        this.impl.style.height = '100%';
        this.shadow.firstElementChild.style.position = 'absolute';
        this.shadow.firstElementChild.style.width = '20px';
        this.shadow.firstElementChild.style.bottom = 0;
        // unfortunately, the below does not work
        // this.shadow.innerHTML = '<style>\
        //   @host{\
        //     :scope{\
        //       display: inline-block;\
        //       width: 20px\
        //       height: 100%;\
        //     }\
        //     :scope div{\
        //       height: 100%;\
        //     }\
        //   }\
        // </style>'
        // configure drag control
        this.setAttribute('touch-action', 'pan-x');
        this.color = this.getAttribute('color');
        this.height = this.getAttribute('height') || 100;
      }
    },
    attributeChangedCallback: {
      value: function attributeChangedCallback(attrName){
        WBElementProto.attributeChangedCallback.call(this, attrName);
        switch(attrName){
          case 'height': this.height = parseInt(this.getAttribute('height'), 10); break;
          case 'color': this.color = this.getAttribute('color'); break;
        }
      }
    },
    color: {
      get: function(){
        return this.shadow.firstElementChild.style.backgroundColor;
      },
      set: function(value){
        this.shadow.firstElementChild.style.backgroundColor = value;
      }
    },
    height: {
      get: function(){
        return this._height;
      },
      set: function(value){
        var intValue = parseInt(value, 10) || this._height || 0;
        if (this._height !== intValue){
          this._height = intValue;
          this.shadow.firstElementChild.style.height = value + '%';
          this.updateChannel('height', intValue);
        }
      }
    },
    drag: {
      value: function drag(event, detail, sender){
        WBDraggableProto.prototype.drag.call(this, event, detail, sender);
        this.height -= this.dY;
      }
    }
  });

  document.WBBarGraph = document.register('wb-bar-graph', {prototype: WBBarGraphProto });
})();