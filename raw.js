/*
 * raw text paste service for your cross-domain hacking pleasures
 *
 * by stagas
 *
 * MIT licenced
 */
 
var util = require('util')
  , fs = require('fs')
  , path = require('path')  
  , crypto = require('crypto')
  , EventEmitter = require('events').EventEmitter

// to_array from mranney / node_redis
function to_array(args) {
    var len = args.length,
        arr = new Array(len), i;

    for (i = 0; i < len; i += 1) {
        arr[i] = args[i];
    }

    return arr;
}

// creationix's fast Queue
var Queue = function() {
  this.tail = [];
  this.head = to_array(arguments);
  this.offset = 0;
  // Lock the object down
  Object.seal(this);
}

Queue.prototype = {
  shift: function shift() {
    if (this.offset === this.head.length) {
      var tmp = this.head;
      tmp.length = 0;
      this.head = this.tail;
      this.tail = tmp;
      this.offset = 0;
      if (this.head.length === 0) return;
    }
    return this.head[this.offset++];
  },
  push: function push(item) {
    return this.tail.push(item);
  },
  get length() {
    return this.head.length - this.offset + this.tail.length;
  }
}

var Raw = exports.Raw = function(dirname) {
  if (!(this instanceof Raw)) return new Raw(dirname)

  EventEmitter.call(this)
  
  var self = this
  this.dirname = dirname
  this.ready = false
  
  path.exists(this.dirname, function(exists) {
    if (!exists) {
      self.__createDir(self.dirname)
    } else {
      self.ready = true
    }
  })

  this.maxOpenFiles = 30
  this.__openFiles = 0

  this.__queue__ = new Queue()
  this.__queued = false

  this.on('queue', function() {
    if (!self.__queued) {
      self.__queued = true
      self.__flush()
    }
  })
}

util.inherits(Raw, EventEmitter)
Raw.Raw = Raw
module.exports = Raw

Raw.prototype.__createDir = function(dir) {
  var self = this

  fs.mkdirSync(dir, 0755)
  self.ready = true
}

Raw.prototype.__queue = function(a, b) {
  this.__queue__.push([a, b])
  
  this.emit('queue')
}

Raw.prototype.__flush = function() {
  var oper

  if (this.__queue__.length) {
    if (this.ready && this.__openFiles < this.maxOpenFiles) {
      oper = this.__queue__.shift()
      this[oper[0]].apply(this, oper[1])
    }

    var self = this
    
    process.nextTick(function() {
      self.__flush()
    })
  } else {
    this.__queued = false
  }
}

Raw.prototype.__unique = function(cb) {
  var self = this
    , buf = []
    , chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz2346789'
    , charlen = chars.length

  ;(function next() {
    buf.push(chars[Math.floor(Math.random() * charlen)])
    var filename = buf.join('')
    path.exists(self.dirname + '/' + filename, function(exists) {
      if (exists) return next()
      cb && cb(filename)
    })
  }())
}

// COMMANDS

Raw.prototype._set = function(val, cb) {
  var self = this

  this.__unique(function(filename) {
    if (typeof val != 'string') val = val.toString()
    fs.writeFile(self.dirname + '/' + filename, val, 'utf8', function(err) {
      cb && cb(err, filename)
    })
  })
}

Raw.prototype._get = function(filename, cb) {
  fs.readFile(this.dirname + '/' + filename, function(err, data) {
    cb && cb(err, data)
  })
}

// Wrapper

;[ 'set', 'get' ].forEach(function(command) {
  Raw.prototype[command] = function() {
    this.__queue('_' + command, to_array(arguments))
  }
})
